import { buildClarificationPlan, inferNodeArchetypeFromRequest } from './clarificationPolicy.js'
import { buildNodeDraftFromRequest } from './drafts.js'
import { runNodeDraftHarness } from './harness.js'
import { buildNextQuestionPrompt, getMissingQuestionIds, mergeChatNodeAnswers } from './chatNodeAnswers.js'
import { scoreNodeCreationOutcome } from './scoring.js'
import { validateNodeDraft } from './validation.js'

function hasNodeCreationIntent(message = '') {
  return /\b(make|create|build)\b.*\bnode\b/i.test(String(message || ''))
}

export async function buildChatNodeCreationState(message = '', answers = {}, latestAnswerText = '') {
  const intent = hasNodeCreationIntent(message)
  if (!intent) {
    return {
      mode: 'none',
      intent: false,
      clarificationPlan: null,
      draftResult: null,
      score: null,
      answers: {},
      nextQuestion: null,
      missingQuestionIds: [],
    }
  }

  const archetypeId = inferNodeArchetypeFromRequest(message)
  const clarificationPlan = buildClarificationPlan(message, { archetypeId })
  const mergedAnswers = latestAnswerText ? mergeChatNodeAnswers(answers, latestAnswerText) : answers
  const missingQuestionIds = getMissingQuestionIds(clarificationPlan, mergedAnswers)
  const complete = clarificationPlan?.type === 'needs_clarification'
    ? missingQuestionIds.length === 0
    : false
  const draftResult = buildNodeDraftFromRequest(message, mergedAnswers)
  const nextQuestion = complete ? null : buildNextQuestionPrompt(clarificationPlan, mergedAnswers)
  const requiredQuestions = clarificationPlan?.requiredQuestions || []
  const validation = complete ? validateNodeDraft(message, mergedAnswers) : null
  const harness = complete ? await runNodeDraftHarness(message, mergedAnswers) : null

  const score = complete
    ? scoreNodeCreationOutcome({
        reusePreferred: true,
        usedExistingNodes: true,
        createdNewNodeWhenNeeded: true,
        createdNewTypeUnnecessarily: false,
        testsPassed: harness?.ok === true,
        usable: validation?.ok === true && harness?.ok === true,
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
    answers: mergedAnswers,
    nextQuestion,
    missingQuestionIds,
    validation,
    harness,
  }
}
