import { getNodeDefinition } from './registry.js'

export function getNodeOrganizerState(toolId) {
  const definition = getNodeDefinition(toolId)
  if (!definition) return null

  return {
    maturity: definition.maturity || 'draft',
    organizer: {
      ready: Boolean(definition.organizer?.ready),
      visibility: definition.organizer?.visibility || 'hidden',
      reason: definition.organizer?.reason || '',
    },
    authoring: {
      allowed: Boolean(definition.organizer?.ready) && definition.organizer?.visibility === 'live' && definition.maturity !== 'scaffold',
      reason: definition.maturity === 'scaffold'
        ? 'Scaffold nodes are not authorable until they are promoted.'
        : 'Node is eligible for reusable workflow authoring.',
    },
  }
}

export function buildNodeContractSummary(toolId) {
  const definition = getNodeDefinition(toolId)
  if (!definition) return null

  const organizerState = getNodeOrganizerState(toolId)

  return {
    toolId: definition.toolId,
    title: definition.title,
    description: definition.description || '',
    nodeType: definition.nodeType,
    toolKind: definition.toolKind,
    defaultLabel: definition.defaultLabel || definition.title,
    defaultConfig: structuredClone(definition.defaultConfig || {}),
    editorFields: structuredClone(definition.editorFields || []),
    inputSchema: structuredClone(definition.inputSchema || {}),
    outputSchema: structuredClone(definition.outputSchema || {}),
    sideEffectLevel: definition.sideEffectLevel || 'read',
    maturity: organizerState?.maturity || 'draft',
    organizer: organizerState?.organizer || { ready: false, visibility: 'hidden', reason: '' },
    authoring: organizerState?.authoring || { allowed: false, reason: 'Missing organizer metadata.' },
  }
}
