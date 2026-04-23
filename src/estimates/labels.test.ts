import { describe, it, expect } from 'vitest'
import { formatEstimateLabel } from './labels'
import type { Estimate } from './types'

function baseEstimate(overrides: Partial<Estimate> = {}): Estimate {
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
  } as Estimate
}

describe('formatEstimateLabel', () => {
  it('returns "Name at Service" when both present', () => {
    const estimate = baseEstimate({ childName: 'Olivia', serviceName: 'Little Acorns' })
    expect(formatEstimateLabel(estimate, 1)).toBe('Olivia at Little Acorns')
  })

  it('returns just the name when service missing', () => {
    const estimate = baseEstimate({ childName: 'Olivia', serviceName: '' })
    expect(formatEstimateLabel(estimate, 1)).toBe('Olivia')
  })

  it('falls back to "Child N" when name missing', () => {
    const estimate = baseEstimate({ childName: '', serviceName: 'Little Acorns' })
    expect(formatEstimateLabel(estimate, 2)).toBe('Child 2 at Little Acorns')
  })

  it('returns "Child N" when both missing', () => {
    const estimate = baseEstimate({ childName: '', serviceName: '' })
    expect(formatEstimateLabel(estimate, 3)).toBe('Child 3')
  })

  it('trims whitespace from names', () => {
    const estimate = baseEstimate({ childName: '  Olivia  ', serviceName: '  Little Acorns  ' })
    expect(formatEstimateLabel(estimate, 1)).toBe('Olivia at Little Acorns')
  })

  it('treats whitespace-only names as missing', () => {
    const estimate = baseEstimate({ childName: '   ', serviceName: '   ' })
    expect(formatEstimateLabel(estimate, 4)).toBe('Child 4')
  })
})
