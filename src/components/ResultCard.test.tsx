import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultCard } from './ResultCard'

describe('ResultCard', () => {
  const baseRows = [
    { label: 'Session Fee', value: '$150.00', type: 'debit' as const },
    { label: 'CCS', value: '$100.00', type: 'credit' as const },
    { label: 'Gap Fee', value: '$50.00', highlight: true },
  ]

  it('renders title and all rows', () => {
    render(<ResultCard title="Daily Cost" rows={baseRows} />)
    expect(screen.getByText('Daily Cost')).toBeInTheDocument()
    expect(screen.getByText('Session Fee')).toBeInTheDocument()
    expect(screen.getByText('$150.00')).toBeInTheDocument()
    expect(screen.getByText('Gap Fee')).toBeInTheDocument()
  })

  it('renders note when provided', () => {
    render(<ResultCard title="Test" rows={baseRows} note="Some note" />)
    expect(screen.getByText('Some note')).toBeInTheDocument()
  })

  it('hides detail-only rows in simple mode', () => {
    const rows = [
      ...baseRows,
      { label: 'Hourly Rate', value: '$15.00', detailOnly: true },
    ]
    render(<ResultCard title="Test" rows={rows} detailedToggle />)
    expect(screen.queryByText('Hourly Rate')).not.toBeInTheDocument()
  })

  it('shows detail-only rows when detailed mode is toggled', () => {
    const rows = [
      ...baseRows,
      { label: 'Hourly Rate', value: '$15.00', detailOnly: true },
    ]
    render(<ResultCard title="Test" rows={rows} detailedToggle />)
    fireEvent.click(screen.getByText('Detailed'))
    expect(screen.getByText('Hourly Rate')).toBeInTheDocument()
  })
})
