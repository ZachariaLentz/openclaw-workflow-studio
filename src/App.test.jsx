import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the studio header', () => {
    render(<App />)
    expect(screen.getByText('OpenClaw Workflow Studio')).toBeInTheDocument()
    expect(screen.getByText(/Chat-authored workflow cockpit/i)).toBeInTheDocument()
  })
})
