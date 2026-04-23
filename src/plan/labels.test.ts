import { describe, it, expect } from 'vitest'
import { formatEntryLabel } from './labels'
import type { PlanEntry } from './types'

function baseEntry(overrides: Partial<PlanEntry> = {}): PlanEntry {
  return {
    id: 'x',
    createdAt: 0,
    scheme: 'ccs',
    mode: 'fortnightly',
    childName: '',
    serviceName: '',
    shared: {
      ccsPercent: '85.00',
      withholding: '5',
      ccsHours: '72',
      sessionFee: '150.00',
      sessionStart: 6,
      sessionEnd: 18,
      daysPerWeek: '3',
      debtRecovery: '0.00',
      debtRecoveryMode: 'percent',
    },
    local: { careType: 'centre-based', schoolAge: false, weeklyDays: [], days: [] },
    ...overrides,
  } as PlanEntry
}

describe('formatEntryLabel', () => {
  it('returns "Name at Service" when both present', () => {
    const entry = baseEntry({ childName: 'Olivia', serviceName: 'Little Acorns' })
    expect(formatEntryLabel(entry, 1)).toBe('Olivia at Little Acorns')
  })

  it('returns just the name when service missing', () => {
    const entry = baseEntry({ childName: 'Olivia', serviceName: '' })
    expect(formatEntryLabel(entry, 1)).toBe('Olivia')
  })

  it('falls back to "Child N" when name missing', () => {
    const entry = baseEntry({ childName: '', serviceName: 'Little Acorns' })
    expect(formatEntryLabel(entry, 2)).toBe('Child 2 at Little Acorns')
  })

  it('returns "Child N" when both missing', () => {
    const entry = baseEntry({ childName: '', serviceName: '' })
    expect(formatEntryLabel(entry, 3)).toBe('Child 3')
  })

  it('trims whitespace from names', () => {
    const entry = baseEntry({ childName: '  Olivia  ', serviceName: '  Little Acorns  ' })
    expect(formatEntryLabel(entry, 1)).toBe('Olivia at Little Acorns')
  })

  it('treats whitespace-only names as missing', () => {
    const entry = baseEntry({ childName: '   ', serviceName: '   ' })
    expect(formatEntryLabel(entry, 4)).toBe('Child 4')
  })
})
