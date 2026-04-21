import { beforeEach, describe, expect, it } from 'vitest'
import { createBlankWorkflow } from './newWorkflow'
import { buildWorkflowLibraryView, loadWorkflowLibrary, touchWorkflowOpened, upsertWorkflowInLibrary, WORKFLOW_LIBRARY_STORAGE_KEY } from './workflowLibrary'

describe('workflowLibrary', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('loads fallback workflows and persists normalized library metadata', () => {
    const workflows = loadWorkflowLibrary()

    expect(workflows.length).toBeGreaterThan(0)
    expect(workflows[0].metadata.library.createdAt).toBeTruthy()
    expect(JSON.parse(window.localStorage.getItem(WORKFLOW_LIBRARY_STORAGE_KEY))).toHaveLength(workflows.length)
  })

  it('upserts workflows and builds searchable, sortable library views', () => {
    const base = loadWorkflowLibrary()
    const draft = {
      ...createBlankWorkflow(),
      id: 'alpha-workflow',
      name: 'Alpha Draft',
      description: 'Sync invoices each morning.',
      tags: ['finance', 'automation'],
    }

    const withDraft = upsertWorkflowInLibrary(base, draft, { now: '2025-01-01T00:00:00.000Z' })
    const touched = touchWorkflowOpened(withDraft, 'alpha-workflow', { now: '2025-01-02T00:00:00.000Z' })
    const searchView = buildWorkflowLibraryView(touched, { query: 'invoice', sort: 'name' })
    const openedView = buildWorkflowLibraryView(touched, { sort: 'opened' })

    expect(searchView.items).toHaveLength(1)
    expect(searchView.items[0].id).toBe('alpha-workflow')
    expect(openedView.items[0].id).toBe('alpha-workflow')
    expect(openedView.stats.totalWorkflows).toBe(2)
  })
})
