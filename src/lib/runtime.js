function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getIncoming(workflow, nodeId) {
  return workflow.edges.filter((edge) => edge.to === nodeId)
}

function getOutgoing(workflow, nodeId) {
  return workflow.edges.filter((edge) => edge.from === nodeId)
}

function depsSatisfied(state, workflow, nodeId) {
  const incoming = getIncoming(workflow, nodeId)
  if (incoming.length === 0) return true
  return incoming.every((edge) => state.nodeStatus[edge.from] === 'completed')
}

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', 'yes', '1'].includes(value.toLowerCase())
  return Boolean(value)
}

function inferStoryTitle(idea) {
  return idea?.title || 'The Little Lantern in the Woods'
}

async function executeNode(node, context) {
  await delay(250)

  switch (node.type) {
    case 'trigger':
      return {
        message: 'Manual trigger started the workflow',
        output: {
          started: true,
          triggerMode: node.config?.triggerMode ?? 'manual',
          triggerLabel: node.config?.triggerLabel ?? 'Start',
        },
      }
    case 'input':
      return { message: 'Input loaded', output: node.config?.seedData ?? {} }
    case 'transform':
      return {
        message: 'Transform completed',
        output: {
          ...context.lastOutput,
          transformedBy: node.id,
          summary: node.config?.summary ?? 'Structured content package prepared.',
        },
      }
    case 'tool': {
      if (node.toolId === 'openclaw.story_idea') {
        if (context.liveExecutors?.generateStoryIdea) {
          try {
            const storyIdea = await context.liveExecutors.generateStoryIdea({
              audience: node.config?.audience,
              theme: node.config?.theme,
            })
            return {
              message: 'OpenClaw created a live story idea',
              output: {
                ...storyIdea,
                live: true,
              },
            }
          } catch (error) {
            return {
              message: `Live story idea failed, using fallback: ${error.message}`,
              output: {
                title: 'Milo and the Moonlight Kite',
                mainCharacter: 'Milo, a curious young fox',
                setting: 'a breezy meadow at the edge of a moonlit forest',
                conflict: 'Milo is afraid his handmade kite will never fly high enough to reach the stars',
                lesson: 'Patience and courage help small efforts become something beautiful',
                premise: 'A young fox builds a kite and learns that steady practice matters more than instant success.',
                live: false,
                fallback: true,
              },
            }
          }
        }

        return {
          message: 'OpenClaw created a story idea',
          output: {
            title: 'Milo and the Moonlight Kite',
            mainCharacter: 'Milo, a curious young fox',
            setting: 'a breezy meadow at the edge of a moonlit forest',
            conflict: 'Milo is afraid his handmade kite will never fly high enough to reach the stars',
            lesson: 'Patience and courage help small efforts become something beautiful',
            premise: 'A young fox builds a kite and learns that steady practice matters more than instant success.',
            live: false,
          },
        }
      }

      if (node.toolId === 'openclaw.write_story') {
        const idea = context.lastOutput ?? {}
        const title = inferStoryTitle(idea)
        return {
          message: 'OpenClaw wrote the story draft',
          output: {
            title,
            storyText: `${title}\n\nMilo was a young fox who loved the sky. Every evening he watched the first stars sparkle above the meadow and wondered what it might feel like to send something of his all the way up to greet them.\n\nOne cool evening, Milo tied together twigs, soft cloth, and a long ribbon of blue string. “This will be my moonlight kite,” he whispered. But when he ran across the meadow, the kite only bumped and skipped over the grass. It did not rise at all.\n\nMilo tried again the next day. And the next. Sometimes the kite lifted for only a moment before tumbling down. Sometimes the wind spun it sideways. Sometimes Milo felt like giving up.\n\nBut each time, Milo changed one small thing. He made the tail a little longer. He held the string a little higher. He waited more carefully for the breeze.\n\nAt last, on a silver-blue evening, the wind caught the kite just right. Up it soared over the meadow, over the flowers, and high toward the first shining star. Milo laughed and ran and felt his heart rise with it.\n\nThe kite did not touch the stars. It did something better. It showed Milo what patient practice could do. And as the ribbon danced in the moonlight, Milo smiled and said, “That is high enough for tonight.”`,
          },
        }
      }

      if (node.toolId === 'openclaw.edit_story') {
        const draft = context.lastOutput ?? {}
        return {
          message: 'OpenClaw edited the story draft',
          output: {
            title: draft.title ?? 'The Little Lantern in the Woods',
            editedText: `${draft.storyText ?? ''}\n\nEdited for smoother read-aloud pacing, gentler transitions, and a warmer closing beat.`,
            notes: 'Trimmed repetition, improved rhythm, and preserved the core lesson.',
          },
        }
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
    case 'agent':
      return {
        message: 'Agent step completed',
        output: {
          agentPrompt: node.prompt ?? '',
          result: node.config?.mockResult ?? `${node.label} generated draft output`,
        },
      }
    case 'branch': {
      const branchValue = node.config?.branchOn ?? context.lastOutput?.approved ?? true
      return {
        message: `Branch chose ${coerceBoolean(branchValue) ? 'true' : 'false'} path`,
        output: { branch: coerceBoolean(branchValue) },
      }
    }
    case 'approval':
      return {
        message: 'Approval auto-granted in MVP runtime',
        output: { approved: true },
      }
    case 'output': {
      const previous = context.lastOutput ?? {}
      return {
        message: 'Final story prepared for Google Drive export',
        output: {
          final: true,
          destination: node.config?.destination ?? 'workspace',
          fileName: node.config?.fileNameTemplate?.replace('{{title}}', previous.title ?? 'story') ?? 'story.txt',
          result: previous,
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

      pending.delete(node.id)

      if (node.type === 'branch') {
        const branch = coerceBoolean(result.output?.branch)
        const outgoing = getOutgoing(workflow, node.id)
        for (const edge of outgoing) {
          if (!edge.condition) continue
          const wantsTrue = edge.condition === 'true'
          const wantsFalse = edge.condition === 'false'
          if ((wantsTrue && !branch) || (wantsFalse && branch)) {
            state.nodeStatus[edge.to] = 'skipped'
            pending.delete(edge.to)
            const skipped = { type: 'node-skipped', nodeId: edge.to, because: `Branch ${branch} bypassed ${edge.condition} edge.` }
            state.events.push(skipped)
            onEvent?.(structuredClone(state), skipped)
          }
        }
      }
    }
  }

  state.status = 'completed'
  const done = { type: 'done', message: 'Workflow run completed.' }
  state.events.push(done)
  onEvent?.(structuredClone(state), done)
  return state
}
