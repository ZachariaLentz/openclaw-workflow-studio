import { describe, expect, it } from 'vitest'
import { scoreNodeCreationOutcome } from './scoring.js'

describe('scoreNodeCreationOutcome', () => {
  it('returns a high score for a clean reusable-node outcome', () => {
    const result = scoreNodeCreationOutcome({
      reusePreferred: true,
      usedExistingNodes: true,
      createdNewNodeWhenNeeded: true,
      createdNewTypeUnnecessarily: false,
      testsPassed: true,
      usable: true,
      clarificationQuestionCount: 3,
      requiredQuestionCount: 3,
      durationMs: 90_000,
    })

    expect(result.score).toBeGreaterThanOrEqual(95)
    expect(result.grade).toBe('A')
  })

  it('penalizes unnecessary invention and failing tests', () => {
    const result = scoreNodeCreationOutcome({
      reusePreferred: false,
      usedExistingNodes: false,
      createdNewNodeWhenNeeded: false,
      createdNewTypeUnnecessarily: true,
      testsPassed: false,
      usable: false,
      clarificationQuestionCount: 8,
      requiredQuestionCount: 3,
      durationMs: 20 * 60 * 1000,
    })

    expect(result.score).toBeLessThan(40)
    expect(result.grade).toBe('F')
  })
})
