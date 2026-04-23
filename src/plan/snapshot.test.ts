import { describe, it, expect } from 'vitest'
import { calculateEntry } from './snapshot'
import type { PlanEntry, SharedSnapshot } from './types'
import type { DayConfig } from '../components/FortnightlyGrid'

function baseShared(overrides: Partial<SharedSnapshot> = {}): SharedSnapshot {
  return {
    ccsPercent: '85.00',
    withholding: '5',
    ccsHours: '72',
    sessionFee: '150.00',
    sessionStart: 6,
    sessionEnd: 18,
    daysPerWeek: '3',
    debtRecovery: '0.00',
    debtRecoveryMode: 'percent',
    ...overrides,
  }
}

function bookedDay(overrides: Partial<DayConfig> = {}): DayConfig {
  return {
    booked: true,
    sessionFee: '150.00',
    sessionStart: 6,
    sessionEnd: 18,
    hasKindy: false,
    ...overrides,
  }
}

function emptyDay(): DayConfig {
  return {
    booked: false,
    sessionFee: '150.00',
    sessionStart: 6,
    sessionEnd: 18,
    hasKindy: false,
  }
}

function fortnightDays(pattern: boolean[], hasKindyPattern?: boolean[]): DayConfig[] {
  return pattern.map((booked, i) =>
    booked
      ? bookedDay({ hasKindy: hasKindyPattern?.[i] ?? false })
      : emptyDay(),
  )
}

describe('calculateEntry', () => {
  it('calculates CCS daily', () => {
    const entry: PlanEntry = {
      id: 'x',
      createdAt: 0,
      scheme: 'ccs',
      mode: 'daily',
      childName: '',
      serviceName: '',
      shared: baseShared(),
      local: { careType: 'centre-based', schoolAge: false, weeklyDays: [], days: [] },
    }
    const result = calculateEntry(entry)
    expect(result).not.toBeNull()
    expect(result!.sessionFees).toBe(150)
    expect(result!.ccsEntitlement).toBeGreaterThan(0)
    expect(result!.gap).toBeGreaterThan(0)
    expect(result!.stateFunding).toBe(0)
  })

  it('returns null for CCS daily with zero fee', () => {
    const entry: PlanEntry = {
      id: 'x',
      createdAt: 0,
      scheme: 'ccs',
      mode: 'daily',
      childName: '',
      serviceName: '',
      shared: baseShared({ sessionFee: '0' }),
      local: { careType: 'centre-based', schoolAge: false, weeklyDays: [], days: [] },
    }
    expect(calculateEntry(entry)).toBeNull()
  })

  it('calculates CCS fortnightly with booked days', () => {
    const booked = fortnightDays([true, true, true, false, false, true, true, true, false, false])
    const entry: PlanEntry = {
      id: 'x',
      createdAt: 0,
      scheme: 'ccs',
      mode: 'fortnightly',
      childName: '',
      serviceName: '',
      shared: baseShared(),
      local: { careType: 'centre-based', schoolAge: false, weeklyDays: [], days: booked },
    }
    const result = calculateEntry(entry)
    expect(result).not.toBeNull()
    expect(result!.sessionFees).toBe(900) // 6 days × $150
    expect(result!.ccsEntitlement).toBeGreaterThan(0)
    expect(result!.stateFunding).toBe(0)
  })

  it('returns null for CCS fortnightly with no booked days', () => {
    const entry: PlanEntry = {
      id: 'x',
      createdAt: 0,
      scheme: 'ccs',
      mode: 'fortnightly',
      childName: '',
      serviceName: '',
      shared: baseShared(),
      local: { careType: 'centre-based', schoolAge: false, weeklyDays: [], days: fortnightDays(Array(10).fill(false)) },
    }
    expect(calculateEntry(entry)).toBeNull()
  })

  it('calculates QLD fortnightly with kindy days and returns state funding', () => {
    // 2 kindy days per week × 2 weeks = 4 kindy days
    const booked = fortnightDays(
      [true, true, false, false, false, true, true, false, false, false],
      [true, true, false, false, false, true, true, false, false, false],
    )
    const entry: PlanEntry = {
      id: 'x',
      createdAt: 0,
      scheme: 'qld',
      mode: 'fortnightly',
      childName: '',
      serviceName: '',
      shared: baseShared(),
      local: {
        kindyHours: '7.5',
        kindyStart: 8,
        fnKindyHours: '7.5',
        fnKindyStart: 8,
        weeklyDays: [],
        days: booked,
      },
    }
    const result = calculateEntry(entry)
    expect(result).not.toBeNull()
    expect(result!.stateFunding).toBeGreaterThan(0)
    expect(result!.gap).toBeLessThan(result!.sessionFees)
  })

  it('calculates NSW daily with state fee relief', () => {
    const entry: PlanEntry = {
      id: 'x',
      createdAt: 0,
      scheme: 'nsw',
      mode: 'daily',
      childName: '',
      serviceName: '',
      shared: baseShared(),
      local: { ageGroup: '4+', feeReliefTier: 'standard', serviceWeeks: '50', weeklyDays: [], days: [] },
    }
    const result = calculateEntry(entry)
    expect(result).not.toBeNull()
    expect(result!.stateFunding).toBeGreaterThan(0)
  })

  it('calculates ACT fortnightly with preschool days', () => {
    const booked = fortnightDays(
      [true, false, false, false, false, true, false, false, false, false],
      [true, false, false, false, false, true, false, false, false, false],
    )
    const entry: PlanEntry = {
      id: 'x',
      createdAt: 0,
      scheme: 'act',
      mode: 'fortnightly',
      childName: '',
      serviceName: '',
      shared: baseShared(),
      local: {
        preschoolHours: '6',
        preschoolStart: 8.5,
        fnPreschoolHours: '6',
        fnPreschoolStart: 8.5,
        weeklyDays: [],
        days: booked,
      },
    }
    const result = calculateEntry(entry)
    expect(result).not.toBeNull()
    expect(result!.stateFunding).toBeGreaterThan(0)
  })

  it('calculates VIC daily with offset', () => {
    const entry: PlanEntry = {
      id: 'x',
      createdAt: 0,
      scheme: 'vic',
      mode: 'daily',
      childName: '',
      serviceName: '',
      shared: baseShared(),
      local: { kinderHours: '15', cohort: 'standard', weeklyDays: [], days: [] },
    }
    const result = calculateEntry(entry)
    expect(result).not.toBeNull()
    expect(result!.stateFunding).toBeGreaterThan(0)
  })

  it('applies debt recovery to the gap fee', () => {
    const booked = fortnightDays([true, true, true, false, false, true, true, true, false, false])
    const withoutDebt: PlanEntry = {
      id: 'x',
      createdAt: 0,
      scheme: 'ccs',
      mode: 'fortnightly',
      childName: '',
      serviceName: '',
      shared: baseShared(),
      local: { careType: 'centre-based', schoolAge: false, weeklyDays: [], days: booked },
    }
    const withDebt: PlanEntry = {
      ...withoutDebt,
      shared: baseShared({ debtRecovery: '10', debtRecoveryMode: 'percent' }),
    }
    const a = calculateEntry(withoutDebt)!
    const b = calculateEntry(withDebt)!
    expect(b.gap).toBeGreaterThan(a.gap)
    expect(b.debtRecovery).toBeGreaterThan(0)
    expect(a.debtRecovery).toBe(0)
  })
})
