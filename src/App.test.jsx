import { render, screen } from '@testing-library/react'
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
})
