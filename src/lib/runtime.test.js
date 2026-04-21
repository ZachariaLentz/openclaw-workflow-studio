import { describe, expect, it } from 'vitest'
import { sampleWorkflows } from '../data/workflows'
import { runWorkflow } from './runtime'

describe('runWorkflow', () => {
  const storyWorkflow = () => structuredClone(sampleWorkflows.find((workflow) => workflow.id === 'childrens-story-book'))

  it('completes the story flow and skips Google Drive when no account is connected', async () => {
    const workflow = storyWorkflow()
    const state = await runWorkflow(workflow)

    expect(state.status).toBe('completed')
    expect(state.nodeStatus['manual-trigger']).toBe('completed')
    expect(state.nodeStatus['structured-prompt-story-idea']).toBe('completed')
    expect(state.nodeStatus['prompt-write-story']).toBe('completed')
    expect(state.nodeStatus['prompt-edit-story']).toBe('completed')
    expect(state.nodeStatus['google-drive-save-file']).toBe('skipped')
    expect(state.nodeStatus['download-file']).toBe('completed')
    expect(state.nodeOutputs['download-file'].downloadUrl).toBeTruthy()
    expect(state.events.some((event) => event.type === 'node-skipped' && event.nodeId === 'google-drive-save-file')).toBe(true)
  })

  it('runs from the manual trigger node and produces downstream AI outputs', async () => {
    const workflow = storyWorkflow()
    const state = await runWorkflow(workflow, undefined, { triggerNodeId: 'manual-trigger' })

    expect(state.nodeOutputs['structured-prompt-story-idea']).toMatchObject({
      title: expect.any(String),
      nodeKind: 'structured_prompt',
    })
    expect(state.nodeOutputs['prompt-write-story']).toMatchObject({
      storyText: expect.any(String),
      nodeKind: 'prompt',
    })
    expect(state.nodeOutputs['prompt-edit-story']).toMatchObject({
      editedText: expect.any(String),
      nodeKind: 'prompt',
    })
  })
})
