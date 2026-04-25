import { describe, expect, it } from 'vitest'
import { buildChatNodeCreationState } from './chatNodeCreation.js'

describe('chat node creation', () => {
  it('enters clarification mode for a node-creation request', async () => {
    const state = await buildChatNodeCreationState('make a node that scores product candidates by weighted ranking')
    expect(state.mode).toBe('clarifying')
    expect(state.clarificationPlan?.type).toBe('needs_clarification')
    expect(state.nextQuestion?.id).toBe('criteria_fields')
  })

  it('returns a ready draft, validation, harness result, and score when required answers are supplied inline', async () => {
    const state = await buildChatNodeCreationState(
      'make a node that scores product candidates by weighted ranking',
      {},
      'margin 40 higher, rating 35 higher, price 25 lower',
    )

    expect(state.mode).toBe('draft_ready')
    expect(state.answers.criteria).toHaveLength(3)
    expect(state.draftResult?.draft?.toolId).toBe('logic.score_products')
    expect(state.validation?.ok).toBe(true)
    expect(state.harness?.ok).toBe(true)
    expect(state.score?.score).toBeGreaterThanOrEqual(90)
  })
})
