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
