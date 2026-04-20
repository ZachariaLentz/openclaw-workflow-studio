export function createBlankWorkflow() {
  return {
    id: `workflow-${Date.now()}`,
    name: 'New Workflow',
    appId: 'workflow-studio',
    version: '0.1.0',
    description: 'A new workflow ready for shaping with Socrates.',
    tags: ['draft'],
    outputs: [],
    metadata: {
      owner: 'Zacharia',
      appView: 'workflow-studio',
      mode: 'local-first',
      draft: true,
    },
    tools: [],
    entryNodeId: 'start',
    nodes: [
      {
        id: 'start',
        type: 'trigger',
        label: 'Start',
        description: 'Manual trigger for the workflow.',
        config: {
          triggerMode: 'manual',
          triggerLabel: 'Start workflow',
        },
        position: { x: 0, y: 0 },
      },
    ],
    edges: [],
  }
}
