import { getAuthorableNodeDefinition, getDefaultNodeConfig, getNodeDefinition } from './registry'

export function createNodeFromRegistry(toolId, overrides = {}) {
  const definition = getNodeDefinition(toolId)
  if (!definition) {
    throw new Error(`Unknown node definition: ${toolId}`)
  }

  return {
    id: overrides.id || `${toolId.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')}-${Math.random().toString(36).slice(2, 8)}`,
    type: overrides.type || definition.nodeType,
    label: overrides.label || definition.defaultLabel || definition.title,
    description: overrides.description || definition.description || '',
    toolId,
    prompt: overrides.prompt,
    config: {
      ...getDefaultNodeConfig(toolId),
      ...(overrides.config || {}),
    },
    position: overrides.position || { x: 0, y: 0 },
  }
}

function inferToolId(node = {}, existingNode = null) {
  if (node.toolId) return node.toolId
  if (existingNode?.toolId) return existingNode.toolId

  const triggerMode = node.config?.triggerMode ?? existingNode?.config?.triggerMode
  if (node.type === 'trigger' || existingNode?.type === 'trigger') {
    return triggerMode === 'schedule' ? 'trigger.schedule' : 'trigger.manual'
  }

  return null
}

export function normalizeNodeForAuthoring(node, options = {}) {
  const existingNode = options.existingNode || null
  const toolId = inferToolId(node, existingNode)

  if (!toolId) {
    throw new Error(`Node ${node.id || existingNode?.id || '(unknown)'} is missing a supported toolId.`)
  }

  const definition = getAuthorableNodeDefinition(toolId)
  if (!definition) {
    throw new Error(`Tool ${toolId} is not available for reusable workflow authoring.`)
  }

  const normalizedNode = createNodeFromRegistry(toolId, {
    ...existingNode,
    ...node,
    id: node.id || existingNode?.id,
    label: node.label || existingNode?.label || definition.defaultLabel || definition.title,
    description: node.description ?? existingNode?.description ?? definition.description ?? '',
    prompt: node.prompt ?? existingNode?.prompt,
    config: {
      ...(existingNode?.config || {}),
      ...(node.config || {}),
    },
    position: node.position || existingNode?.position || { x: 0, y: 0 },
  })

  return normalizedNode
}
