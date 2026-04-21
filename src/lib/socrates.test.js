import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleWorkflows } from '../data/workflows'
import { buildSocratesRequest, sendToSocrates } from './socrates'

describe('sendToSocrates', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        reply: 'Applied a patch.',
        change: { type: 'patch_workflow', operations: [{ op: 'set', path: 'name', value: 'Renamed' }] },
      }),
    }))
  })

  it('sends the structured workflow payload and returns the normalized response', async () => {
    const result = await sendToSocrates('Rename it.', sampleWorkflows[0], {
      activeWorkflowId: sampleWorkflows[0].id,
      libraryWorkflows: sampleWorkflows,
    })
    const [, options] = fetch.mock.calls[0]
    const body = JSON.parse(options.body)

    expect(body.userMessage).toBe('Rename it.')
    expect(body.protocolVersion).toBe(2)
    expect(body.workflow.id).toBe(sampleWorkflows[0].id)
    expect(body.workflowContext.activeWorkflow.name).toBe(sampleWorkflows[0].name)
    expect(body.workflowContext.editingIntent).toBe('editing_an_existing_saved_workflow')
    expect(body.message).toContain('ACTIVE WORKFLOW CONTEXT')
    expect(body.message).toContain(sampleWorkflows[0].name)
    expect(result.change.type).toBe('patch_workflow')
    expect(result.reply).toBe('Applied a patch.')
  })

  it('marks a blank draft as a new active draft and includes trigger grounding', () => {
    const draftWorkflow = {
      id: 'workflow-123',
      name: 'New Workflow',
      appId: 'workflow-studio',
      version: '0.1.0',
      description: 'A new workflow ready for shaping with Socrates.',
      tags: ['draft'],
      outputs: [],
      metadata: { draft: true },
      tools: [],
      entryNodeId: 'start',
      nodes: [
        {
          id: 'start',
          type: 'trigger',
          label: 'Start',
          description: 'Manual trigger for the workflow.',
          config: { triggerMode: 'manual', triggerLabel: 'Start workflow' },
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
    }

    const request = buildSocratesRequest('Turn this into an approval workflow.', draftWorkflow, {
      activeWorkflowId: draftWorkflow.id,
      libraryWorkflows: [draftWorkflow, sampleWorkflows[0]],
    })

    expect(request.workflowContext.activeWorkflow.mode).toBe('new_draft')
    expect(request.workflowContext.editingIntent).toBe('starting_or_shaping_a_new_draft')
    expect(request.workflowContext.trigger).toMatchObject({
      id: 'start',
      label: 'Start',
      triggerLabel: 'Start workflow',
    })
    expect(request.message).toContain('Turn this into an approval workflow.')
    expect(request.message).toContain('Children’s Story: Manual Trigger')
  })
})
