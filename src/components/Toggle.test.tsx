import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Toggle } from './Toggle'

describe('Toggle', () => {
  it('renders the label and reflects the checked state', () => {
    render(<Toggle checked={true} onChange={vi.fn()} label="Apply to All Days" />)
    expect(screen.getByText('Apply to All Days')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('passes the negated value to onChange when clicked', () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} label="X" />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('toggles via the visible label text', () => {
    const onChange = vi.fn()
    render(<Toggle checked={true} onChange={onChange} label="Apply Debt Recovery" />)
    fireEvent.click(screen.getByText('Apply Debt Recovery'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('uses the brand (purple) colour for federal CCS when on', () => {
    render(<Toggle checked={true} onChange={vi.fn()} label="X" colorScheme="brand" />)
    expect(screen.getByRole('switch').className).toContain('bg-brand-600')
  })

  it('uses the accent (orange) colour by default when on', () => {
    render(<Toggle checked={true} onChange={vi.fn()} label="X" />)
    expect(screen.getByRole('switch').className).toContain('bg-accent-500')
  })

  it('supports a distinct accessible name', () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="Apply Debt Recovery" ariaLabel="Apply debt recovery" />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-label', 'Apply debt recovery')
  })
})
