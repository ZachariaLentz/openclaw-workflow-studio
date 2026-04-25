import { describe, expect, it } from 'vitest'
import { sampleWorkflows } from '../data/workflows'
import { applySocratesChange } from './socratesProtocol'

describe('applySocratesChange', () => {
  it('applies deterministic patch operations to a workflow', () => {
    const workflow = structuredClone(sampleWorkflows[0])
    const next = applySocratesChange(workflow, {
      type: 'patch_workflow',
      operations: [
        { op: 'set', path: 'name', value: 'Story Workflow Revised' },
        {
          op: 'upsert_node',
          node: {
            id: 'review-story',
            type: 'tool',
            label: 'Review Story',
            description: 'Review the edited draft.',
            toolId: 'ai.prompt',
            prompt: 'Review the story.',
            config: {},
            position: { x: 4, y: 1 },
          },
        },
        {
          op: 'upsert_edge',
          edge: { id: 's6', from: 'prompt-edit-story', to: 'review-story' },
        },
      ],
    })

    expect(next.name).toBe('Story Workflow Revised')
    expect(next.nodes.some((node) => node.id === 'review-story' && node.toolId === 'ai.prompt' && node.type === 'tool')).toBe(true)
    expect(next.edges.some((edge) => edge.id === 's6')).toBe(true)
    expect(next.tools.some((tool) => tool.id === 'ai.prompt')).toBe(true)
  })

  it('normalizes a manual trigger patch through the registry', () => {
    const workflow = structuredClone(sampleWorkflows[0])
    const next = applySocratesChange(workflow, {
      type: 'patch_workflow',
      operations: [
        {
          op: 'upsert_node',
          node: {
            id: 'new-start',
            type: 'trigger',
            label: 'New Start',
            config: {
              triggerMode: 'manual',
            },
            position: { x: 0, y: 1 },
          },
        },
      ],
    })

    expect(next.nodes.find((node) => node.id === 'new-start')).toMatchObject({
      toolId: 'trigger.manual',
      type: 'trigger',
      config: expect.objectContaining({
        triggerMode: 'manual',
        triggerLabel: 'Start workflow',
      }),
    })
  })

  it('rejects scaffold nodes in reusable authoring patches', () => {
    const workflow = structuredClone(sampleWorkflows[0])

    expect(() => applySocratesChange(workflow, {
      type: 'patch_workflow',
      operations: [
        {
          op: 'upsert_node',
          node: {
            id: 'send-result',
            type: 'output',
            label: 'Send Result',
            toolId: 'outputs.send_message',
            config: {
              destination: 'telegram:test',
            },
            position: { x: 6, y: 1 },
          },
        },
      ],
    })).toThrow(/not available for reusable workflow authoring/i)
  })

  it('replaces the full workflow when Socrates returns a draft', () => {
    const replacement = applySocratesChange(sampleWorkflows[0], {
      type: 'replace_workflow',
      workflow: {
        id: 'replacement',
        name: 'Replacement Flow',
        appId: 'workflow-studio',
        version: '1.0.0',
        description: 'A minimal replacement workflow.',
        tags: ['draft'],
        outputs: [],
        metadata: {},
        tools: [],
        entryNodeId: 'start',
        nodes: [
          {
            id: 'start',
            type: 'trigger',
            label: 'Start',
            description: 'Begin the flow.',
            config: { triggerMode: 'manual', triggerLabel: 'Start workflow' },
            position: { x: 0, y: 0 },
          },
        ],
        edges: [],
      },
    })

    expect(replacement.id).toBe('replacement')
    expect(replacement.nodes).toHaveLength(1)
  })
})
