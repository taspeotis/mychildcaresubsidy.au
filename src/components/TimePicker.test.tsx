import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimePicker } from './TimePicker'

describe('TimePicker', () => {
  it('renders label', () => {
    render(<TimePicker label="Start Time" value={8} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Start Time')).toBeInTheDocument()
  })

  it('generates correct time options', () => {
    render(<TimePicker label="Time" value={8} onChange={vi.fn()} min={8} max={9} step={0.5} />)
    expect(screen.getByText('8:00 AM')).toBeInTheDocument()
    expect(screen.getByText('8:30 AM')).toBeInTheDocument()
    expect(screen.getByText('9:00 AM')).toBeInTheDocument()
  })

  it('calls onChange with numeric value', () => {
    const onChange = vi.fn()
    render(<TimePicker label="Time" value={8} onChange={onChange} min={8} max={10} />)
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '9' } })
    expect(onChange).toHaveBeenCalledWith(9)
  })
})
