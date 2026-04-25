import { buildNodeDraftFromRequest } from './drafts.js'
import { buildNodeContractSummary } from './contracts.js'

export function validateNodeDraft(request, answers = {}) {
  const draftResult = buildNodeDraftFromRequest(request, answers)
  const node = draftResult?.draft?.node || null
  const toolId = draftResult?.draft?.toolId || null
  const contract = toolId ? buildNodeContractSummary(toolId) : null

  if (!node || !toolId || !contract) {
    return {
      ok: false,
      checks: [
        { id: 'draft_exists', ok: false, message: 'No usable node draft exists yet.' },
      ],
    }
  }

  const checks = [
    { id: 'draft_exists', ok: true, message: 'Draft node exists.' },
    { id: 'tool_id', ok: Boolean(node.toolId), message: node.toolId ? `Tool id present: ${node.toolId}` : 'Tool id missing.' },
    { id: 'criteria_present', ok: Array.isArray(node.config?.criteria) && node.config.criteria.length > 0, message: Array.isArray(node.config?.criteria) && node.config.criteria.length > 0 ? 'Criteria are present.' : 'Criteria are missing.' },
    { id: 'organizer_ready', ok: Boolean(contract.organizer?.ready), message: contract.organizer?.ready ? 'Node is organizer-ready.' : 'Node is not organizer-ready.' },
    { id: 'authorable', ok: Boolean(contract.authoring?.allowed), message: contract.authoring?.allowed ? 'Node is authorable.' : 'Node is not authorable.' },
    { id: 'output_schema', ok: Boolean(contract.outputSchema && Object.keys(contract.outputSchema).length > 0), message: contract.outputSchema && Object.keys(contract.outputSchema).length > 0 ? 'Output schema exists.' : 'Output schema missing.' },
  ]

  return {
    ok: checks.every((item) => item.ok),
    checks,
    draftResult,
    contract,
  }
}
