import { getNodeArchetype } from './archetypes.js'

export const clarificationPolicies = {
  scoring_ranking: {
    inferable: {
      consumesCollection: true,
      outputMode: 'ranked_collection',
      determinism: true,
    },
    requiredQuestions: [
      {
        id: 'criteria_fields',
        question: 'Which fields should be scored?',
        reason: 'The node cannot rank records without explicit scoring criteria.',
      },
      {
        id: 'criteria_weights',
        question: 'What weight should each field get?',
        reason: 'Weighted ranking requires explicit weights.',
      },
      {
        id: 'criteria_direction',
        question: 'For each field, is higher better or lower better?',
        reason: 'Direction materially changes the ranking outcome.',
      },
    ],
    defaults: {
      normalization: 'min_max',
      missingData: 'penalize_with_warning',
      tieHandling: 'stable',
      outputShape: 'pass_through_ranked_items_with_score_breakdown',
      explainability: 'summary_breakdown',
      determinism: true,
    },
    advancedQuestions: [
      'filtering',
      'dynamic_weights',
      'performance_constraints',
    ],
  },
}

const weightedRankingPatterns = [
  /weighted ranking/i,
  /score(s|) product candidates/i,
  /rank(s|) candidates/i,
  /weighted score/i,
]

export function inferNodeArchetypeFromRequest(request = '') {
  const text = String(request || '')
  if (weightedRankingPatterns.some((pattern) => pattern.test(text))) return 'scoring_ranking'
  return null
}

export function getClarificationPolicy(archetypeId) {
  return clarificationPolicies[archetypeId] || null
}

export function buildClarificationPlan(request = '', options = {}) {
  const archetypeId = options.archetypeId || inferNodeArchetypeFromRequest(request)
  if (!archetypeId) {
    return {
      type: 'insufficient_archetype_match',
      archetype: null,
      requiredQuestions: [],
      defaults: {},
    }
  }

  const archetype = getNodeArchetype(archetypeId)
  const policy = getClarificationPolicy(archetypeId)

  if (!policy) {
    return {
      type: 'missing_policy',
      archetype,
      requiredQuestions: [],
      defaults: {},
    }
  }

  return {
    type: 'needs_clarification',
    archetype: {
      id: archetype.id,
      title: archetype.title,
      description: archetype.description,
    },
    requiredQuestions: policy.requiredQuestions,
    defaults: policy.defaults,
    inferable: policy.inferable || {},
    advancedQuestions: policy.advancedQuestions || [],
  }
}
