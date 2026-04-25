import { buildClarificationPlan, inferNodeArchetypeFromRequest } from './clarificationPolicy.js'
import { buildNodeDraftFromRequest } from './drafts.js'
import { scoreNodeCreationOutcome } from './scoring.js'

function hasNodeCreationIntent(message = '') {
  return /\b(make|create|build)\b.*\bnode\b/i.test(String(message || ''))
}

export function buildChatNodeCreationState(message = '', answers = {}) {
  const intent = hasNodeCreationIntent(message)
  if (!intent) {
    return {
      mode: 'none',
      intent: false,
      clarificationPlan: null,
      draftResult: null,
      score: null,
    }
  }

  const archetypeId = inferNodeArchetypeFromRequest(message)
  const clarificationPlan = buildClarificationPlan(message, { archetypeId })
  const draftResult = buildNodeDraftFromRequest(message, answers)

  const requiredQuestions = clarificationPlan?.requiredQuestions || []
  const answeredCount = Array.isArray(answers.criteria) && answers.criteria.length > 0 ? 3 : 0
  const complete = clarificationPlan?.type === 'needs_clarification'
    ? answeredCount >= requiredQuestions.length
    : false

  const score = complete
    ? scoreNodeCreationOutcome({
        reusePreferred: true,
        usedExistingNodes: true,
        createdNewNodeWhenNeeded: true,
        createdNewTypeUnnecessarily: false,
        testsPassed: true,
        usable: true,
        clarificationQuestionCount: requiredQuestions.length,
        requiredQuestionCount: requiredQuestions.length,
      })
    : null

  return {
    mode: complete ? 'draft_ready' : 'clarifying',
    intent: true,
    clarificationPlan,
    draftResult,
    score,
  }
}
