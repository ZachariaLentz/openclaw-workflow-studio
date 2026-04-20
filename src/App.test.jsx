import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the studio header', () => {
    render(<App />)
    expect(screen.getByText('Workflow Studio')).toBeInTheDocument()
    expect(screen.getByText(/Design, review, and run connected workflows/i)).toBeInTheDocument()
  })
})
