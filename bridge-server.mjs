import http from 'node:http'
import https from 'node:https'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'

const execFileAsync = promisify(execFile)
const PORT = Number(process.env.OCWS_BRIDGE_PORT || 4318)
const HOST = process.env.OCWS_BRIDGE_HOST || '127.0.0.1'
const ALLOW_ORIGIN = process.env.OCWS_ALLOW_ORIGIN || '*'
const LOCAL_DIR = path.join(process.cwd(), '.local')
const OAUTH_DIR = path.join(LOCAL_DIR, 'oauth')
const GOOGLE_OAUTH_CONFIG_PATH = process.env.OCWS_GOOGLE_OAUTH_CONFIG || path.join(OAUTH_DIR, 'google-client.json')
const GOOGLE_TOKENS_PATH = process.env.OCWS_GOOGLE_TOKENS_PATH || path.join(OAUTH_DIR, 'google-tokens.json')
const PUBLIC_BASE_URL = process.env.OCWS_PUBLIC_BASE_URL || `http://${HOST}:${PORT}`
const GOOGLE_REDIRECT_URI = process.env.OCWS_GOOGLE_REDIRECT_URI || `${PUBLIC_BASE_URL.replace(/\/$/, '')}/oauth/google/callback`
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive.file openid email profile'
const oauthConnections = new Map()
const WORKFLOW_SCHEDULES_PATH = path.join(LOCAL_DIR, 'workflow-schedules.json')


const PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    description: 'Connect Google services like Drive.',
    authType: 'oauth',
    capabilities: ['drive'],
    status: 'available',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Connect an OpenAI account for future AI nodes.',
    authType: 'api_key',
    capabilities: ['responses'],
    status: 'coming_soon',
  },
  {
    id: 'openclaw-local',
    label: 'OpenClaw Local',
    description: 'Local bridge/runtime status for this machine.',
    authType: 'local',
    capabilities: ['local-runtime'],
    status: 'available',
  },
]

async function runOpenClaw(args) {
  const { stdout, stderr } = await execFileAsync('openclaw', args, {
    cwd: process.cwd(),
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  })

  return {
    ok: true,
    stdout: stdout?.trim() ?? '',
    stderr: stderr?.trim() ?? '',
  }
}

async function runDaedalus(prompt, timeoutSeconds = 30) {
  const { stdout } = await execFileAsync(
    'openclaw',
    [
      'agent',
      '--agent',
      'daedalus',
      '--message',
      prompt,
      '--timeout',
      String(timeoutSeconds),
    ],
    {
      cwd: process.cwd(),
      timeout: Math.max(40000, (timeoutSeconds + 10) * 1000),
      maxBuffer: 4 * 1024 * 1024,
    },
  )

  return stdout?.trim() ?? ''
}

async function generateStoryIdeaViaAgent(prompt) {
  return runDaedalus(prompt, 30)
}

async function writeStoryViaAgent(storyIdea, promptOverride) {
  const prompt = [
    promptOverride || 'Write one complete children\'s story from the story idea below.',
    'Return plain JSON with exactly these keys: title, storyText.',
    'Keep it warm, simple, imaginative, and suitable for reading aloud.',
    'Aim for roughly 600-900 words.',
    'Story idea JSON:',
    JSON.stringify(storyIdea),
  ].join('\n\n')

  const raw = await runDaedalus(prompt, 90)

  try {
    return {
      raw,
      parsed: JSON.parse(raw),
    }
  } catch {
    return {
      raw,
      parsed: {
        title: storyIdea?.title || 'A New Story',
        storyText: raw,
      },
    }
  }
}

async function parseJsonStdout(command, args) {
  const { stdout } = await execFileAsync(command, args, {
    cwd: process.cwd(),
    timeout: 30000,
    maxBuffer: 4 * 1024 * 1024,
  })

  return JSON.parse(stdout)
}

async function ensureLocalDirs() {
  await fs.mkdir(OAUTH_DIR, { recursive: true })
}

async function readJsonFileIfExists(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback
    throw error
  }
}

async function writeJsonFile(filePath, value) {
  await ensureLocalDirs()
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8')
}

async function loadGoogleOAuthConfig() {
  return readJsonFileIfExists(GOOGLE_OAUTH_CONFIG_PATH, null)
}

async function loadGoogleTokens() {
  return readJsonFileIfExists(GOOGLE_TOKENS_PATH, { accounts: [] })
}

async function saveGoogleTokens(tokens) {
  await writeJsonFile(GOOGLE_TOKENS_PATH, tokens)
}

async function loadWorkflowSchedules() {
  return readJsonFileIfExists(WORKFLOW_SCHEDULES_PATH, { schedules: [] })
}

async function saveWorkflowSchedules(value) {
  await writeJsonFile(WORKFLOW_SCHEDULES_PATH, value)
}

function buildScheduleSummary(config = {}) {
  if (config.scheduleSummary) return String(config.scheduleSummary)
  if (config.scheduleMode === 'once' && config.runAt) return `Once at ${config.runAt}`
  if (config.scheduleMode === 'every' && config.every) return `Every ${config.every}`
  if (config.scheduleMode === 'cron' && config.cronExpression) return `Cron ${config.cronExpression}`
  return 'Scheduled workflow trigger'
}

function buildWorkflowSchedulePayload(schedule) {
  const action = {
    type: 'workflow.schedule.trigger',
    workflowId: schedule.workflowId,
    nodeId: schedule.nodeId,
    scheduleId: schedule.id,
    triggerMode: 'schedule',
    scheduleMode: schedule.scheduleMode,
    timezone: schedule.timezone,
  }

  if (schedule.cronExpression) action.cronExpression = schedule.cronExpression
  if (schedule.every) action.every = schedule.every
  if (schedule.runAt) action.runAt = schedule.runAt

  const message = [
    'Reminder: this is a Workflow Studio schedule trigger.',
    JSON.stringify(action),
  ].join('\n')

  return {
    action,
    message,
  }
}

function shouldPassTimezone(schedule = {}) {
  if (schedule.scheduleMode === 'cron') return Boolean(schedule.timezone)
  if (schedule.scheduleMode === 'once') {
    return Boolean(schedule.timezone && schedule.runAt && !/[zZ]|[+-]\d\d(?::?\d\d)?$/.test(schedule.runAt))
  }
  return false
}

function buildCronArgsFromSchedule(schedule) {
  const args = ['cron', 'add', '--json', '--name', schedule.name]

  if (schedule.scheduleMode === 'once') {
    args.push('--at', schedule.runAt)
  } else if (schedule.scheduleMode === 'every') {
    args.push('--every', schedule.every)
  } else if (schedule.scheduleMode === 'cron') {
    args.push('--cron', schedule.cronExpression)
  } else {
    throw new Error(`Unsupported schedule mode: ${schedule.scheduleMode}`)
  }

  if (shouldPassTimezone(schedule)) args.push('--tz', schedule.timezone)
  if (schedule.sessionTarget) args.push('--session', schedule.sessionTarget)
  if (schedule.sessionKey) args.push('--session-key', schedule.sessionKey)

  const payload = buildWorkflowSchedulePayload(schedule)
  if (schedule.sessionTarget === 'main') args.push('--system-event', payload.message)
  else args.push('--message', payload.message)

  if (schedule.deliver === false) args.push('--no-deliver')
  else args.push('--announce')
  if (schedule.enabled === false) args.push('--disabled')
  args.push('--wake', schedule.wakeMode || 'now')

  return args
}

function buildCronEditArgs(jobId, patch = {}) {
  const args = ['cron', 'edit', jobId]
  if (patch.name) args.push('--name', patch.name)
  if (patch.scheduleMode === 'once' && patch.runAt) args.push('--at', patch.runAt)
  if (patch.scheduleMode === 'every' && patch.every) args.push('--every', patch.every)
  if (patch.scheduleMode === 'cron' && patch.cronExpression) args.push('--cron', patch.cronExpression)
  if (shouldPassTimezone(patch)) args.push('--tz', patch.timezone)
  if (patch.sessionTarget) args.push('--session', patch.sessionTarget)
  if (patch.sessionKey) args.push('--session-key', patch.sessionKey)

  const payload = buildWorkflowSchedulePayload(patch)
  if (patch.sessionTarget === 'main') args.push('--system-event', payload.message)
  else args.push('--message', payload.message)

  if (patch.deliver === false) args.push('--no-deliver')
  else args.push('--announce')
  if (patch.enabled === true) args.push('--enable')
  if (patch.enabled === false) args.push('--disable')
  return args
}

function extractCronJobIdFromJson(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed.jobId || parsed.id || parsed.job?.jobId || parsed.job?.id || parsed.jobs?.[0]?.id || null
  } catch {
    return null
  }
}

function normalizeStoredSchedule(schedule) {
  const payload = schedule.binding?.payload || buildWorkflowSchedulePayload(schedule)

  const normalizedBase = {
    id: schedule.id,
    workflowId: schedule.workflowId,
    nodeId: schedule.nodeId,
    name: schedule.name,
    scheduleMode: schedule.scheduleMode,
    cronExpression: schedule.cronExpression || null,
    every: schedule.every || null,
    runAt: schedule.runAt || null,
    timezone: schedule.timezone || 'UTC',
    enabled: schedule.enabled !== false,
    deliver: schedule.deliver !== false,
    wakeMode: schedule.wakeMode || 'now',
    sessionTarget: schedule.sessionTarget || 'isolated',
    sessionKey: schedule.sessionKey || null,
  }

  return {
    ...normalizedBase,
    message: payload.message,
    scheduleSummary: buildScheduleSummary(normalizedBase),
    cronJobId: schedule.cronJobId || null,
    cronRaw: schedule.cronRaw || null,
    binding: {
      payload,
      lastVerifiedAt: schedule.binding?.lastVerifiedAt || null,
    },
    createdAt: schedule.createdAt || new Date().toISOString(),
    updatedAt: schedule.updatedAt || new Date().toISOString(),
  }
}

async function upsertWorkflowScheduleRecord(nextSchedule) {
  const store = await loadWorkflowSchedules()
  const schedules = Array.isArray(store.schedules) ? store.schedules : []
  const normalized = normalizeStoredSchedule(nextSchedule)
  const index = schedules.findIndex((item) => item.id === normalized.id)
  const next = index >= 0
    ? schedules.map((item, idx) => idx === index ? { ...item, ...normalized } : item)
    : [normalized, ...schedules]
  await saveWorkflowSchedules({ schedules: next })
  return normalized
}

async function removeWorkflowScheduleRecord(scheduleId) {
  const store = await loadWorkflowSchedules()
  const schedules = Array.isArray(store.schedules) ? store.schedules : []
  await saveWorkflowSchedules({ schedules: schedules.filter((item) => item.id !== scheduleId) })
}

async function findWorkflowScheduleRecord(scheduleId) {
  const store = await loadWorkflowSchedules()
  const schedules = Array.isArray(store.schedules) ? store.schedules : []
  return schedules.find((item) => item.id === scheduleId) || null
}

function googleClientConfigValid(config) {
  return Boolean(config?.clientId && config?.clientSecret)
}

function makeGoogleAccountRecord(account) {
  const email = account.email || 'google-account'
  return {
    id: `acct_google_${slugifyAccountId(email)}`,
    provider: 'google',
    label: account.label || email,
    status: 'connected',
    identity: {
      email,
      displayName: account.displayName || email,
    },
    capabilities: ['drive'],
    scopes: account.scopes || ['drive.file'],
    lastVerifiedAt: account.lastVerifiedAt || null,
    metadata: { authType: 'oauth', source: 'native-oauth' },
    accountRef: email,
  }
}

function buildGoogleAuthUrl({ clientId, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPE,
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

function httpsRequestJson(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, options, (response) => {
      let data = ''
      response.on('data', (chunk) => { data += chunk })
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}')
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(parsed.error_description || parsed.error || `HTTP ${response.statusCode}`))
            return
          }
          resolve(parsed)
        } catch (error) {
          reject(error)
        }
      })
    })
    request.on('error', reject)
    if (body) request.write(body)
    request.end()
  })
}

function slugifyAccountId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

async function listGoogleAccounts() {
  const tokenStore = await loadGoogleTokens()
  const storedAccounts = Array.isArray(tokenStore?.accounts) ? tokenStore.accounts.map(makeGoogleAccountRecord) : []
  if (storedAccounts.length > 0) return storedAccounts

  try {
    const output = await execFileAsync('gog', ['auth', 'list'], {
      cwd: process.cwd(),
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    })

    const text = `${output.stdout || ''}
${output.stderr || ''}`.trim()
    if (!text || /No tokens stored/i.test(text)) return []

    const emails = new Set()
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
      if (match) emails.add(match[0].toLowerCase())
    }

    return [...emails].map((email) => ({
      id: `acct_google_${slugifyAccountId(email)}`,
      provider: 'google',
      label: email,
      status: 'connected',
      identity: {
        email,
        displayName: email,
      },
      capabilities: ['drive'],
      scopes: ['drive'],
      lastVerifiedAt: null,
      metadata: { authType: 'oauth', source: 'gog' },
      accountRef: email,
    }))
  } catch (error) {
    if (/No tokens stored/i.test(error?.message || '')) return []
    return []
  }
}

async function listAccounts() {
  const googleAccounts = await listGoogleAccounts()
  return [
    {
      id: 'acct_openclaw_local_default',
      provider: 'openclaw-local',
      label: 'Local OpenClaw Runtime',
      status: 'connected',
      identity: {
        email: null,
        displayName: 'This machine',
      },
      capabilities: ['local-runtime'],
      scopes: [],
      lastVerifiedAt: new Date().toISOString(),
      metadata: { authType: 'local' },
    },
    ...googleAccounts,
  ]
}

async function findAccountById(accountId) {
  const accounts = await listAccounts()
  return accounts.find((account) => account.id === accountId) || null
}

function normalizeDriveNameSegment(segment) {
  return String(segment || '').trim().replace(/[\/]+/g, ' ').replace(/\s+/g, ' ')
}

async function ensureDriveFolderPath(destination, account) {
  const rawSegments = String(destination || '').split('/').map(normalizeDriveNameSegment).filter(Boolean)
  if (rawSegments.length === 0) return 'root'

  let parentId = 'root'

  for (const name of rawSegments) {
    const query = [
      `name = '${name.replace(/'/g, "\'")}'`,
      "mimeType = 'application/vnd.google-apps.folder'",
      `'${parentId}' in parents`,
      'trashed = false',
    ].join(' and ')

    const existing = await parseJsonStdout('gog', [
      'drive',
      'ls',
      '--json',
      '--no-input',
      '--parent',
      parentId,
      '--query',
      query,
      ...(account ? ['--account', account] : []),
    ])

    const match = Array.isArray(existing) ? existing[0] : existing?.files?.[0]
    if (match?.id) {
      parentId = match.id
      continue
    }

    const created = await parseJsonStdout('gog', [
      'drive',
      'mkdir',
      name,
      '--json',
      '--no-input',
      '--parent',
      parentId,
      ...(account ? ['--account', account] : []),
    ])

    parentId = created?.id || created?.fileId || created?.file?.id
    if (!parentId) {
      throw new Error(`Failed to create Drive folder: ${name}`)
    }
  }

  return parentId
}

async function saveFileToGoogleDrive({ fileName, content, destination, contentType, account }) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocws-drive-'))
  const tempPath = path.join(tempDir, fileName)

  try {
    await fs.writeFile(tempPath, content, 'utf8')
    const parentId = await ensureDriveFolderPath(destination, account)
    const uploaded = await parseJsonStdout('gog', [
      'drive',
      'upload',
      tempPath,
      '--json',
      '--no-input',
      '--name',
      fileName,
      '--parent',
      parentId,
      '--mime-type',
      contentType || 'text/plain',
      ...(account ? ['--account', account] : []),
    ])

    const fileId = uploaded?.id || uploaded?.fileId || uploaded?.file?.id
    if (!fileId) {
      throw new Error('Drive upload did not return a file id.')
    }

    let link = null
    try {
      const urlResult = await parseJsonStdout('gog', [
        'drive',
        'url',
        fileId,
        '--json',
        '--no-input',
        ...(account ? ['--account', account] : []),
      ])
      if (Array.isArray(urlResult)) link = urlResult[0]?.url || urlResult[0]?.webViewLink || null
      else link = urlResult?.url || urlResult?.webViewLink || null
    } catch {
      link = null
    }

    return {
      fileId,
      fileName: uploaded?.name || uploaded?.file?.name || fileName,
      destination,
      contentType: uploaded?.mimeType || uploaded?.file?.mimeType || contentType || 'text/plain',
      link,
      saved: true,
      live: true,
      writeMode: 'gog-drive-upload',
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function editStoryViaAgent(storyDraft, promptOverride) {
  const prompt = [
    promptOverride || 'Edit the children\'s story below for smoother read-aloud pacing, warmth, clarity, and gentle rhythm.',
    'Preserve the title, plot, and lesson.',
    'Return plain JSON with exactly these keys: title, editedText, notes.',
    'Keep notes short and practical.',
    'Story draft JSON:',
    JSON.stringify(storyDraft),
  ].join('\n\n')

  const raw = await runDaedalus(prompt, 90)

  try {
    return {
      raw,
      parsed: JSON.parse(raw),
    }
  } catch {
    return {
      raw,
      parsed: {
        title: storyDraft?.title || 'A New Story',
        editedText: raw,
        notes: 'Edited output returned as plain text.',
      },
    }
  }
}

function buildFileName(template, title) {
  const safeTitle = (title ?? 'story')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const baseName = safeTitle || 'story'
  return (template || '{{title}}.txt').replace('{{title}}', baseName)
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(payload, null, 2))
}

function sendError(res, status, code, message, details) {
  sendJson(res, status, {
    ok: false,
    error: {
      code,
      message,
      details: details ?? null,
    },
  })
}

function parseStatusCard(stdout) {
  const lines = stdout.split('\n').map((line) => line.trim()).filter(Boolean)
  const modelLine = lines.find((line) => line.toLowerCase().startsWith('model:'))
  const runtimeLine = lines.find((line) => line.toLowerCase().startsWith('runtime:'))
  const channelLine = lines.find((line) => line.toLowerCase().startsWith('channel:'))

  return {
    raw: stdout,
    model: modelLine ? modelLine.replace(/^model:\s*/i, '') : null,
    runtime: runtimeLine ? runtimeLine.replace(/^runtime:\s*/i, '') : null,
    channel: channelLine ? channelLine.replace(/^channel:\s*/i, '') : null,
  }
}

function extractJsonObject(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return null

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed
  const firstBrace = candidate.indexOf('{')
  if (firstBrace === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = firstBrace; index < candidate.length; index += 1) {
    const char = candidate[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return candidate.slice(firstBrace, index + 1)
      }
    }
  }

  return null
}

function normalizeSocratesChange(change) {
  if (!change || typeof change !== 'object') return { type: 'none' }
  if (!change.type) return { type: 'none' }
  if (change.type === 'replace_workflow' && change.workflow) return change
  if (change.type === 'patch_workflow' && Array.isArray(change.operations)) return change
  if (change.type === 'none') return { type: 'none' }
  return { type: 'none' }
}

function parseSocratesStructuredOutput(raw) {
  const fallback = {
    reply: String(raw || '').trim() || 'Socrates did not return structured output.',
    change: { type: 'none' },
  }

  const jsonText = extractJsonObject(raw)
  if (!jsonText) return fallback

  try {
    const parsed = JSON.parse(jsonText)
    return {
      reply: String(parsed.reply || '').trim() || fallback.reply,
      change: normalizeSocratesChange(parsed.change),
    }
  } catch {
    return fallback
  }
}

async function readJsonBody(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  return body ? JSON.parse(body) : {}
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendError(res, 400, 'bad_request', 'Missing request URL.')
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOW_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`)

  try {
    if (req.method === 'POST' && url.pathname === '/api/socrates-chat') {
      const parsedBody = await readJsonBody(req)
      const userMessage = parsedBody.userMessage || parsedBody.message || 'Help shape this workflow.'
      const workflow = parsedBody.workflow || null
      const workflowText = workflow ? JSON.stringify(workflow, null, 2) : '{}'
      const workflowContextText = parsedBody.workflowContext ? JSON.stringify(parsedBody.workflowContext, null, 2) : '{}'
      const prompt = [
        'You are Socrates, the workflow authoring agent for OpenClaw Workflow Studio.',
        'Return strict JSON only. Do not add markdown fences or any prose outside the JSON object.',
        'JSON schema:',
        JSON.stringify({
          reply: 'string',
          change: {
            type: '"none" | "replace_workflow" | "patch_workflow"',
            workflow: 'required when type=replace_workflow',
            operations: [
              {
                op: '"set" | "remove" | "upsert_node" | "remove_node" | "upsert_edge" | "remove_edge" | "upsert_tool" | "remove_tool"',
              },
            ],
          },
        }, null, 2),
        'Prefer patch_workflow for local edits and replace_workflow for broad rewrites.',
        'Any workflow you return must remain internally consistent: valid node ids, valid edge endpoints, and a real entryNodeId.',
        'Be concise in reply. The app will deterministically apply the returned change.',
        'Treat the provided workflow as the single active workflow the user is editing right now.',
        'Use the active workflow identity, saved-vs-draft status, trigger, and key nodes to disambiguate requests like "rename it", "add a step", or "fix this flow".',
        'When the active workflow is an existing saved workflow, preserve its purpose and ids unless the user explicitly requests a replacement.',
        'When the active workflow is a new draft, turn the request into a concrete workflow patch or replacement rather than generic advice.',
        'Active workflow context:',
        workflowContextText,
        'Current workflow JSON:',
        workflowText,
        'User request:',
        userMessage,
      ].join('\n\n')

      const { stdout } = await execFileAsync(
        'openclaw',
        [
          'agent',
          '--agent',
          'socrates',
          '--message',
          prompt,
          '--timeout',
          '30',
        ],
        {
          cwd: process.cwd(),
          timeout: 40000,
          maxBuffer: 1024 * 1024,
        },
      )

      const raw = stdout?.trim() ?? ''
      const structured = parseSocratesStructuredOutput(raw)

      sendJson(res, 200, {
        ok: true,
        source: 'openclaw agent --agent socrates',
        reply: structured.reply,
        change: structured.change,
        raw,
        session: 'agent:socrates:main',
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'openclaw-workflow-studio-bridge',
        version: 1,
        host: HOST,
        port: PORT,
        mode: 'narrow-local-bridge',
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      const result = await runOpenClaw(['status'])
      sendJson(res, 200, {
        ok: true,
        source: 'openclaw status',
        status: parseStatusCard(result.stdout),
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/capabilities') {
      sendJson(res, 200, {
        ok: true,
        capabilities: {
          mode: 'local-first',
          bridge: 'narrow-local-bridge',
          endpoints: [
            '/health',
            '/api/status',
            '/api/capabilities',
            '/api/accounts/providers',
            '/api/accounts',
            '/api/accounts/connect',
            '/api/accounts/google/connect',
            '/api/accounts/google/connect/:connectionId',
            '/api/accounts/:id/test',
            '/oauth/google/callback',
            '/api/story-idea',
            '/api/write-story',
            '/api/edit-story',
            '/api/google-drive/save-file',
            '/api/socrates-chat',
          ],
          writeActionsEnabled: true,
          authModel: 'localhost only; narrow write endpoints only',
          liveNodes: [
            'trigger.manual',
            'ai.structured_prompt',
            'ai.prompt',
            'integrations.google_drive.save_file',
            'outputs.download_file',
          ],
        },
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/accounts/google/connect') {
      const config = await loadGoogleOAuthConfig()
      if (!googleClientConfigValid(config)) {
        sendError(res, 400, 'google_oauth_not_configured', `Missing Google OAuth config at ${GOOGLE_OAUTH_CONFIG_PATH}.`)
        return
      }

      const connectionId = `conn_google_${crypto.randomUUID()}`
      const state = crypto.randomUUID()
      oauthConnections.set(connectionId, {
        connectionId,
        provider: 'google',
        state,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })

      sendJson(res, 200, {
        ok: true,
        status: 'pending',
        provider: 'google',
        connectionId,
        authUrl: buildGoogleAuthUrl({ clientId: config.clientId, state }),
      })
      return
    }

    const googleConnectStatusMatch = url.pathname.match(/^\/api\/accounts\/google\/connect\/([^/]+)$/)
    if (req.method === 'GET' && googleConnectStatusMatch) {
      const connectionId = decodeURIComponent(googleConnectStatusMatch[1])
      const record = oauthConnections.get(connectionId)
      if (!record) {
        sendError(res, 404, 'connection_not_found', `No connection found for ${connectionId}.`)
        return
      }

      sendJson(res, 200, {
        ok: true,
        connectionId,
        status: record.status,
        provider: 'google',
        accountId: record.accountId || null,
        error: record.error || null,
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/oauth/google/callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')
      const connection = [...oauthConnections.values()].find((item) => item.state === state)

      if (!connection) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>Google account connection failed</h1><p>Invalid or expired OAuth state.</p>')
        return
      }

      if (error) {
        connection.status = 'failed'
        connection.error = error
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>Google account connection failed</h1><p>Return to Workflow Studio and try again.</p>')
        return
      }

      try {
        const config = await loadGoogleOAuthConfig()
        if (!googleClientConfigValid(config)) throw new Error(`Missing Google OAuth config at ${GOOGLE_OAUTH_CONFIG_PATH}.`)
        if (!code) throw new Error('Missing Google OAuth code.')

        const body = new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }).toString()

        const tokenResponse = await httpsRequestJson('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
          },
        }, body)

        const profile = await httpsRequestJson('https://www.googleapis.com/oauth2/v2/userinfo', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        })

        const tokens = await loadGoogleTokens()
        const accounts = Array.isArray(tokens.accounts) ? tokens.accounts : []
        const nextAccount = {
          email: profile.email,
          displayName: profile.name || profile.email,
          label: profile.email,
          scopes: tokenResponse.scope ? tokenResponse.scope.split(' ') : ['drive.file'],
          lastVerifiedAt: new Date().toISOString(),
          tokens: {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || null,
            expiryDate: tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : null,
            tokenType: tokenResponse.token_type || 'Bearer',
          },
        }

        const filtered = accounts.filter((account) => account.email !== nextAccount.email)
        filtered.push(nextAccount)
        await saveGoogleTokens({ accounts: filtered })

        connection.status = 'connected'
        connection.accountId = `acct_google_${slugifyAccountId(profile.email)}`

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>Google account connected</h1><p>You can close this window and return to Workflow Studio.</p>')
      } catch (oauthError) {
        connection.status = 'failed'
        connection.error = oauthError?.message || String(oauthError)
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>Google account connection failed</h1><p>Return to Workflow Studio and try again.</p>')
      }
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/workflows/schedules') {
      const store = await loadWorkflowSchedules()
      sendJson(res, 200, {
        ok: true,
        schedules: Array.isArray(store.schedules) ? store.schedules : [],
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/workflows/schedules') {
      const parsedBody = await readJsonBody(req)
      const scheduleId = `schedule_${crypto.randomUUID()}`
      const schedule = normalizeStoredSchedule({
        id: scheduleId,
        workflowId: parsedBody.workflowId || 'unknown-workflow',
        nodeId: parsedBody.nodeId || 'schedule-trigger',
        name: parsedBody.name || `Workflow schedule ${scheduleId.slice(-6)}`,
        scheduleMode: parsedBody.scheduleMode || 'cron',
        cronExpression: parsedBody.cronExpression || null,
        every: parsedBody.every || null,
        runAt: parsedBody.runAt || null,
        timezone: parsedBody.timezone || 'UTC',
        enabled: parsedBody.enabled !== false,
        deliver: parsedBody.deliver !== false,
        wakeMode: parsedBody.wakeMode || 'now',
        sessionTarget: parsedBody.sessionTarget || 'isolated',
        sessionKey: parsedBody.sessionKey || null,
        message: parsedBody.message || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      try {
        const cronResult = await runOpenClaw(buildCronArgsFromSchedule(schedule))
        const cronRaw = cronResult.stdout || cronResult.stderr || ''
        const cronJobId = extractCronJobIdFromJson(cronRaw)
        const stored = await upsertWorkflowScheduleRecord({
          ...schedule,
          cronJobId,
          cronRaw,
          binding: {
            payload: buildWorkflowSchedulePayload(schedule),
            lastVerifiedAt: new Date().toISOString(),
          },
        })
        sendJson(res, 200, { ok: true, schedule: stored })
      } catch (error) {
        sendError(res, 502, 'schedule_create_failed', error?.message || String(error))
      }
      return
    }

    const workflowScheduleMatch = url.pathname.match(/^\/api\/workflows\/schedules\/([^/]+)$/)
    if (workflowScheduleMatch && req.method === 'PATCH') {
      const scheduleId = decodeURIComponent(workflowScheduleMatch[1])
      const existing = await findWorkflowScheduleRecord(scheduleId)
      if (!existing) {
        sendError(res, 404, 'schedule_not_found', `No workflow schedule found for ${scheduleId}.`)
        return
      }

      const parsedBody = await readJsonBody(req)
      const nextSchedule = normalizeStoredSchedule({
        ...existing,
        ...parsedBody,
        id: existing.id,
        updatedAt: new Date().toISOString(),
      })

      try {
        if (!existing.cronJobId) {
          sendError(res, 400, 'schedule_unbound', 'Workflow schedule does not have a bound cron job id yet.')
          return
        }

        const cronResult = await runOpenClaw(buildCronEditArgs(existing.cronJobId, nextSchedule))
        const stored = await upsertWorkflowScheduleRecord({
          ...nextSchedule,
          cronRaw: cronResult.stdout || cronResult.stderr || existing.cronRaw || null,
          binding: {
            payload: buildWorkflowSchedulePayload(nextSchedule),
            lastVerifiedAt: new Date().toISOString(),
          },
        })
        sendJson(res, 200, { ok: true, schedule: stored })
      } catch (error) {
        sendError(res, 502, 'schedule_update_failed', error?.message || String(error))
      }
      return
    }

    if (workflowScheduleMatch && req.method === 'DELETE') {
      const scheduleId = decodeURIComponent(workflowScheduleMatch[1])
      const existing = await findWorkflowScheduleRecord(scheduleId)
      if (!existing) {
        sendError(res, 404, 'schedule_not_found', `No workflow schedule found for ${scheduleId}.`)
        return
      }

      try {
        if (existing.cronJobId) {
          await runOpenClaw(['cron', 'rm', existing.cronJobId, '--json'])
        }
        await removeWorkflowScheduleRecord(scheduleId)
        sendJson(res, 200, { ok: true, removed: true, scheduleId })
      } catch (error) {
        sendError(res, 502, 'schedule_delete_failed', error?.message || String(error))
      }
      return
    }

    const workflowScheduleRunMatch = url.pathname.match(/^\/api\/workflows\/schedules\/([^/]+)\/run$/)
    if (workflowScheduleRunMatch && req.method === 'POST') {
      const scheduleId = decodeURIComponent(workflowScheduleRunMatch[1])
      const existing = await findWorkflowScheduleRecord(scheduleId)
      if (!existing) {
        sendError(res, 404, 'schedule_not_found', `No workflow schedule found for ${scheduleId}.`)
        return
      }

      if (!existing.cronJobId) {
        sendError(res, 400, 'schedule_unbound', 'Workflow schedule does not have a bound cron job id yet.')
        return
      }

      try {
        const result = await runOpenClaw(['cron', 'run', existing.cronJobId])
        const stored = await upsertWorkflowScheduleRecord({
          ...existing,
          binding: {
            ...(existing.binding || {}),
            payload: existing.binding?.payload || buildWorkflowSchedulePayload(existing),
            lastVerifiedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        })
        sendJson(res, 200, {
          ok: true,
          scheduleId,
          cronJobId: existing.cronJobId,
          raw: result.stdout || result.stderr || '',
          schedule: stored,
        })
      } catch (error) {
        sendError(res, 502, 'schedule_run_failed', error?.message || String(error))
      }
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/accounts/providers') {
      sendJson(res, 200, {
        ok: true,
        providers: PROVIDERS,
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/accounts') {
      const accounts = await listAccounts()
      sendJson(res, 200, {
        ok: true,
        accounts,
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/accounts/connect') {
      const parsedBody = await readJsonBody(req)
      const provider = parsedBody.provider

      if (provider === 'google') {
        sendJson(res, 200, {
          ok: true,
          provider,
          status: 'redirect_to_provider_flow',
          message: 'Use /api/accounts/google/connect for the standard Google OAuth flow.',
        })
        return
      }

      sendJson(res, 200, {
        ok: true,
        provider,
        status: 'not_implemented',
        message: 'This provider connect flow is not implemented yet in the bridge.',
      })
      return
    }

    const testAccountMatch = url.pathname.match(/^\/api\/accounts\/([^/]+)\/test$/)
    if (req.method === 'POST' && testAccountMatch) {
      const accountId = decodeURIComponent(testAccountMatch[1])
      const account = await findAccountById(accountId)

      if (!account) {
        sendError(res, 404, 'account_not_found', `No account found for ${accountId}.`)
        return
      }

      if (account.provider === 'google') {
        try {
          await execFileAsync('gog', ['drive', 'ls', '--json', '--no-input', '--max', '1', '--account', account.accountRef], {
            cwd: process.cwd(),
            timeout: 15000,
            maxBuffer: 1024 * 1024,
          })
          sendJson(res, 200, {
            ok: true,
            accountId,
            status: 'connected',
            testedAt: new Date().toISOString(),
          })
        } catch (error) {
          sendError(res, 502, 'account_test_failed', error?.message || String(error))
        }
        return
      }

      sendJson(res, 200, {
        ok: true,
        accountId,
        status: 'connected',
        testedAt: new Date().toISOString(),
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/story-idea') {
      const audience = url.searchParams.get('audience') || 'children ages 4-8'
      const theme = url.searchParams.get('theme') || 'friendship, courage, and wonder'
      const promptOverride = url.searchParams.get('prompt') || ''
      const prompt = [
        promptOverride || 'Come up with one strong children\'s book idea.',
        `Audience: ${audience}.`,
        `Theme: ${theme}.`,
        'Return plain JSON with exactly these keys: title, mainCharacter, setting, conflict, lesson, premise.',
        'Keep it warm, simple, imaginative, and suitable for reading aloud.',
      ].join(' ')

      const raw = await generateStoryIdeaViaAgent(prompt)
      let parsed = null

      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = {
          title: 'A New Story Idea',
          mainCharacter: 'A curious child',
          setting: 'A gentle magical place',
          conflict: 'They must overcome a small but meaningful obstacle',
          lesson: 'Kindness and courage matter',
          premise: raw,
        }
      }

      sendJson(res, 200, {
        ok: true,
        source: 'openclaw agent --agent daedalus',
        live: true,
        storyIdea: parsed,
        raw,
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/write-story') {
      const parsedBody = await readJsonBody(req)
      const storyIdea = parsedBody.storyIdea
      const promptOverride = parsedBody.prompt || ''

      if (!storyIdea || typeof storyIdea !== 'object') {
        sendError(res, 400, 'missing_story_idea', 'storyIdea JSON body is required.')
        return
      }

      const { raw, parsed } = await writeStoryViaAgent(storyIdea, promptOverride)

      sendJson(res, 200, {
        ok: true,
        source: 'openclaw agent --agent daedalus',
        live: true,
        storyDraft: parsed,
        raw,
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/edit-story') {
      const parsedBody = await readJsonBody(req)
      const storyDraft = parsedBody.storyDraft
      const promptOverride = parsedBody.prompt || ''

      if (!storyDraft || typeof storyDraft !== 'object') {
        sendError(res, 400, 'missing_story_draft', 'storyDraft JSON body is required.')
        return
      }

      const { raw, parsed } = await editStoryViaAgent(storyDraft, promptOverride)

      sendJson(res, 200, {
        ok: true,
        source: 'openclaw agent --agent daedalus',
        live: true,
        editedStory: parsed,
        raw,
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/google-drive/save-file') {
      const parsedBody = await readJsonBody(req)
      const content = parsedBody.content
      const fileName = parsedBody.fileName
      const destination = parsedBody.destination || 'Workflow Studio/Children Stories'
      const contentType = parsedBody.contentType || 'text/plain'
      const account = parsedBody.account || ''
      const accountId = parsedBody.accountId || ''

      if (!content || !fileName) {
        sendError(res, 400, 'missing_file_payload', 'content and fileName are required.')
        return
      }

      const normalizedFileName = buildFileName(fileName.includes('{{title}}') ? fileName : fileName, parsedBody.title || fileName.replace(/\.txt$/i, ''))

      try {
        let selectedAccount = account
        if (accountId && !selectedAccount) {
          const resolved = await findAccountById(accountId)
          if (!resolved) {
            sendError(res, 400, 'account_not_found', `No account found for ${accountId}.`)
            return
          }
          if (resolved.provider !== 'google') {
            sendError(res, 400, 'account_incompatible', 'Selected account is not a Google account.')
            return
          }
          selectedAccount = resolved.accountRef || ''
        }

        if (!selectedAccount) {
          sendError(res, 400, 'account_required', 'Google Drive Save File requires a connected Google account.')
          return
        }

        const file = await saveFileToGoogleDrive({
          fileName: normalizedFileName,
          content,
          destination,
          contentType,
          account: selectedAccount,
        })

        sendJson(res, 200, {
          ok: true,
          source: 'gog drive upload',
          file,
        })
      } catch (error) {
        const message = error?.message || String(error)
        const code = /No tokens stored|oauth|login|auth/i.test(message) ? 'google_drive_auth_required' : 'google_drive_save_failed'
        sendError(res, 502, code, message)
      }
      return
    }

    sendError(res, 404, 'not_found', `No route for ${url.pathname}`)
  } catch (error) {
    sendError(res, 500, 'bridge_error', 'Bridge request failed.', {
      name: error?.name ?? 'Error',
      message: error?.message ?? String(error),
    })
  }
})

const ACTIVE_PORT = Number(process.env.PORT || process.env.OCWS_BRIDGE_PORT || 4318)

server.listen(ACTIVE_PORT, HOST, () => {
  console.log(`OpenClaw Workflow Studio bridge listening on http://${HOST}:${ACTIVE_PORT}`)
})
