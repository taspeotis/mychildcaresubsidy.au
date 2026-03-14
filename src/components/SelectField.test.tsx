import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SelectField } from './SelectField'

describe('SelectField', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]

  it('renders label and options', () => {
    render(<SelectField label="Test" options={options} />)
    expect(screen.getByLabelText('Test')).toBeInTheDocument()
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })

  it('calls onChange with selected value', () => {
    const onChange = vi.fn()
    render(<SelectField label="Test" options={options} value="a" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Test'), { target: { value: 'b' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('renders hint text', () => {
    render(<SelectField label="Test" options={options} hint="Pick one" />)
    expect(screen.getByText('Pick one')).toBeInTheDocument()
  })
})
