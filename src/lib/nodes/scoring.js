export function scoreNodeCreationOutcome(outcome = {}) {
  const reusePreferred = outcome.reusePreferred !== false
  const usedExistingNodes = outcome.usedExistingNodes !== false
  const createdNewNodeWhenNeeded = outcome.createdNewNodeWhenNeeded !== false
  const createdNewTypeUnnecessarily = outcome.createdNewTypeUnnecessarily === true
  const testsPassed = outcome.testsPassed === true
  const usable = outcome.usable === true
  const clarificationQuestionCount = Number.isFinite(outcome.clarificationQuestionCount) ? outcome.clarificationQuestionCount : 0
  const requiredQuestionCount = Number.isFinite(outcome.requiredQuestionCount) ? outcome.requiredQuestionCount : 0
  const askedExtraQuestions = Math.max(0, clarificationQuestionCount - requiredQuestionCount)
  const durationMs = Number.isFinite(outcome.durationMs) ? outcome.durationMs : null

  let score = 100
  const reasons = []

  if (!reusePreferred || !usedExistingNodes) {
    score -= 20
    reasons.push('Did not prefer existing reusable nodes before invention.')
  }

  if (!createdNewNodeWhenNeeded) {
    score -= 20
    reasons.push('Created a new node when it was not clearly needed.')
  }

  if (createdNewTypeUnnecessarily) {
    score -= 20
    reasons.push('Created a new node archetype/type unnecessarily.')
  }

  if (askedExtraQuestions > 0) {
    score -= Math.min(15, askedExtraQuestions * 3)
    reasons.push('Asked more clarification questions than required for a usable node.')
  }

  if (!testsPassed) {
    score -= 30
    reasons.push('Node-related tests did not pass.')
  }

  if (!usable) {
    score -= 25
    reasons.push('Resulting node is not yet considered usable.')
  }

  if (durationMs !== null && durationMs > 0) {
    if (durationMs > 10 * 60 * 1000) {
      score -= 10
      reasons.push('Time to usable node was slower than target.')
    } else if (durationMs <= 2 * 60 * 1000 && testsPassed && usable) {
      score += 5
      reasons.push('Fast path to usable node with passing tests.')
    }
  }

  score = Math.max(0, Math.min(100, score))

  let grade = 'A'
  if (score < 90) grade = 'B'
  if (score < 75) grade = 'C'
  if (score < 60) grade = 'D'
  if (score < 40) grade = 'F'

  return {
    score,
    grade,
    reasons,
    summary: score >= 90
      ? 'Strong node-creation outcome.'
      : score >= 75
        ? 'Good node-creation outcome with some inefficiency or risk.'
        : score >= 60
          ? 'Mixed node-creation outcome.'
          : 'Weak node-creation outcome; contract, reuse, or verification needs improvement.',
  }
}
