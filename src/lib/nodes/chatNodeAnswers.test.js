import { describe, expect, it } from 'vitest'
import { buildClarificationPlan } from './clarificationPolicy.js'
import { buildNextQuestionPrompt, getMissingQuestionIds, mergeChatNodeAnswers, parseCriteriaAnswer } from './chatNodeAnswers.js'

describe('chat node answers', () => {
  it('parses inline weighted criteria answers', () => {
    const result = parseCriteriaAnswer('margin 40 higher, rating 35 higher, price 25 lower')
    expect(result.ok).toBe(true)
    expect(result.criteria).toEqual([
      { field: 'margin', weight: 0.4, direction: 'desc' },
      { field: 'rating', weight: 0.35, direction: 'desc' },
      { field: 'price', weight: 0.25, direction: 'asc' },
    ])
  })

  it('tracks missing required clarification questions', () => {
    const plan = buildClarificationPlan('make a node that scores product candidates by weighted ranking')
    expect(getMissingQuestionIds(plan, {})).toEqual(['criteria_fields', 'criteria_weights', 'criteria_direction'])

    const answers = mergeChatNodeAnswers({}, 'margin 40 higher, rating 35 higher, price 25 lower')
    expect(getMissingQuestionIds(plan, answers)).toEqual([])
  })

  it('returns the next required question prompt', () => {
    const plan = buildClarificationPlan('make a node that scores product candidates by weighted ranking')
    const next = buildNextQuestionPrompt(plan, {})
    expect(next?.id).toBe('criteria_fields')
  })
})
