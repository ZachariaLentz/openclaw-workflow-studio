import http from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const PORT = Number(process.env.OCWS_BRIDGE_PORT || 4318)
const HOST = process.env.OCWS_BRIDGE_HOST || '127.0.0.1'
const ALLOW_ORIGIN = process.env.OCWS_ALLOW_ORIGIN || '*'

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

async function generateStoryIdeaViaAgent(prompt) {
  const { stdout } = await execFileAsync(
    'openclaw',
    [
      'agent',
      '--agent',
      'daedalus',
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

  return stdout?.trim() ?? ''
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendError(res, 400, 'bad_request', 'Missing request URL.')
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': ALLOW_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`)

  try {
    if (req.method === 'POST' && url.pathname === '/api/socrates-chat') {
      let body = ''
      for await (const chunk of req) body += chunk
      const parsedBody = body ? JSON.parse(body) : {}
      const message = parsedBody.message || 'Help shape this workflow.'
      const workflowText = parsedBody.workflowText || ''
      const prompt = [
        'You are Socrates, the workflow authoring agent for OpenClaw Workflow Studio.',
        'Help the user shape or edit the workflow shown below.',
        'Be concise, concrete, and helpful.',
        'If suggesting a workflow change, describe the smallest good next change.',
        'Current workflow JSON:',
        workflowText,
        'User request:',
        message,
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

      sendJson(res, 200, {
        ok: true,
        source: 'openclaw agent --agent socrates',
        reply: stdout?.trim() ?? '',
        session: 'agent:socrates:main',
      })
      return
    }

    if (req.method !== 'GET') {
      sendError(res, 405, 'method_not_allowed', 'Only GET and the Socrates chat POST route are supported right now.')
      return
    }
    if (url.pathname === '/health') {
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

    if (url.pathname === '/api/status') {
      const result = await runOpenClaw(['status'])
      sendJson(res, 200, {
        ok: true,
        source: 'openclaw status',
        status: parseStatusCard(result.stdout),
      })
      return
    }

    if (url.pathname === '/api/capabilities') {
      sendJson(res, 200, {
        ok: true,
        capabilities: {
          mode: 'local-first',
          bridge: 'narrow-local-bridge',
          endpoints: ['/health', '/api/status', '/api/capabilities', '/api/story-idea', '/api/socrates-chat'],
          writeActionsEnabled: false,
          authModel: 'localhost only; explicit write auth deferred',
          liveNodes: ['openclaw.story_idea'],
        },
      })
      return
    }

    if (url.pathname === '/api/story-idea') {
      const audience = url.searchParams.get('audience') || 'children ages 4-8'
      const theme = url.searchParams.get('theme') || 'friendship, courage, and wonder'
      const prompt = [
        'Come up with one strong children\'s book idea.',
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

    sendError(res, 404, 'not_found', `No route for ${url.pathname}`)
  } catch (error) {
    sendError(res, 500, 'bridge_error', 'Bridge request failed.', {
      name: error?.name ?? 'Error',
      message: error?.message ?? String(error),
    })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`OpenClaw Workflow Studio bridge listening on http://${HOST}:${PORT}`)
})
