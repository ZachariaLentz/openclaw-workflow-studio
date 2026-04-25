import { describe, expect, it } from 'vitest'
import { buildChatNodeCreationState } from './chatNodeCreation.js'

describe('chat node creation', () => {
  it('enters clarification mode for a node-creation request', () => {
    const state = buildChatNodeCreationState('make a node that scores product candidates by weighted ranking')
    expect(state.mode).toBe('clarifying')
    expect(state.clarificationPlan?.type).toBe('needs_clarification')
  })

  it('returns a ready draft and score when required answers are supplied', () => {
    const state = buildChatNodeCreationState('make a node that scores product candidates by weighted ranking', {
      criteria: [
        { field: 'margin', weight: 0.4, direction: 'desc' },
        { field: 'rating', weight: 0.35, direction: 'desc' },
        { field: 'price', weight: 0.25, direction: 'asc' },
      ],
    })

    expect(state.mode).toBe('draft_ready')
    expect(state.draftResult?.draft?.toolId).toBe('logic.score_products')
    expect(state.score?.score).toBeGreaterThanOrEqual(90)
  })
})
