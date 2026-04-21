import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the mobile-first workflow library screen', () => {
    render(<App />)
    expect(screen.getByText('Workflow Studio')).toBeInTheDocument()
    expect(screen.getByText(/Build beautiful workflows that feel native on phone/i)).toBeInTheDocument()
    expect(screen.getByText(/Tap one to open it full-screen/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
    expect(screen.getAllByText(/Children’s Story: Manual Trigger/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Create a simple children’s story/i).length).toBeGreaterThan(0)
  })

  it('opens the workflow and allows a run even without a connected Google account', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Children’s Story: Manual Trigger/i }))

    const runButton = screen.getByRole('button', { name: 'Run' })
    expect(runButton).toBeEnabled()
  })

  it('opens the manual trigger node inspector from the canvas', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Children’s Story: Manual Trigger/i }))
    fireEvent.click(screen.getByRole('button', { name: /trigger manual trigger manual-trigger/i }))

    expect(await screen.findByText(/Run from this node/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create story/i })).toBeInTheDocument()
    expect(screen.getByText(/Latest status: idle/i)).toBeInTheDocument()
  })
})
