function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getIncoming(workflow, nodeId) {
  return workflow.edges.filter((edge) => edge.to === nodeId)
}

function depsSatisfied(state, workflow, nodeId) {
  const incoming = getIncoming(workflow, nodeId)
  if (incoming.length === 0) return true
  return incoming.every((edge) => state.nodeStatus[edge.from] === 'completed' || state.nodeStatus[edge.from] === 'skipped')
}

function getNodeById(workflow, nodeId) {
  return workflow.nodes.find((node) => node.id === nodeId)
}

function shouldSkipNode(node, state, workflow) {
  if (node.toolId === 'integrations.google_drive.save_file') {
    if (node.config?.accountId) return false

    const incoming = getIncoming(workflow, node.id)
    const previousNodeId = incoming[incoming.length - 1]?.from
    const previousOutput = previousNodeId ? state.nodeOutputs[previousNodeId] : null
    const hasContent = Boolean(previousOutput?.editedText ?? previousOutput?.storyText ?? previousOutput?.content)
    return hasContent
  }

  return false
}

function getUsableParentOutput(state, workflow, nodeId) {
  const incoming = getIncoming(workflow, nodeId)
  for (let index = incoming.length - 1; index >= 0; index -= 1) {
    const edge = incoming[index]
    const parentStatus = state.nodeStatus[edge.from]
    if (parentStatus === 'completed') {
      return state.nodeOutputs[edge.from]
    }
    if (parentStatus === 'skipped') {
      const parentNode = getNodeById(workflow, edge.from)
      if (!parentNode) continue
      const parentOutput = getUsableParentOutput(state, workflow, parentNode.id)
      if (parentOutput !== undefined) return parentOutput
    }
  }
  return undefined
}

function inferStoryTitle(idea) {
  return idea?.title || 'The Little Lantern in the Woods'
}

function getPromptText(node, context) {
  if (node.prompt) return node.prompt
  return context.lastOutput?.prompt || 'Complete the requested AI task.'
}

function getTimestamp() {
  return new Date().toISOString()
}

function buildFileName(template, title) {
  const safeTitle = (title ?? 'story')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const baseName = safeTitle || 'story'
  return (template || '{{title}}.txt').replace('{{title}}', baseName)
}

function toDownloadUrl({ content, contentType }) {
  const blob = new Blob([content], { type: contentType || 'text/plain' })
  return URL.createObjectURL(blob)
}

function formatScheduleSummary(config = {}) {
  if (config.scheduleSummary) return config.scheduleSummary
  if (config.scheduleMode === 'once' && config.runAt) return `Once at ${config.runAt}`
  if (config.scheduleMode === 'every' && config.everyMinutes) return `Every ${config.everyMinutes} minutes`
  if (config.scheduleMode === 'cron' && config.cronExpression) return `Cron: ${config.cronExpression}`
  return 'Scheduled trigger'
}

async function executeStructuredPrompt(node, context) {
  if (context.liveExecutors?.generateStoryIdea) {
    const storyIdea = await context.liveExecutors.generateStoryIdea({
      audience: node.config?.audience,
      theme: node.config?.theme,
      prompt: getPromptText(node, context),
      expectedSchema: node.config?.expectedSchema,
    })

    return {
      message: 'Structured prompt returned live output',
      output: {
        ...storyIdea,
        live: true,
        nodeKind: 'structured_prompt',
      },
    }
  }

  return {
    message: 'Structured prompt returned fallback output',
    output: {
      title: 'Milo and the Moonlight Kite',
      mainCharacter: 'Milo, a curious young fox',
      setting: 'a breezy meadow at the edge of a moonlit forest',
      conflict: 'Milo is afraid his handmade kite will never fly high enough to reach the stars',
      lesson: 'Patience and courage help small efforts become something beautiful',
      premise: 'A young fox builds a kite and learns that steady practice matters more than instant success.',
      live: false,
      fallback: true,
      nodeKind: 'structured_prompt',
    },
  }
}

async function executePrompt(node, context) {
  if (node.id === 'prompt-write-story') {
    const idea = context.lastOutput ?? {}
    const title = inferStoryTitle(idea)

    if (context.liveExecutors?.writeStory) {
      const storyDraft = await context.liveExecutors.writeStory(idea, { prompt: getPromptText(node, context) })
      return {
        message: 'Prompt node returned a live story draft',
        output: {
          ...storyDraft,
          live: true,
          nodeKind: 'prompt',
        },
      }
    }

    return {
      message: 'Prompt node returned fallback story draft',
      output: {
        title,
        storyText: `${title}\n\nMilo was a young fox who loved the sky. Every evening he watched the first stars sparkle above the meadow and wondered what it might feel like to send something of his all the way up to greet them.\n\nOne cool evening, Milo tied together twigs, soft cloth, and a long ribbon of blue string. “This will be my moonlight kite,” he whispered. But when he ran across the meadow, the kite only bumped and skipped over the grass. It did not rise at all.\n\nMilo tried again the next day. And the next. Sometimes the kite lifted for only a moment before tumbling down. Sometimes the wind spun it sideways. Sometimes Milo felt like giving up.\n\nBut each time, Milo changed one small thing. He made the tail a little longer. He held the string a little higher. He waited more carefully for the breeze.\n\nAt last, on a silver-blue evening, the wind caught the kite just right. Up it soared over the meadow, over the flowers, and high toward the first shining star. Milo laughed and ran and felt his heart rise with it.\n\nThe kite did not touch the stars. It did something better. It showed Milo what patient practice could do. And as the ribbon danced in the moonlight, Milo smiled and said, “That is high enough for tonight.”`,
        live: false,
        fallback: true,
        nodeKind: 'prompt',
      },
    }
  }

  const draft = context.lastOutput ?? {}

  if (context.liveExecutors?.editStory) {
    const editedStory = await context.liveExecutors.editStory(draft, { prompt: getPromptText(node, context) })
    return {
      message: 'Prompt node returned a live edited story',
      output: {
        ...editedStory,
        live: true,
        nodeKind: 'prompt',
      },
    }
  }

  return {
    message: 'Prompt node returned fallback edited story',
    output: {
      title: draft.title ?? 'The Little Lantern in the Woods',
      editedText: `${draft.storyText ?? ''}\n\nEdited for smoother read-aloud pacing, gentler transitions, and a warmer closing beat.`,
      notes: 'Trimmed repetition, improved rhythm, and preserved the core lesson.',
      live: false,
      fallback: true,
      nodeKind: 'prompt',
    },
  }
}

async function executeGoogleDriveSaveFile(node, context) {
  const previous = context.lastOutput ?? {}
  const title = previous.title ?? 'story'
  const fileName = buildFileName(node.config?.fileNameTemplate, title)
  const content = previous.editedText ?? previous.storyText ?? ''

  if (!node.config?.accountId) {
    throw new Error('Google Drive Save File requires a connected Google account.')
  }

  if (!content) {
    throw new Error('No content available to save to Google Drive.')
  }

  if (context.liveExecutors?.saveFileToGoogleDrive) {
    const file = await context.liveExecutors.saveFileToGoogleDrive({
      accountId: node.config?.accountId,
      fileName,
      content,
      destination: node.config?.destination,
      contentType: node.config?.contentType || 'text/plain',
    })

    return {
      message: 'Google Drive save completed through the live bridge',
      output: {
        ...file,
        saved: true,
        live: true,
        content,
      },
    }
  }

  return {
    message: 'Google Drive save used fallback metadata',
    output: {
      fileId: 'local-fallback-drive-file',
      fileName,
      destination: node.config?.destination || 'Workflow Studio/Children Stories',
      link: null,
      saved: false,
      live: false,
      fallback: true,
      content,
    },
  }
}

async function executeDownloadFile(node, context) {
  const previous = context.lastOutput ?? {}
  const title = previous.fileName ? previous.fileName.replace(/\.txt$/i, '') : previous.title ?? 'story'
  const content = previous.content ?? previous.editedText ?? previous.storyText ?? ''

  if (!content) {
    throw new Error('No content available to prepare for download.')
  }

  const fileName = previous.fileName || buildFileName(node.config?.fileNameTemplate, title)
  const contentType = node.config?.contentType || 'text/plain'

  return {
    message: 'Download artifact prepared in the app',
    output: {
      fileName,
      contentType,
      content,
      downloadUrl: toDownloadUrl({ fileName, content, contentType }),
      exportReady: true,
      live: true,
    },
  }
}

function collectIncomingOutputs(state, workflow, nodeId) {
  const incoming = getIncoming(workflow, nodeId)
  return incoming.map((edge) => ({
    from: edge.from,
    output: state.nodeOutputs[edge.from],
    status: state.nodeStatus[edge.from],
  }))
}

async function executeNode(node, context) {
  await delay(250)

  switch (node.type) {
    case 'trigger': {
      if (node.toolId === 'trigger.schedule') {
        return {
          message: 'Schedule trigger started the workflow',
          output: {
            started: true,
            triggeredAt: getTimestamp(),
            triggerMode: node.config?.triggerMode ?? 'schedule',
            scheduleMode: node.config?.scheduleMode ?? 'cron',
            timezone: node.config?.timezone ?? 'UTC',
            enabled: node.config?.enabled ?? true,
            scheduleSummary: formatScheduleSummary(node.config),
            cronJobId: node.config?.cronJobId ?? null,
            triggerLabel: node.config?.triggerLabel ?? 'Scheduled workflow',
          },
        }
      }

      return {
        message: 'Manual trigger started the workflow',
        output: {
          started: true,
          triggeredAt: getTimestamp(),
          initiator: node.config?.initiator || 'user',
          triggerMode: node.config?.triggerMode ?? 'manual',
          triggerLabel: node.config?.triggerLabel ?? 'Start workflow',
        },
      }
    }
    case 'input': {
      if (node.toolId === 'sources.calendar_fetch') {
        return {
          message: 'Calendar fetch placeholder produced a sample upcoming-events payload',
          output: {
            source: 'calendar',
            enabled: node.config?.enabled !== false,
            windowHours: node.config?.lookaheadHours ?? 24,
            events: [
              {
                title: 'Sample calendar event',
                startsAt: getTimestamp(),
                placeholder: true,
              },
            ],
            live: false,
            placeholder: true,
          },
        }
      }

      if (node.toolId === 'sources.weather_fetch') {
        return {
          message: 'Weather fetch placeholder produced a sample forecast payload',
          output: {
            source: 'weather',
            enabled: node.config?.enabled !== false,
            forecast: {
              summary: 'Placeholder forecast: mild weather with no severe alerts.',
              placeholder: true,
            },
            live: false,
            placeholder: true,
          },
        }
      }

      if (node.toolId === 'sources.system_status') {
        return {
          message: 'System status placeholder produced a sample operational-status payload',
          output: {
            source: 'system-status',
            enabled: node.config?.enabled !== false,
            statusItems: [
              {
                label: 'Workflow Studio runtime status placeholder',
                severity: 'info',
                placeholder: true,
              },
            ],
            live: false,
            placeholder: true,
          },
        }
      }

      return {
        message: `Input placeholder completed: ${node.toolId ?? 'unknown-input'}`,
        output: {
          toolId: node.toolId,
          status: 'ok',
          placeholder: true,
        },
      }
    }
    case 'tool': {
      if (node.toolId === 'ai.structured_prompt') {
        return executeStructuredPrompt(node, context)
      }

      if (node.toolId === 'ai.prompt' || node.toolId === 'ai.prompt.edit') {
        return executePrompt(node, context)
      }

      if (node.toolId === 'ai.brief_synthesis') {
        const priorities = context.lastOutput ?? {}
        return {
          message: 'Brief synthesis produced a mission briefing summary',
          output: {
            briefing: priorities.briefing || 'Mission briefing placeholder: schedule trigger fired and downstream synthesis is ready for real source inputs.',
            recommendedNextAction: priorities.recommendedNextAction || 'Implement real source nodes and prioritization inputs next.',
            live: false,
            fallback: true,
            nodeKind: 'brief_synthesis',
          },
        }
      }

      if (node.toolId === 'config.load_briefing') {
        const trigger = context.lastOutput ?? {}
        const configuredSources = Array.isArray(node.config?.sources) ? node.config.sources : []
        const sourceFlags = {
          calendar: configuredSources.includes('calendar'),
          weather: configuredSources.includes('weather'),
          systemStatus: configuredSources.includes('system-status'),
        }

        return {
          message: 'Briefing config loaded workflow-level settings and trigger context',
          output: {
            briefingConfig: {
              sourceFlags,
              sources: configuredSources,
              deliveryTarget: node.config?.deliveryTarget || 'telegram-dm',
              quietHours: node.config?.quietHours || null,
              briefingStyle: node.config?.briefingStyle || 'concise-operational',
              urgencyThreshold: node.config?.urgencyThreshold || 'high',
              triggerContext: {
                triggerMode: trigger.triggerMode || 'schedule',
                scheduleMode: trigger.scheduleMode || null,
                triggeredAt: trigger.triggeredAt || getTimestamp(),
                timezone: trigger.timezone || 'UTC',
                scheduleSummary: trigger.scheduleSummary || formatScheduleSummary(node.config),
                triggerLabel: trigger.triggerLabel || 'Scheduled workflow',
              },
            },
            live: false,
            placeholder: false,
          },
        }
      }

      return {
        message: `Tool placeholder completed: ${node.toolId ?? 'unknown-tool'}`,
        output: {
          toolId: node.toolId,
          status: 'ok',
          result: node.config?.mockResult ?? `${node.label} finished`,
          placeholder: true,
        },
      }
    }
    case 'transform': {
      if (node.toolId === 'data.merge_inputs') {
        const sources = collectIncomingOutputs(context.state, context.workflow, node.id)
        return {
          message: 'Merge Inputs placeholder combined upstream source payloads',
          output: {
            merged: {
              sources: sources.map((item) => ({ from: item.from, output: item.output })),
              placeholder: true,
            },
            live: false,
            placeholder: true,
          },
        }
      }

      return {
        message: `Transform placeholder completed: ${node.toolId ?? 'unknown-transform'}`,
        output: {
          toolId: node.toolId,
          status: 'ok',
          placeholder: true,
        },
      }
    }
    case 'branch': {
      if (node.toolId === 'logic.prioritize') {
        const merged = context.lastOutput?.merged || {}
        return {
          message: 'Prioritize / Classify placeholder produced sample buckets',
          output: {
            priorities: {
              urgent: [],
              today: [
                {
                  label: 'Sample prioritized item',
                  placeholder: true,
                },
              ],
              informational: merged.sources || [],
              ignore: [],
            },
            live: false,
            placeholder: true,
          },
        }
      }

      if (node.toolId === 'logic.urgency_branch') {
        const priorities = context.lastOutput?.briefing ? context.lastOutput : (context.lastOutput?.priorities || context.lastOutput || {})
        const urgentItems = Array.isArray(priorities?.urgent) ? priorities.urgent : []
        return {
          message: 'Urgency Branch placeholder evaluated the current briefing urgency route',
          output: {
            urgent: urgentItems.length > 0,
            route: urgentItems.length > 0 ? 'urgent' : 'normal',
            live: false,
            placeholder: true,
            briefing: context.lastOutput?.briefing,
            recommendedNextAction: context.lastOutput?.recommendedNextAction,
          },
        }
      }

      return {
        message: `Branch placeholder completed: ${node.toolId ?? 'unknown-branch'}`,
        output: {
          toolId: node.toolId,
          status: 'ok',
          placeholder: true,
        },
      }
    }
    case 'output': {
      if (node.toolId === 'integrations.google_drive.save_file') {
        return executeGoogleDriveSaveFile(node, context)
      }

      if (node.toolId === 'outputs.download_file') {
        return executeDownloadFile(node, context)
      }

      if (node.toolId === 'outputs.send_message') {
        return {
          message: 'Send briefing prepared a delivery result placeholder',
          output: {
            delivered: false,
            destination: node.config?.destination || 'Unconfigured destination',
            briefing: context.lastOutput?.briefing || '',
            fallback: true,
          },
        }
      }

      if (node.toolId === 'storage.persist_run_record') {
        return {
          message: 'Persist Run Record placeholder produced a sample run record',
          output: {
            stored: false,
            runRecord: {
              runId: `run-${Date.now()}`,
              stored: false,
              placeholder: true,
              briefing: context.lastOutput?.briefing || '',
              destination: context.lastOutput?.destination || null,
            },
            live: false,
            placeholder: true,
          },
        }
      }

      if (node.toolId === 'outputs.return_result') {
        return {
          message: 'Return Result placeholder prepared an in-app result summary',
          output: {
            resultSummary: {
              status: 'ready',
              placeholder: true,
              runRecord: context.lastOutput?.runRecord || context.lastOutput || {},
            },
            live: false,
            placeholder: true,
          },
        }
      }

      return {
        message: 'Output node completed',
        output: {
          result: context.lastOutput ?? {},
          placeholder: true,
        },
      }
    }
    default:
      return { message: 'Unhandled node type', output: {} }
  }
}

export async function runWorkflow(workflow, onEvent, options = {}) {
  const triggerNodeId = options.triggerNodeId ?? workflow.entryNodeId ?? workflow.nodes.find((node) => node.type === 'trigger')?.id

  const state = {
    status: 'running',
    triggerNodeId,
    nodeStatus: Object.fromEntries(workflow.nodes.map((node) => [node.id, 'pending'])),
    nodeOutputs: {},
    events: [],
  }

  const pending = new Set(workflow.nodes.map((node) => node.id))

  while (pending.size > 0) {
    const runnable = workflow.nodes.filter((node) => {
      if (!pending.has(node.id)) return false
      if (node.type === 'trigger' && node.id !== triggerNodeId) return false
      return depsSatisfied(state, workflow, node.id)
    })

    if (runnable.length === 0) {
      state.status = 'failed'
      const event = { type: 'error', message: 'Workflow deadlocked or has unsatisfied dependencies.' }
      state.events.push(event)
      onEvent?.(structuredClone(state), event)
      return state
    }

    for (const node of runnable) {
      const lastOutput = getUsableParentOutput(state, workflow, node.id)

      if (shouldSkipNode(node, state, workflow)) {
        state.nodeStatus[node.id] = 'skipped'
        const skipped = {
          type: 'node-skipped',
          nodeId: node.id,
          label: node.label,
          message: 'Skipped Google Drive save because no connected Google account is selected.',
        }
        state.events.push(skipped)
        onEvent?.(structuredClone(state), skipped)
        pending.delete(node.id)
        continue
      }

      state.nodeStatus[node.id] = 'running'
      const started = { type: 'node-start', nodeId: node.id, label: node.label }
      state.events.push(started)
      onEvent?.(structuredClone(state), started)

      try {
        const result = await executeNode(node, {
          state,
          workflow,
          lastOutput,
          liveExecutors: options.liveExecutors,
        })

        state.nodeStatus[node.id] = 'completed'
        state.nodeOutputs[node.id] = result.output
        const completed = { type: 'node-complete', nodeId: node.id, label: node.label, message: result.message }
        state.events.push(completed)
        onEvent?.(structuredClone(state), completed)
      } catch (error) {
        state.nodeStatus[node.id] = 'failed'
        const failed = {
          type: 'node-failed',
          nodeId: node.id,
          label: node.label,
          message: error?.message ?? String(error),
        }
        state.events.push(failed)
        state.status = 'failed'
        onEvent?.(structuredClone(state), failed)
        return state
      }

      pending.delete(node.id)
    }
  }

  state.status = 'completed'
  const done = { type: 'done', message: 'Workflow run completed.' }
  state.events.push(done)
  onEvent?.(structuredClone(state), done)
  return state
}
