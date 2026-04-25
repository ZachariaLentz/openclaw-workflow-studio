import { createNodeFromRegistry } from './createNode.js'
import { buildClarificationPlan, inferNodeArchetypeFromRequest } from './clarificationPolicy.js'
import { buildNodeContractSummary } from './contracts.js'

function toNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function buildScoreProductsDraft(answers = {}) {
  const criteria = Array.isArray(answers.criteria) ? answers.criteria : []
  const topK = toNumber(answers.topK, 20)
  const normalization = answers.normalization || 'min_max'
  const missingData = answers.missingData || 'penalize_with_warning'
  const explainability = answers.explainability || 'summary_breakdown'

  const node = createNodeFromRegistry('logic.score_products', {
    label: answers.label || 'Score Products',
    description: answers.description || 'Score candidate records by weighted ranking.',
    config: {
      topK,
      scoringMethod: 'weighted-ranking',
      normalization,
      missingData,
      explainability,
      criteria,
    },
  })

  return {
    toolId: 'logic.score_products',
    archetype: 'scoring_ranking',
    node,
    contract: buildNodeContractSummary('logic.score_products'),
    draftState: {
      ready: criteria.length > 0,
      requiredAnswerIds: ['criteria_fields', 'criteria_weights', 'criteria_direction'],
    },
  }
}

export function buildNodeDraftFromRequest(request = '', answers = {}) {
  const archetypeId = inferNodeArchetypeFromRequest(request)
  const clarificationPlan = buildClarificationPlan(request, { archetypeId })

  if (archetypeId === 'scoring_ranking') {
    return {
      type: 'node_draft',
      request,
      clarificationPlan,
      draft: buildScoreProductsDraft(answers),
    }
  }

  return {
    type: 'unsupported_node_draft',
    request,
    clarificationPlan,
    draft: null,
  }
}
