import { describe, expect, it } from 'vitest'
import { validateNodeDraft } from './validation.js'

describe('validateNodeDraft', () => {
  it('validates the score-products draft contract', () => {
    const result = validateNodeDraft('make a node that scores product candidates by weighted ranking', {
      criteria: [
        { field: 'margin', weight: 0.4, direction: 'desc' },
        { field: 'rating', weight: 0.35, direction: 'desc' },
        { field: 'price', weight: 0.25, direction: 'asc' },
      ],
    })

    expect(result.ok).toBe(true)
    expect(result.checks.every((item) => item.ok)).toBe(true)
  })
})
