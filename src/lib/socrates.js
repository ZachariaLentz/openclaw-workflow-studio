import { resolveBridgeUrl } from './bridge'
import { buildClarificationPlan } from './nodes/clarificationPolicy'
import { listAuthorableNodeDefinitions } from './nodes/registry'

function parseSocratesPayload(payload) {
  if (!payload?.ok) {
    throw new Error(payload?.error?.message || 'Socrates request failed.')
  }

  return {
    ok: true,
    reply: payload.reply || '',
    change: payload.change || { type: 'none' },
    raw: payload.raw || '',
    source: payload.source || 'unknown',
    session: payload.session || 'unknown',
  }
}

function inferWorkflowMode(workflow = {}) {
  if (workflow.metadata?.draft) return 'new_draft'
  if ((workflow.tags || []).some((tag) => String(tag).toLowerCase() === 'draft')) return 'new_draft'
  return 'saved_workflow'
}

function getNodeById(workflow, nodeId) {
  return (workflow.nodes || []).find((node) => node.id === nodeId) || null
}

function buildNodeSummary(node, workflow) {
  const incoming = (workflow.edges || []).filter((edge) => edge.to === node.id).map((edge) => edge.from)
  const outgoing = (workflow.edges || []).filter((edge) => edge.from === node.id).map((edge) => edge.to)

  return {
    id: node.id,
    type: node.type,
    label: node.label,
    toolId: node.toolId || null,
    description: node.description || '',
    prompt: node.prompt || '',
    triggerLabel: node.config?.triggerLabel || null,
    inputsFrom: incoming,
    outputsTo: outgoing,
  }
}

function buildWorkflowContext(workflow, options = {}) {
  const mode = inferWorkflowMode(workflow)
  const entryNode = getNodeById(workflow, workflow.entryNodeId) || (workflow.nodes || []).find((node) => node.type === 'trigger') || null
  const activeWorkflowId = options.activeWorkflowId || workflow.id
  const libraryWorkflows = Array.isArray(options.libraryWorkflows) ? options.libraryWorkflows : []
  const activeLibraryWorkflow = libraryWorkflows.find((item) => item.id === activeWorkflowId) || null
  const currentLibraryIndex = libraryWorkflows.findIndex((item) => item.id === activeWorkflowId)
  const keyNodes = (workflow.nodes || []).slice(0, 8).map((node) => buildNodeSummary(node, workflow))

  return {
    activeWorkflow: {
      id: workflow.id,
      name: workflow.name,
      appId: workflow.appId,
      version: workflow.version,
      description: workflow.description || '',
      mode,
      isActiveSelection: workflow.id === activeWorkflowId,
      selectedFromLibrary: Boolean(activeLibraryWorkflow),
      libraryIndex: currentLibraryIndex,
    },
    editingIntent: mode === 'new_draft' ? 'starting_or_shaping_a_new_draft' : 'editing_an_existing_saved_workflow',
    trigger: entryNode
      ? {
          id: entryNode.id,
          label: entryNode.label,
          type: entryNode.type,
          triggerLabel: entryNode.config?.triggerLabel || null,
          description: entryNode.description || '',
        }
      : null,
    keyNodes,
    edgeCount: (workflow.edges || []).length,
    nodeCount: (workflow.nodes || []).length,
    availableWorkflowNames: libraryWorkflows.slice(0, 12).map((item) => ({
      id: item.id,
      name: item.name,
      active: item.id === activeWorkflowId,
    })),
  }
}

export function buildSocratesPrompt(userMessage, workflow, options = {}) {
  const context = buildWorkflowContext(workflow, options)
  const authorableNodes = listAuthorableNodeDefinitions().map((definition) => ({
    toolId: definition.toolId,
    title: definition.title,
    nodeType: definition.nodeType,
  }))

  return [
    'You are editing the currently active workflow in OpenClaw Workflow Studio.',
    'Ground every suggestion and patch in that exact active workflow rather than giving generic workflow advice.',
    'If the request is ambiguous, resolve it using the active workflow identity, trigger, node graph, and saved-vs-draft status below.',
    'Prefer small deterministic patches when possible. Preserve workflow id unless the user explicitly asks to replace the whole workflow.',
    'When editing an existing saved workflow, keep the workflow grounded in its current purpose. When shaping a new draft, turn it into a coherent workflow instead of returning abstract guidance.',
    'Return only concrete authoring intent for this active workflow.',
    'Prefer composing workflows from existing organizer-approved reusable nodes before creating a new node.',
    'Only propose a new reusable node when the workflow cannot be represented honestly with the current allowed catalog.',
    'Only propose a new node archetype/type when an existing archetype would distort the requested behavior.',
    'Only use supported reusable node toolIds from the allowed catalog below. Do not invent toolIds, config keys, or bespoke node types.',
    '',
    'ACTIVE WORKFLOW CONTEXT',
    JSON.stringify(context, null, 2),
    '',
    'ALLOWED AUTHORABLE NODES',
    JSON.stringify(authorableNodes, null, 2),
    '',
    'CURRENT WORKFLOW JSON',
    JSON.stringify(workflow, null, 2),
    '',
    'USER REQUEST',
    String(userMessage || '').trim() || 'Help shape this workflow.',
  ].join('\n')
}

export function buildSocratesRequest(message, workflow, options = {}) {
  return {
    protocolVersion: 2,
    userMessage: message,
    message: buildSocratesPrompt(message, workflow, options),
    workflow,
    workflowContext: buildWorkflowContext(workflow, options),
    nodeClarificationPlan: buildClarificationPlan(message),
  }
}

export async function sendToSocrates(message, workflow, options = {}) {
  const response = await fetch(`${resolveBridgeUrl()}/api/socrates-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildSocratesRequest(message, workflow, options)),
  })

  if (!response.ok) {
    throw new Error(`Socrates request failed: ${response.status}`)
  }

  return parseSocratesPayload(await response.json())
}
