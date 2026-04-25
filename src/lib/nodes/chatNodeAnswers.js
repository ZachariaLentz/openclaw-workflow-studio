function normalizeFieldName(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function parseWeightValue(value) {
  const raw = String(value || '').trim().replace(/%$/, '')
  const num = Number(raw)
  if (!Number.isFinite(num)) return null
  return num > 1 ? num / 100 : num
}

function normalizeDirection(value = '') {
  const text = String(value || '').trim().toLowerCase()
  if (['higher', 'high', 'more', 'max', 'desc', 'descending'].includes(text)) return 'desc'
  if (['lower', 'low', 'less', 'min', 'asc', 'ascending'].includes(text)) return 'asc'
  return null
}

function parseInlineCriteria(text = '') {
  const parts = String(text || '')
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)

  const criteria = []
  for (const part of parts) {
    const match = part.match(/^([a-zA-Z0-9 _-]+)\s+(\d+(?:\.\d+)?)%?\s+(higher|lower|high|low|more|less|asc|desc|ascending|descending)$/i)
    if (!match) continue
    const [, fieldRaw, weightRaw, directionRaw] = match
    const field = normalizeFieldName(fieldRaw)
    const weight = parseWeightValue(weightRaw)
    const direction = normalizeDirection(directionRaw)
    if (!field || weight === null || !direction) continue
    criteria.push({ field, weight, direction })
  }

  return criteria
}

export function parseCriteriaAnswer(answer = '') {
  const criteria = parseInlineCriteria(answer)
  return {
    ok: criteria.length > 0,
    criteria,
  }
}

export function getMissingQuestionIds(clarificationPlan, answers = {}) {
  const required = clarificationPlan?.requiredQuestions || []
  return required
    .map((item) => item.id)
    .filter((id) => {
      if (id === 'criteria_fields') return !Array.isArray(answers.criteria) || answers.criteria.length === 0
      if (id === 'criteria_weights') return !Array.isArray(answers.criteria) || answers.criteria.some((item) => !Number.isFinite(item.weight))
      if (id === 'criteria_direction') return !Array.isArray(answers.criteria) || answers.criteria.some((item) => !item.direction)
      return true
    })
}

export function buildNextQuestionPrompt(clarificationPlan, answers = {}) {
  const missing = getMissingQuestionIds(clarificationPlan, answers)
  const nextId = missing[0]
  const question = (clarificationPlan?.requiredQuestions || []).find((item) => item.id === nextId)
  return question || null
}

export function mergeChatNodeAnswers(existingAnswers = {}, answerText = '') {
  const parsed = parseCriteriaAnswer(answerText)
  if (parsed.ok) {
    return {
      ...existingAnswers,
      criteria: parsed.criteria,
    }
  }

  return existingAnswers
}
