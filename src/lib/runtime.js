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

async function executeNode(node, context) {
  await delay(250)

  switch (node.type) {
    case 'trigger':
      return { message: 'Trigger received', output: { started: true } }
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
    case 'tool':
      return {
        message: `Tool simulated: ${node.toolId ?? 'unknown-tool'}`,
        output: {
          toolId: node.toolId,
          status: 'ok',
          result: node.config?.mockResult ?? `${node.label} finished`,
        },
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
    case 'output':
      return {
        message: 'Output published to run state',
        output: {
          final: true,
          destination: node.config?.destination ?? 'workspace',
          result: context.lastOutput,
        },
      }
    default:
      return { message: 'Unhandled node type', output: {} }
  }
}

export async function runWorkflow(workflow, onEvent) {
  const state = {
    status: 'running',
    nodeStatus: Object.fromEntries(workflow.nodes.map((node) => [node.id, 'pending'])),
    nodeOutputs: {},
    events: [],
  }

  const pending = new Set(workflow.nodes.map((node) => node.id))

  while (pending.size > 0) {
    const runnable = workflow.nodes.filter((node) => pending.has(node.id) && depsSatisfied(state, workflow, node.id))

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

      const result = await executeNode(node, { state, lastOutput })

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
