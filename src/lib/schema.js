import { z } from 'zod'

export const nodeTypeEnum = z.enum([
  'trigger',
  'input',
  'transform',
  'tool',
  'agent',
  'branch',
  'approval',
  'output',
])

export const toolKindEnum = z.enum(['openclaw', 'local-cli', 'api', 'composite', 'simulated'])

export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: nodeTypeEnum,
  label: z.string().min(1),
  description: z.string().optional().default(''),
  toolId: z.string().optional(),
  prompt: z.string().optional(),
  config: z.record(z.string(), z.any()).default({}),
  position: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
  }).default({ x: 0, y: 0 }),
})

export const workflowEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional().default(''),
  condition: z.string().optional(),
})

export const workflowToolRefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: toolKindEnum,
  description: z.string().default(''),
  inputSchema: z.record(z.string(), z.any()).default({}),
  outputSchema: z.record(z.string(), z.any()).default({}),
  sideEffectLevel: z.enum(['read', 'write', 'external']).default('read'),
})

export const workflowDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  appId: z.string().min(1),
  version: z.string().min(1),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  tools: z.array(workflowToolRefSchema).default([]),
  nodes: z.array(workflowNodeSchema).min(1),
  edges: z.array(workflowEdgeSchema).default([]),
  entryNodeId: z.string().optional(),
  outputs: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
})

export function validateWorkflow(definition) {
  const result = workflowDefinitionSchema.safeParse(definition)
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    }
  }

  const workflow = result.data
  const nodeIds = new Set(workflow.nodes.map((node) => node.id))
  const semanticErrors = []

  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.from)) semanticErrors.push({ path: `edges.${edge.id}.from`, message: `Unknown source node: ${edge.from}` })
    if (!nodeIds.has(edge.to)) semanticErrors.push({ path: `edges.${edge.id}.to`, message: `Unknown target node: ${edge.to}` })
  }

  if (workflow.entryNodeId && !nodeIds.has(workflow.entryNodeId)) {
    semanticErrors.push({ path: 'entryNodeId', message: `Unknown entry node: ${workflow.entryNodeId}` })
  }

  return {
    ok: semanticErrors.length === 0,
    errors: semanticErrors,
    data: workflow,
  }
}
