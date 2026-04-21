import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the redesigned workflow screen with graph-first controls', () => {
    render(<App />)
    expect(screen.getByText('Workflow Studio')).toBeInTheDocument()
    expect(screen.getByText(/Design, connect, and run connected workflows/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open Socrates' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reveal Workflow JSON' })).toBeInTheDocument()
    expect(screen.getByText(/Select a node to inspect details/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New workflow' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accounts' })).toBeInTheDocument()
    expect(screen.getAllByText('Structured Prompt').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Prompt').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Google Drive Save File').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Download File').length).toBeGreaterThan(0)
  })
})
