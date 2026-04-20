import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the studio header and Socrates panel', () => {
    render(<App />)
    expect(screen.getByText('Workflow Studio')).toBeInTheDocument()
    expect(screen.getByText(/Design, review, and run connected workflows/i)).toBeInTheDocument()
    expect(screen.getByText('Socrates')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New workflow' })).toBeInTheDocument()
  })
})
