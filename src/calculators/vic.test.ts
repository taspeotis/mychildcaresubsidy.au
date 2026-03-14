/**
 * VIC Free Kinder calculator tests.
 *
 * Sources:
 *   - vic.gov.au — Free Kinder
 *     https://www.vic.gov.au/free-kinder
 *     Official example: $360/wk fee (3 days), $252/wk CCS,
 *     $2,101/yr offset over 40 weeks → $52.53/wk → family pays $55.47/wk.
 *
 *   - vic.gov.au — Kindergarten funding rates
 *     https://www.vic.gov.au/kindergarten-funding-rates
 *     2026 LDC: standard $2,101, priority $2,693.
 *     Pro-rated by enrolled hours relative to 15 hrs/wk.
 */
import { describe, it, expect } from 'vitest'
import { calculateVicDaily, calculateVicFortnightlySessions } from './vic'

describe('calculateVicDaily', () => {
  /**
   * vic.gov.au official example:
   * $360/wk (3 days at $120), $252 CCS, offset $2,101/yr over 40 weeks.
   * Published: $52.53/wk offset, family pays $55.47/wk.
   */
  it('vic.gov.au example: standard 15 hrs/wk, 3 days — $52.53/wk offset', () => {
    const result = calculateVicDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 120,
      sessionStartHour: 7,
      sessionEndHour: 17,
      cohort: 'standard',
      kinderHoursPerWeek: 15,
      daysPerWeek: 3,
    })

    // $2,101 ÷ 40 = $52.53 (matches published figure)
    expect(result.weeklyOffset).toBe(52.53)
    expect(result.dailyOffset).toBe(17.51) // $52.53 ÷ 3
  })

  /**
   * Priority cohort: $2,693/yr.
   * Source: vic.gov.au — Kindergarten funding rates
   */
  it('priority cohort: $2,693/yr → $67.33/wk offset', () => {
    const result = calculateVicDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 120,
      sessionStartHour: 7,
      sessionEndHour: 17,
      cohort: 'priority',
      kinderHoursPerWeek: 15,
      daysPerWeek: 3,
    })

    // $2,693 ÷ 40 = $67.33
    expect(result.weeklyOffset).toBe(67.33)
    expect(result.dailyOffset).toBe(22.44)
  })

  /**
   * Pro-rata by kinder hours: 7.5 hrs/wk = half offset.
   * Source: vic.gov.au — "offset adjusted proportionally"
   */
  it('pro-rata: 7.5 hrs/wk → half offset ($26.26/wk)', () => {
    const result = calculateVicDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 120,
      sessionStartHour: 7,
      sessionEndHour: 17,
      cohort: 'standard',
      kinderHoursPerWeek: 7.5,
      daysPerWeek: 3,
    })

    // $2,101 × (7.5/15) = $1,050.50/yr ÷ 40 = $26.26/wk
    expect(result.annualOffset).toBe(1050.5)
    expect(result.weeklyOffset).toBe(26.26)
  })

  it('offset capped at gap (no negative gap fee)', () => {
    const result = calculateVicDaily({
      ccsPercent: 90,
      ccsWithholdingPercent: 5,
      sessionFee: 50,
      sessionStartHour: 8,
      sessionEndHour: 13,
      cohort: 'standard',
      kinderHoursPerWeek: 15,
      daysPerWeek: 2,
    })

    // Gap ($7.25) < daily offset ($26.27), so offset capped
    expect(result.dailyOffset).toBe(result.gapBeforeFreeKinder)
    expect(result.estimatedGapFee).toBe(0)
  })
})

describe('calculateVicFortnightlySessions', () => {
  it('applies offset per booked day across the fortnight', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      booked: i % 5 < 3,
      sessionFee: i % 5 < 3 ? 120 : 0,
      sessionStartHour: 7,
      sessionEndHour: 17,
    }))

    const result = calculateVicFortnightlySessions({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      cohort: 'standard',
      kinderHoursPerWeek: 15,
      sessions,
    })

    expect(result).not.toBeNull()
    // $52.53/wk ÷ 3 = $17.51/day
    const booked = result!.sessions.filter((s) => s.ccsEntitlement > 0)
    booked.forEach((s) => expect(s.freeKinder).toBe(17.51))
  })
})

describe('VIC edge cases', () => {
  it('handles zero session fee gracefully', () => {
    const result = calculateVicDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 0,
      sessionStartHour: 7,
      sessionEndHour: 17,
      cohort: 'standard',
      kinderHoursPerWeek: 15,
      daysPerWeek: 3,
    })

    expect(result.ccsEntitlement).toBe(0)
    // Gap is zero, offset is capped at zero
    expect(result.estimatedGapFee).toBe(0)
  })

  it('0% CCS: Free Kinder offset still applies', () => {
    const result = calculateVicDaily({
      ccsPercent: 0,
      ccsWithholdingPercent: 0,
      sessionFee: 120,
      sessionStartHour: 7,
      sessionEndHour: 17,
      cohort: 'standard',
      kinderHoursPerWeek: 15,
      daysPerWeek: 3,
    })

    expect(result.ccsEntitlement).toBe(0)
    // $2,101 / 40 = $52.53/wk
    expect(result.weeklyOffset).toBe(52.53)
    // Offset still reduces the gap
    expect(result.estimatedGapFee).toBeLessThan(120)
  })

  it('100% withholding: Free Kinder offset still applies', () => {
    const result = calculateVicDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 100,
      sessionFee: 120,
      sessionStartHour: 7,
      sessionEndHour: 17,
      cohort: 'standard',
      kinderHoursPerWeek: 15,
      daysPerWeek: 3,
    })

    expect(result.ccsEntitlement).toBe(0)
    // Gap before kinder is the full session fee
    expect(result.gapBeforeFreeKinder).toBe(120)
    // Offset still reduces the gap
    expect(result.estimatedGapFee).toBeLessThan(120)
  })
})

describe('VIC offset independence from CCS', () => {
  const baseInputs = {
    ccsPercent: 85,
    ccsWithholdingPercent: 5,
    sessionFee: 120,
    sessionStartHour: 7,
    sessionEndHour: 17,
    cohort: 'standard' as const,
    kinderHoursPerWeek: 15,
    daysPerWeek: 3,
  }

  /**
   * VIC Free Kinder offset is a flat annual amount pro-rated by kinder hours,
   * divided by 40 weeks and days per week. It should not change with CCS.
   */
  it('annual offset and weekly offset are independent of CCS percentage', () => {
    const result85 = calculateVicDaily({ ...baseInputs, ccsPercent: 85 })
    const result50 = calculateVicDaily({ ...baseInputs, ccsPercent: 50 })
    const result0 = calculateVicDaily({ ...baseInputs, ccsPercent: 0 })

    expect(result85.annualOffset).toBe(result50.annualOffset)
    expect(result50.annualOffset).toBe(result0.annualOffset)
    expect(result85.weeklyOffset).toBe(result50.weeklyOffset)
    expect(result50.weeklyOffset).toBe(result0.weeklyOffset)
  })

  /**
   * The APPLIED daily offset might differ because it's capped at the gap.
   * With high CCS, the gap is small so the offset is capped lower.
   */
  it('applied offset is capped at gap — lower CCS means more offset applied', () => {
    const result90 = calculateVicDaily({ ...baseInputs, ccsPercent: 90 })
    const result50 = calculateVicDaily({ ...baseInputs, ccsPercent: 50 })

    // Calculated offset is the same
    expect(result90.annualOffset).toBe(result50.annualOffset)

    // With 50% CCS, gap is larger so more offset can be applied
    expect(result50.dailyOffset).toBeGreaterThanOrEqual(result90.dailyOffset)
  })

  /**
   * Offset should also be independent of withholding.
   */
  it('annual and weekly offset are independent of withholding', () => {
    const result5 = calculateVicDaily({ ...baseInputs, ccsWithholdingPercent: 5 })
    const result20 = calculateVicDaily({ ...baseInputs, ccsWithholdingPercent: 20 })

    expect(result5.annualOffset).toBe(result20.annualOffset)
    expect(result5.weeklyOffset).toBe(result20.weeklyOffset)
  })

  /**
   * Priority cohort offset is also independent of CCS.
   */
  it('priority cohort offset is independent of CCS percentage', () => {
    const priorityInputs = { ...baseInputs, cohort: 'priority' as const }
    const result85 = calculateVicDaily({ ...priorityInputs, ccsPercent: 85 })
    const result0 = calculateVicDaily({ ...priorityInputs, ccsPercent: 0 })

    expect(result85.annualOffset).toBe(result0.annualOffset)
    expect(result85.weeklyOffset).toBe(result0.weeklyOffset)
  })
})
