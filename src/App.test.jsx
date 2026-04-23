import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { WORKFLOW_LIBRARY_STORAGE_KEY } from './lib/workflowLibrary'

function jsonResponse(payload) {
  return {
    ok: true,
    json: async () => payload,
  }
}

function mockBridgeFetch() {
  return vi.fn(async (url) => {
    if (url.includes('/health')) {
      return jsonResponse({ ok: true, service: 'bridge' })
    }
    if (url.includes('/api/status')) {
      return jsonResponse({ ok: true, status: { runtime: 'local' } })
    }
    if (url.includes('/api/capabilities')) {
      return jsonResponse({ ok: true, capabilities: {} })
    }
    if (url.includes('/api/accounts/providers')) {
      return jsonResponse({ ok: true, providers: [] })
    }
    if (url.includes('/api/accounts')) {
      return jsonResponse({ ok: true, accounts: [] })
    }
    if (url.includes('/api/socrates-chat')) {
      return jsonResponse({
        ok: true,
        reply: 'Renamed the workflow and saved the patch.',
        change: {
          type: 'patch_workflow',
          operations: [
            { op: 'set', path: 'name', value: 'Children Story Flow v2' },
            { op: 'set', path: 'description', value: 'Updated by Socrates.' },
          ],
        },
      })
    }
    throw new Error(`Unhandled fetch URL: ${url}`)
  })
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', mockBridgeFetch())
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders the workflow library with organization controls', async () => {
    render(<App />)

    expect(screen.getByText('Workflow Studio')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Search workflows/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Sort/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New workflow' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Children’s Story: Manual Trigger/i })).toBeInTheDocument()
    expect(screen.getByText(/5 saved/i)).toBeInTheDocument()
  })

  it('opens the workflow into a mobile workspace with persistent tabs', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /Children’s Story: Manual Trigger/i }))

    expect(screen.getAllByRole('button', { name: 'Run' })[0]).toBeEnabled()
    const workspaceNav = screen.getByRole('navigation', { name: /Workflow workspace navigation/i })
    expect(workspaceNav).toBeInTheDocument()
    expect(within(workspaceNav).getByRole('button', { name: 'Canvas' })).toBeInTheDocument()
    expect(within(workspaceNav).getByRole('button', { name: 'Run', pressed: false })).toBeInTheDocument()
  })

  it('opens the manual trigger node inspector from the canvas and can jump to the full node workspace', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /Children’s Story: Manual Trigger/i }))
    fireEvent.click(screen.getByRole('button', { name: /trigger manual trigger manual-trigger/i }))

    expect(screen.getByText(/Run from this node/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create story/i })).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' }).at(-1))

    expect(await screen.findByText(/Node details/i)).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('Manual Trigger').length).toBeGreaterThan(0)
  })

  it('applies a structured Socrates patch and persists it into the workflow library', async () => {
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /Children’s Story: Manual Trigger/i }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Socrates' })[0])
    fireEvent.change(screen.getByPlaceholderText(/Ask Socrates/i), { target: { value: 'Rename this workflow.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await screen.findByText(/Applied a structured patch/i)
    expect(screen.getByText('Children Story Flow v2')).toBeInTheDocument()

    const socratesCall = fetch.mock.calls.find(([url]) => String(url).includes('/api/socrates-chat'))
    const requestBody = JSON.parse(socratesCall[1].body)
    expect(requestBody.userMessage).toBe('Rename this workflow.')
    expect(requestBody.workflowContext.activeWorkflow.id).toBe('childrens-story-book')
    expect(requestBody.workflowContext.editingIntent).toBe('editing_an_existing_saved_workflow')

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(WORKFLOW_LIBRARY_STORAGE_KEY))
      const updated = saved.find((workflow) => workflow.id === 'childrens-story-book')
      expect(updated.name).toBe('Children Story Flow v2')
      expect(updated.description).toBe('Updated by Socrates.')
    })
  })
})
