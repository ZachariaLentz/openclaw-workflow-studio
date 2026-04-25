import { validateWorkflow } from '../schema.js'
import { buildNodeDraftFromRequest } from './drafts.js'
import { executeNode } from '../runtime/executors.js'

function buildHarnessWorkflow(node) {
  return {
    id: 'node-harness-score-products',
    name: 'Node Harness: Score Products',
    appId: 'node-organizer',
    version: '0.1.0',
    description: 'Minimal workflow for isolated node harness testing.',
    tags: ['node-harness'],
    tools: [],
    nodes: [
      {
        id: 'manual-trigger',
        type: 'trigger',
        label: 'Manual Trigger',
        description: 'Start harness run.',
        toolId: 'trigger.manual',
        config: {
          triggerMode: 'manual',
          triggerLabel: 'Run harness',
          initiator: 'tester',
        },
        position: { x: 0, y: 0 },
      },
      {
        id: 'approved-products',
        type: 'transform',
        label: 'Approved Products',
        description: 'Harness input provider for approved products.',
        toolId: 'logic.filter_approved_candidates',
        config: {
          fallbackMode: 'none',
          minApprovedCount: 1,
        },
        position: { x: 1, y: 0 },
      },
      node,
    ],
    edges: [
      { id: 'h1', from: 'manual-trigger', to: 'approved-products', label: 'start' },
      { id: 'h2', from: 'approved-products', to: node.id, label: 'approved products' },
    ],
    entryNodeId: 'manual-trigger',
    outputs: [],
    metadata: { harness: true },
  }
}

function sampleProducts() {
  return [
    { id: 'p1', title: 'Organizer Bin Set', margin: 42, rating: 4.8, price: 24 },
    { id: 'p2', title: 'Shelf Divider', margin: 30, rating: 4.3, price: 18 },
    { id: 'p3', title: 'Drawer Insert', margin: 36, rating: 4.6, price: 16 },
  ]
}

export async function runNodeDraftHarness(request, answers = {}) {
  const draftResult = buildNodeDraftFromRequest(request, answers)
  const node = draftResult?.draft?.node

  if (!node) {
    return {
      ok: false,
      stage: 'draft',
      error: 'No node draft could be built for the request.',
    }
  }

  const workflow = buildHarnessWorkflow(node)
  const validation = validateWorkflow(workflow)

  if (!validation.ok) {
    return {
      ok: false,
      stage: 'validation',
      draftResult,
      validation,
    }
  }

  const products = sampleProducts()
  const context = {
    workflow,
    state: {
      nodeOutputs: {
        'manual-trigger': {
          started: true,
          triggerMode: 'manual',
        },
        'approved-products': {
          approvedProducts: products,
          products,
        },
      },
      nodeStatus: {
        'manual-trigger': 'completed',
        'approved-products': 'completed',
      },
    },
    lastOutput: {
      products,
      approvedProducts: products,
    },
  }

  try {
    const execution = await executeNode(node, context)
    return {
      ok: true,
      stage: 'execution',
      draftResult,
      validation,
      execution,
    }
  } catch (error) {
    return {
      ok: false,
      stage: 'execution',
      draftResult,
      validation,
      error: error.message,
    }
  }
}
