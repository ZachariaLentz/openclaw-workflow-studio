import { sampleWorkflows } from '../data/workflows'
import { workflowDefinitionSchema } from './schema'

export const WORKFLOW_LIBRARY_STORAGE_KEY = 'ocws.workflowLibrary.v1'

function getStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function uniqueStrings(values) {
  return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))]
}

function getNow(options = {}) {
  return options.now || new Date().toISOString()
}

function makeLibraryMetadata(existingMetadata = {}, options = {}) {
  const current = existingMetadata.library || {}
  const now = getNow(options)
  return {
    ...current,
    createdAt: current.createdAt || now,
    updatedAt: options.updatedAt || now,
    lastOpenedAt: options.touchOpenedAt ? now : (current.lastOpenedAt || null),
  }
}

export function normalizeWorkflow(workflow, options = {}) {
  const parsed = workflowDefinitionSchema.parse(structuredClone(workflow))
  return {
    ...parsed,
    description: parsed.description || 'No description yet.',
    tags: uniqueStrings(parsed.tags),
    metadata: {
      ...parsed.metadata,
      library: makeLibraryMetadata(parsed.metadata, options),
    },
  }
}

function normalizeStoredWorkflows(workflows, options = {}) {
  return workflows.map((workflow) => normalizeWorkflow(workflow, options))
}

function getFallbackWorkflows() {
  return normalizeStoredWorkflows(sampleWorkflows)
}

function mergeMissingSampleWorkflows(workflows) {
  const fallback = getFallbackWorkflows()
  const existingIds = new Set(workflows.map((workflow) => workflow.id))
  const missing = fallback.filter((workflow) => !existingIds.has(workflow.id))
  if (missing.length === 0) return workflows
  return saveWorkflowLibrary([...workflows, ...missing])
}

export function saveWorkflowLibrary(workflows) {
  const storage = getStorage()
  if (!storage) return normalizeStoredWorkflows(workflows)
  const normalized = normalizeStoredWorkflows(workflows)
  storage.setItem(WORKFLOW_LIBRARY_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function loadWorkflowLibrary() {
  const storage = getStorage()
  if (!storage) return getFallbackWorkflows()

  try {
    const raw = storage.getItem(WORKFLOW_LIBRARY_STORAGE_KEY)
    if (!raw) {
      const fallback = getFallbackWorkflows()
      saveWorkflowLibrary(fallback)
      return fallback
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const fallback = getFallbackWorkflows()
      saveWorkflowLibrary(fallback)
      return fallback
    }

    return mergeMissingSampleWorkflows(normalizeStoredWorkflows(parsed))
  } catch {
    const fallback = getFallbackWorkflows()
    saveWorkflowLibrary(fallback)
    return fallback
  }
}

export function upsertWorkflowInLibrary(workflows, workflow, options = {}) {
  const normalized = normalizeWorkflow(workflow, options)
  const existingIndex = workflows.findIndex((item) => item.id === normalized.id)
  const nextWorkflows = existingIndex >= 0
    ? workflows.map((item, index) => {
      if (index !== existingIndex) return item
      return normalizeWorkflow({
        ...normalized,
        metadata: {
          ...normalized.metadata,
          library: {
            ...normalized.metadata.library,
            createdAt: item.metadata?.library?.createdAt || normalized.metadata.library.createdAt,
            lastOpenedAt: options.touchOpenedAt ? normalized.metadata.library.lastOpenedAt : (item.metadata?.library?.lastOpenedAt || normalized.metadata.library.lastOpenedAt),
          },
        },
      }, options)
    })
    : [normalized, ...workflows]

  return saveWorkflowLibrary(nextWorkflows)
}

export function touchWorkflowOpened(workflows, workflowId, options = {}) {
  const now = getNow(options)
  const next = workflows.map((workflow) => {
    if (workflow.id !== workflowId) return workflow
    return normalizeWorkflow({
      ...workflow,
      metadata: {
        ...workflow.metadata,
        library: {
          ...(workflow.metadata?.library || {}),
          lastOpenedAt: now,
        },
      },
    }, { now, updatedAt: workflow.metadata?.library?.updatedAt || now })
  })
  return saveWorkflowLibrary(next)
}

export function buildWorkflowLibraryView(workflows, options = {}) {
  const query = String(options.query || '').trim().toLowerCase()
  const sort = options.sort || 'updated'

  const filtered = workflows.filter((workflow) => {
    if (!query) return true
    const haystack = [
      workflow.name,
      workflow.description,
      workflow.appId,
      ...(workflow.tags || []),
      ...(workflow.nodes || []).map((node) => node.label),
    ].join(' ').toLowerCase()

    return haystack.includes(query)
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'name') {
      return a.name.localeCompare(b.name)
    }
    if (sort === 'opened') {
      return (b.metadata?.library?.lastOpenedAt || '').localeCompare(a.metadata?.library?.lastOpenedAt || '')
    }
    return (b.metadata?.library?.updatedAt || '').localeCompare(a.metadata?.library?.updatedAt || '')
  })

  const totalNodes = workflows.reduce((count, workflow) => count + (workflow.nodes?.length || 0), 0)
  const uniqueTags = uniqueStrings(workflows.flatMap((workflow) => workflow.tags || []))

  return {
    query,
    sort,
    items: sorted,
    stats: {
      totalWorkflows: workflows.length,
      visibleWorkflows: sorted.length,
      totalNodes,
      uniqueTagCount: uniqueTags.length,
    },
  }
}
