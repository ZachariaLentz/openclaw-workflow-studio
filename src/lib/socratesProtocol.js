import { workflowDefinitionSchema } from './schema.js'
import { normalizeNodeForAuthoring } from './nodes/createNode.js'
import { buildToolRefFromDefinition } from './nodes/registry.js'

function cloneValue(value) {
  return structuredClone(value)
}

function parsePath(path) {
  return String(path || '')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment))
}

function setAtPath(target, path, value) {
  const segments = parsePath(path)
  if (segments.length === 0) return cloneValue(value)

  const root = Array.isArray(target) ? [...target] : { ...target }
  let cursor = root

  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index]
    const nextKey = segments[index + 1]
    const currentValue = cursor[key]
    let nextValue = currentValue
    if (nextValue === undefined || nextValue === null) {
      nextValue = typeof nextKey === 'number' ? [] : {}
    } else {
      nextValue = Array.isArray(nextValue) ? [...nextValue] : { ...nextValue }
    }
    cursor[key] = nextValue
    cursor = nextValue
  }

  cursor[segments[segments.length - 1]] = cloneValue(value)
  return root
}

function removeAtPath(target, path) {
  const segments = parsePath(path)
  if (segments.length === 0) return cloneValue(target)

  const root = Array.isArray(target) ? [...target] : { ...target }
  let cursor = root

  for (let index = 0; index < segments.length - 1; index += 1) {
    const key = segments[index]
    const currentValue = cursor[key]
    if (currentValue === undefined || currentValue === null) return root
    cursor[key] = Array.isArray(currentValue) ? [...currentValue] : { ...currentValue }
    cursor = cursor[key]
  }

  const finalKey = segments[segments.length - 1]
  if (Array.isArray(cursor) && typeof finalKey === 'number') {
    cursor.splice(finalKey, 1)
  } else {
    delete cursor[finalKey]
  }
  return root
}

function upsertById(items, value) {
  const nextItems = [...items]
  const existingIndex = nextItems.findIndex((item) => item.id === value.id)
  if (existingIndex >= 0) nextItems[existingIndex] = cloneValue(value)
  else nextItems.push(cloneValue(value))
  return nextItems
}

function upsertToolForNode(workflow, node) {
  if (!node?.toolId) return workflow
  const tool = buildToolRefFromDefinition(node.toolId)
  if (!tool) return workflow

  return {
    ...workflow,
    tools: upsertById(workflow.tools || [], tool),
  }
}

function removeByKey(items, key, value) {
  return items.filter((item) => item[key] !== value)
}

function extractChange(payload) {
  if (!payload || typeof payload !== 'object') {
    return { type: 'none' }
  }

  if (payload.change && typeof payload.change === 'object') {
    return payload.change
  }

  return payload
}

export function applySocratesChange(workflow, rawChange) {
  const change = extractChange(rawChange)
  if (!change.type || change.type === 'none') {
    return workflowDefinitionSchema.parse(cloneValue(workflow))
  }

  if (change.type === 'replace_workflow') {
    return workflowDefinitionSchema.parse(cloneValue(change.workflow))
  }

  if (change.type !== 'patch_workflow') {
    throw new Error(`Unsupported Socrates change type: ${change.type}`)
  }

  let nextWorkflow = cloneValue(workflow)
  const operations = Array.isArray(change.operations) ? change.operations : []

  for (const operation of operations) {
    switch (operation.op) {
      case 'set':
        nextWorkflow = setAtPath(nextWorkflow, operation.path, operation.value)
        break
      case 'remove':
        nextWorkflow = removeAtPath(nextWorkflow, operation.path)
        break
      case 'upsert_node':
        {
          const existingNode = (nextWorkflow.nodes || []).find((item) => item.id === operation.node?.id) || null
          const normalizedNode = normalizeNodeForAuthoring(operation.node || {}, { existingNode })
        nextWorkflow = {
          ...nextWorkflow,
          nodes: upsertById(nextWorkflow.nodes || [], normalizedNode),
        }
        nextWorkflow = upsertToolForNode(nextWorkflow, normalizedNode)
        break
        }
      case 'remove_node':
        nextWorkflow = {
          ...nextWorkflow,
          nodes: removeByKey(nextWorkflow.nodes || [], 'id', operation.nodeId),
          edges: (nextWorkflow.edges || []).filter((edge) => edge.from !== operation.nodeId && edge.to !== operation.nodeId),
        }
        if (nextWorkflow.entryNodeId === operation.nodeId) {
          nextWorkflow.entryNodeId = nextWorkflow.nodes[0]?.id
        }
        break
      case 'upsert_edge':
        nextWorkflow = {
          ...nextWorkflow,
          edges: upsertById(nextWorkflow.edges || [], operation.edge),
        }
        break
      case 'remove_edge':
        nextWorkflow = {
          ...nextWorkflow,
          edges: removeByKey(nextWorkflow.edges || [], 'id', operation.edgeId),
        }
        break
      case 'upsert_tool':
        nextWorkflow = {
          ...nextWorkflow,
          tools: upsertById(nextWorkflow.tools || [], operation.tool),
        }
        break
      case 'remove_tool':
        nextWorkflow = {
          ...nextWorkflow,
          tools: removeByKey(nextWorkflow.tools || [], 'id', operation.toolId),
        }
        break
      default:
        throw new Error(`Unsupported Socrates patch operation: ${operation.op}`)
    }
  }

  return workflowDefinitionSchema.parse(nextWorkflow)
}
