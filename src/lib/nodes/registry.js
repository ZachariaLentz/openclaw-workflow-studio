import { nodeDefinitions } from './definitions.js'

export function getNodeDefinition(toolId) {
  return nodeDefinitions[toolId] || null
}

export function listNodeDefinitions() {
  return Object.values(nodeDefinitions)
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
