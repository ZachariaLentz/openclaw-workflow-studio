function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getIncoming(workflow, nodeId) {
  return workflow.edges.filter((edge) => edge.to === nodeId)
}

function depsSatisfied(state, workflow, nodeId) {
  const incoming = getIncoming(workflow, nodeId)
  if (incoming.length === 0) return true
  return incoming.every((edge) => state.nodeStatus[edge.from] === 'completed')
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

function toDownloadUrl({ fileName, content, contentType }) {
  const blob = new Blob([content], { type: contentType || 'text/plain' })
  return URL.createObjectURL(blob)
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

async function executeNode(node, context) {
  await delay(250)

  switch (node.type) {
    case 'trigger':
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
    case 'tool': {
      if (node.toolId === 'ai.structured_prompt') {
        return executeStructuredPrompt(node, context)
      }

      if (node.toolId === 'ai.prompt' || node.toolId === 'ai.prompt.edit') {
        return executePrompt(node, context)
      }

      return {
        message: `Tool simulated: ${node.toolId ?? 'unknown-tool'}`,
        output: {
          toolId: node.toolId,
          status: 'ok',
          result: node.config?.mockResult ?? `${node.label} finished`,
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

      return {
        message: 'Output node completed',
        output: {
          result: context.lastOutput ?? {},
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
      const incoming = getIncoming(workflow, node.id)
      const lastParent = incoming[incoming.length - 1]?.from
      const lastOutput = lastParent ? state.nodeOutputs[lastParent] : undefined

      state.nodeStatus[node.id] = 'running'
      const started = { type: 'node-start', nodeId: node.id, label: node.label }
      state.events.push(started)
      onEvent?.(structuredClone(state), started)

      try {
        const result = await executeNode(node, {
          state,
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
