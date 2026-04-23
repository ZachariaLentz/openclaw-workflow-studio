import { getDefaultNodeConfig, getNodeDefinition } from './registry'

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
