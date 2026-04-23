export function getIncoming(workflow, nodeId) {
  return workflow.edges.filter((edge) => edge.to === nodeId)
}

export function getNodeById(workflow, nodeId) {
  return workflow.nodes.find((node) => node.id === nodeId)
}

export function depsSatisfied(state, workflow, nodeId) {
  const incoming = getIncoming(workflow, nodeId)
  if (incoming.length === 0) return true
  return incoming.every((edge) => state.nodeStatus[edge.from] === 'completed' || state.nodeStatus[edge.from] === 'skipped')
}

export function shouldSkipNode(node, state, workflow) {
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

export function getUsableParentOutput(state, workflow, nodeId) {
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

export function collectIncomingOutputs(state, workflow, nodeId) {
  const incoming = getIncoming(workflow, nodeId)
  return incoming.map((edge) => ({
    from: edge.from,
    output: state.nodeOutputs[edge.from],
    status: state.nodeStatus[edge.from],
  }))
}
