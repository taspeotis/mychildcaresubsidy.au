import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FortnightlyGrid, createDefaultDays } from './FortnightlyGrid'

const defaults = { sessionFee: '150.00', sessionStart: 7, sessionEnd: 18 }
const fmt = (n: number) => `$${n.toFixed(2)}`

function oneBookedWeek() {
  const days = createDefaultDays(defaults, undefined, 1)
  days[0] = { ...days[0], booked: true }
  return days
}

describe('createDefaultDays', () => {
  it('creates 5 days with weeks=1', () => {
    const days = createDefaultDays(defaults, undefined, 1)
    expect(days).toHaveLength(5)
    expect(days.every((d) => d.booked === false)).toBe(true)
    expect(days.every((d) => d.sessionFee === '150.00')).toBe(true)
    expect(days.every((d) => d.sessionStart === 7)).toBe(true)
    expect(days.every((d) => d.sessionEnd === 18)).toBe(true)
    expect(days.every((d) => d.hasKindy === false)).toBe(true)
  })

  it('creates 10 days with weeks=2 (default)', () => {
    const days = createDefaultDays(defaults)
    expect(days).toHaveLength(10)
    expect(days.every((d) => d.booked === false)).toBe(true)
    expect(days.every((d) => d.sessionFee === '150.00')).toBe(true)
  })

  it('applies kindyPattern correctly', () => {
    // Pattern: Mon+Tue kindy in week 1, Wed kindy in week 2
    const kindyPattern = [
      true, true, false, false, false,   // week 1
      false, false, true, false, false,   // week 2
    ]
    const days = createDefaultDays(defaults, kindyPattern)

    expect(days).toHaveLength(10)
    // Week 1
    expect(days[0].hasKindy).toBe(true)   // Mon
    expect(days[1].hasKindy).toBe(true)   // Tue
    expect(days[2].hasKindy).toBe(false)  // Wed
    expect(days[3].hasKindy).toBe(false)  // Thu
    expect(days[4].hasKindy).toBe(false)  // Fri
    // Week 2
    expect(days[5].hasKindy).toBe(false)  // Mon
    expect(days[6].hasKindy).toBe(false)  // Tue
    expect(days[7].hasKindy).toBe(true)   // Wed
    expect(days[8].hasKindy).toBe(false)  // Thu
    expect(days[9].hasKindy).toBe(false)  // Fri
  })

  it('defaults hasKindy to false when kindyPattern is shorter than days', () => {
    // Pattern only covers 3 entries, rest should default to false
    const kindyPattern = [true, false, true]
    const days = createDefaultDays(defaults, kindyPattern, 2)

    expect(days).toHaveLength(10)
    expect(days[0].hasKindy).toBe(true)
    expect(days[1].hasKindy).toBe(false)
    expect(days[2].hasKindy).toBe(true)
    // Beyond pattern length, falls back to false
    expect(days[3].hasKindy).toBe(false)
    expect(days[9].hasKindy).toBe(false)
  })
})

describe('FortnightlyGrid uniform sessions', () => {
  it('opens the per-day editor when sessions are not uniform', () => {
    render(<FortnightlyGrid days={oneBookedWeek()} onChange={() => {}} results={null} fundingLabel="CCS" fmt={fmt} />)
    fireEvent.click(screen.getByText('Mon').closest('button')!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('locks per-day editing when uniform and there is no per-day setting', () => {
    render(<FortnightlyGrid days={oneBookedWeek()} onChange={() => {}} results={null} fundingLabel="CCS" fmt={fmt} uniformSessions />)
    const row = screen.getByText('Mon').closest('button')!
    expect(row).toBeDisabled()
    fireEvent.click(row)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the editor for the kindy toggle but hides fee/times when uniform', () => {
    render(
      <FortnightlyGrid
        days={oneBookedWeek()}
        onChange={() => {}}
        results={null}
        fundingLabel="Free Kindy"
        fmt={fmt}
        kindyToggle={{ label: 'Kindy' }}
        uniformSessions
      />,
    )
    fireEvent.click(screen.getByText('Mon').closest('button')!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByLabelText('Session Fee')).not.toBeInTheDocument()
    expect(screen.getByText('Kindy day')).toBeInTheDocument()
  })
})
