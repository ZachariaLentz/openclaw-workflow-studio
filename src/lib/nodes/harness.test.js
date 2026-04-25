import { describe, expect, it } from 'vitest'
import { runNodeDraftHarness } from './harness.js'

describe('node draft harness', () => {
  it('validates and executes a score-products draft', async () => {
    const result = await runNodeDraftHarness('make a node that scores product candidates by weighted ranking', {
      criteria: [
        { field: 'margin', weight: 0.4, direction: 'desc' },
        { field: 'rating', weight: 0.35, direction: 'desc' },
        { field: 'price', weight: 0.25, direction: 'asc' },
      ],
      topK: 10,
    })

    expect(result.ok).toBe(true)
    expect(result.validation.ok).toBe(true)
    expect(result.execution.output.scoredProducts.length).toBeGreaterThan(0)
  })
})
