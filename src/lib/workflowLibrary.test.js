import { beforeEach, describe, expect, it } from 'vitest'
import { sampleWorkflows } from '../data/workflows'
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
    expect(openedView.stats.totalWorkflows).toBe(base.length + 1)
  })

  it('merges missing sample workflows into previously persisted library state', () => {
    const fallback = loadWorkflowLibrary()
    const storyOnly = fallback.filter((workflow) => workflow.id === 'childrens-story-book')
    window.localStorage.setItem(WORKFLOW_LIBRARY_STORAGE_KEY, JSON.stringify(storyOnly))

    const reloaded = loadWorkflowLibrary()

    expect(reloaded).toHaveLength(sampleWorkflows.length)
    expect(reloaded.some((workflow) => workflow.id === 'scheduled-mission-briefing')).toBe(true)
  })
})
