import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimePicker } from './TimePicker'

describe('TimePicker', () => {
  it('renders label', () => {
    render(<TimePicker label="Start Time" value={8} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Start Time')).toBeInTheDocument()
  })

  it('generates correct time options', () => {
    render(<TimePicker label="Time" value={8} onChange={vi.fn()} min={8} max={9} step={0.25} />)
    expect(screen.getByText('8:00 AM')).toBeInTheDocument()
    expect(screen.getByText('8:15 AM')).toBeInTheDocument()
    expect(screen.getByText('8:30 AM')).toBeInTheDocument()
    expect(screen.getByText('8:45 AM')).toBeInTheDocument()
    expect(screen.getByText('9:00 AM')).toBeInTheDocument()
  })

  it('default step generates 15-minute options', () => {
    render(<TimePicker label="Time" value={8} onChange={vi.fn()} min={8} max={9} />)
    // step defaults to 0.25 (15 minutes), so 8:00–9:00 should have 5 options
    expect(screen.getByText('8:00 AM')).toBeInTheDocument()
    expect(screen.getByText('8:15 AM')).toBeInTheDocument()
    expect(screen.getByText('8:30 AM')).toBeInTheDocument()
    expect(screen.getByText('8:45 AM')).toBeInTheDocument()
    expect(screen.getByText('9:00 AM')).toBeInTheDocument()
    // Verify there are exactly 5 options (no 30-min gaps or 1-hr steps)
    const select = screen.getByLabelText('Time') as HTMLSelectElement
    expect(select.options).toHaveLength(5)
  })

  it('calls onChange with numeric value', () => {
    const onChange = vi.fn()
    render(<TimePicker label="Time" value={8} onChange={onChange} min={8} max={10} />)
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '9' } })
    expect(onChange).toHaveBeenCalledWith(9)
  })
})
