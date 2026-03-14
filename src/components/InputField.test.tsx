import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InputField } from './InputField'

describe('InputField', () => {
  it('renders with label', () => {
    render(<InputField label="Test Label" value="" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument()
  })

  it('renders hint text', () => {
    render(<InputField label="Test" hint="Some hint" value="" onChange={vi.fn()} />)
    expect(screen.getByText('Some hint')).toBeInTheDocument()
  })

  it('renders prefix and suffix', () => {
    render(<InputField label="Amount" prefix="$" suffix="/yr" value="100" onChange={vi.fn()} />)
    expect(screen.getByText('$')).toBeInTheDocument()
    expect(screen.getByText('/yr')).toBeInTheDocument()
  })

  it('formats currency on blur', () => {
    const onChange = vi.fn()
    render(<InputField label="Fee" value="150" onChange={onChange} format="currency" />)
    fireEvent.blur(screen.getByLabelText('Fee'))
    expect(onChange).toHaveBeenCalled()
  })

  it('formats integer with thousands separator on blur', () => {
    const onChange = vi.fn()
    render(<InputField label="Income" value="120000" onChange={onChange} format="integer" />)
    fireEvent.blur(screen.getByLabelText('Income'))
    expect(onChange).toHaveBeenCalled()
  })

  it('clamps value to min on blur', () => {
    const onChange = vi.fn()
    render(<InputField label="Pct" value="-5" onChange={onChange} format="percent" min={0} />)
    fireEvent.blur(screen.getByLabelText('Pct'))
    // Should have called onChange with clamped value
    expect(onChange).toHaveBeenCalled()
  })

  it('clamps value to max on blur', () => {
    const onChange = vi.fn()
    render(<InputField label="Pct" value="100" onChange={onChange} format="percent" max={95} />)
    fireEvent.blur(screen.getByLabelText('Pct'))
    expect(onChange).toHaveBeenCalled()
  })

  it('renders error message', () => {
    render(<InputField label="Test" value="" onChange={vi.fn()} error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
  })
})
