import { describe, expect, it } from 'vitest'
import { buildNodeDraftFromRequest } from './drafts.js'

describe('node drafts', () => {
  it('builds a score-products node draft from a weighted ranking request', () => {
    const result = buildNodeDraftFromRequest('make a node that scores product candidates by weighted ranking', {
      criteria: [
        { field: 'margin', weight: 0.4, direction: 'desc' },
        { field: 'rating', weight: 0.35, direction: 'desc' },
        { field: 'price', weight: 0.25, direction: 'asc' },
      ],
      topK: 12,
    })

    expect(result.type).toBe('node_draft')
    expect(result.draft.toolId).toBe('logic.score_products')
    expect(result.draft.node).toMatchObject({
      toolId: 'logic.score_products',
      type: 'transform',
      config: expect.objectContaining({
        scoringMethod: 'weighted-ranking',
        topK: 12,
      }),
    })
    expect(result.draft.node.config.criteria).toHaveLength(3)
  })
})
