import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CcsDetailsCard } from './CcsDetailsCard'

const defaultProps = {
  ccsPercent: '85.00',
  onCcsPercentChange: vi.fn(),
  withholding: '5',
  onWithholdingChange: vi.fn(),
  ccsHours: '72',
  onCcsHoursChange: vi.fn(),
  onOpenCcsModal: vi.fn(),
}

describe('CcsDetailsCard', () => {
  it('renders CCS percentage input', () => {
    render(<CcsDetailsCard {...defaultProps} />)
    expect(screen.getByLabelText('CCS Percentage')).toBeInTheDocument()
    expect(screen.getByDisplayValue('85.00')).toBeInTheDocument()
  })

  it('renders withholding input', () => {
    render(<CcsDetailsCard {...defaultProps} />)
    expect(screen.getByLabelText('CCS Withholding')).toBeInTheDocument()
  })

  it('shows CCS hours toggle when not hidden', () => {
    render(<CcsDetailsCard {...defaultProps} />)
    expect(screen.getByText('72 hrs')).toBeInTheDocument()
    expect(screen.getByText('100 hrs')).toBeInTheDocument()
  })

  it('hides CCS hours toggle when hideCcsHours is true', () => {
    render(<CcsDetailsCard {...defaultProps} hideCcsHours />)
    expect(screen.queryByText('72 hrs')).not.toBeInTheDocument()
  })

  it('calls onOpenCcsModal when calculate link is clicked', () => {
    const onOpenCcsModal = vi.fn()
    render(<CcsDetailsCard {...defaultProps} onOpenCcsModal={onOpenCcsModal} />)
    fireEvent.click(screen.getByText("Don't know your CCS %? Calculate it"))
    expect(onOpenCcsModal).toHaveBeenCalledOnce()
  })

  it('renders debt recovery disclosure when handler provided', () => {
    render(<CcsDetailsCard {...defaultProps} debtRecovery="0.00" onDebtRecoveryChange={vi.fn()} />)
    expect(screen.getByText('Centrelink Debt Recovery')).toBeInTheDocument()
  })

  it('does not render debt recovery when no handler', () => {
    render(<CcsDetailsCard {...defaultProps} />)
    expect(screen.queryByText('Centrelink Debt Recovery')).not.toBeInTheDocument()
  })

  it('shows checkbox when disclosure is opened', () => {
    render(<CcsDetailsCard {...defaultProps} debtRecovery="0.00" onDebtRecoveryChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Centrelink Debt Recovery'))
    expect(screen.getByRole('switch', { name: 'Apply debt recovery' })).toBeInTheDocument()
  })

  it('defaults to 20% when checkbox is ticked', () => {
    const onDebtRecoveryChange = vi.fn()
    render(<CcsDetailsCard {...defaultProps} debtRecovery="0.00" onDebtRecoveryChange={onDebtRecoveryChange} />)
    fireEvent.click(screen.getByText('Centrelink Debt Recovery'))
    fireEvent.click(screen.getByRole('switch', { name: 'Apply debt recovery' }))
    expect(onDebtRecoveryChange).toHaveBeenCalledWith('20.00')
  })

  it('resets to 0 when checkbox is unticked', () => {
    const onDebtRecoveryChange = vi.fn()
    render(<CcsDetailsCard {...defaultProps} debtRecovery="20.00" onDebtRecoveryChange={onDebtRecoveryChange} />)
    fireEvent.click(screen.getByText('Centrelink Debt Recovery'))
    // Checkbox is already checked (debtRecovery > 0), untick it
    fireEvent.click(screen.getByRole('switch', { name: 'Apply debt recovery' }))
    expect(onDebtRecoveryChange).toHaveBeenCalledWith('0.00')
  })
})
