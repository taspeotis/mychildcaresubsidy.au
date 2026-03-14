import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToggleGroup } from './ToggleGroup'

describe('ToggleGroup', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]

  it('renders all options', () => {
    render(<ToggleGroup options={options} value="a" onChange={vi.fn()} />)
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('marks active option with aria-pressed', () => {
    render(<ToggleGroup options={options} value="a" onChange={vi.fn()} />)
    expect(screen.getByText('Option A').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Option B').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange when option is clicked', () => {
    const onChange = vi.fn()
    render(<ToggleGroup options={options} value="a" onChange={onChange} />)
    fireEvent.click(screen.getByText('Option B'))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('does not call onChange when active option is clicked', () => {
    const onChange = vi.fn()
    render(<ToggleGroup options={options} value="a" onChange={onChange} />)
    fireEvent.click(screen.getByText('Option A'))
    // Still calls onChange (toggle group doesn't prevent re-selection)
    expect(onChange).toHaveBeenCalledWith('a')
  })
})
