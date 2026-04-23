import { getNodeExecutor } from './nodes/registry'
import { depsSatisfied, getUsableParentOutput, shouldSkipNode } from './runtime/core'
import { executeNode } from './runtime/executors'
import { delay } from './runtime/helpers'

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
        await delay(250)
        const executor = getNodeExecutor(node.toolId) || executeNode
        const result = await executor(node, {
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
