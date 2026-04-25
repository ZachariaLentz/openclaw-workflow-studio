import { nodeDefinitions } from './definitions.js'
import { getNodeOrganizerState } from './contracts.js'

export function getNodeDefinition(toolId) {
  return nodeDefinitions[toolId] || null
}

export function listNodeDefinitions() {
  return Object.values(nodeDefinitions)
}

export function getAuthorableNodeDefinition(toolId) {
  const definition = getNodeDefinition(toolId)
  if (!definition) return null
  return definition.organizer?.ready && definition.organizer?.visibility === 'live' && definition.maturity !== 'scaffold'
    ? definition
    : null
}

export function listAuthorableNodeDefinitions() {
  return listNodeDefinitions().filter((definition) => getAuthorableNodeDefinition(definition.toolId))
}

export function getNodeConfigSchema(toolId) {
  return getNodeDefinition(toolId)?.configSchema || null
}

export function getNodeExecutor(toolId) {
  return getNodeDefinition(toolId)?.executor || null
}

export function getDefaultNodeConfig(toolId) {
  const config = getNodeDefinition(toolId)?.defaultConfig || {}
  return structuredClone(config)
}

export function getNodeEditorFields(toolId) {
  return getNodeDefinition(toolId)?.editorFields || []
}

export function buildToolRefFromDefinition(toolId) {
  const definition = getNodeDefinition(toolId)
  if (!definition) return null

  return {
    id: definition.toolId,
    title: definition.title,
    kind: definition.toolKind,
    description: definition.description || '',
    inputSchema: structuredClone(definition.inputSchema || {}),
    outputSchema: structuredClone(definition.outputSchema || {}),
    sideEffectLevel: definition.sideEffectLevel || 'read',
  }
}

export function listNodeOrganizerSummaries() {
  return listNodeDefinitions().map((definition) => ({
    toolId: definition.toolId,
    title: definition.title,
    nodeType: definition.nodeType,
    toolKind: definition.toolKind,
    ...getNodeOrganizerState(definition.toolId),
  }))
}
