import { describe, expect, it } from 'vitest'
import { buildClarificationPlan, inferNodeArchetypeFromRequest } from './clarificationPolicy.js'

describe('node clarification policy', () => {
  it('infers the scoring archetype from weighted ranking requests', () => {
    expect(inferNodeArchetypeFromRequest('make a node that scores product candidates by weighted ranking')).toBe('scoring_ranking')
  })

  it('builds a minimal clarification plan for weighted ranking requests', () => {
    const plan = buildClarificationPlan('make a node that scores product candidates by weighted ranking')

    expect(plan.type).toBe('needs_clarification')
    expect(plan.archetype).toMatchObject({ id: 'scoring_ranking' })
    expect(plan.requiredQuestions.map((item) => item.id)).toEqual([
      'criteria_fields',
      'criteria_weights',
      'criteria_direction',
    ])
    expect(plan.defaults).toMatchObject({
      normalization: 'min_max',
      tieHandling: 'stable',
      determinism: true,
    })
  })

  it('returns an insufficient-match result when no archetype is recognized', () => {
    const plan = buildClarificationPlan('make something cool')
    expect(plan.type).toBe('insufficient_archetype_match')
    expect(plan.requiredQuestions).toEqual([])
  })
})
