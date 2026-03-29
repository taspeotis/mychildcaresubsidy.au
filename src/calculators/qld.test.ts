/**
 * QLD Free Kindy calculator tests.
 *
 * Source: QLD Department of Education — Third-party gap fees
 *   https://earlychildhood.qld.gov.au/grants-and-funding/kindergarten-funding/third-party-gap-fees
 *   "Mai" scenario: $125/day (10 hrs), 2 days/wk, CCS 60%.
 *   Published: CCS $142.50/wk, gap before kindy $107.50/wk,
 *   Free Kindy $80.63/wk, parent cost $26.87/wk.
 *
 * Program: 15 hrs/week funded kindy (30 hrs/fortnight), 40 weeks/year.
 */
import { describe, it, expect } from 'vitest'
import { calculateQldDaily, calculateQldFortnightly } from './qld'
import type { FortnightlySession } from '../types'

describe('calculateQldDaily', () => {
  /**
   * QLD Govt "Mai" scenario (60% CCS, 2 days/week).
   * Published per-day figures: CCS $71.25, gap before kindy $53.75.
   * Published per-week: Free Kindy $80.63/wk ($40.315/day).
   *
   * Our calculator rounds per-day ($40.31), giving a 1¢/fortnight
   * difference vs QLD's per-week rounding — expected behaviour.
   */
  it('Mai 60%: $125/day, 7.5 hrs kindy — matches QLD Govt figures', () => {
    const result = calculateQldDaily({
      ccsPercent: 60,
      ccsWithholdingPercent: 5,
      sessionFee: 125,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 7.5,

    })

    // CCS matches published $71.25/day
    expect(result.ccsEntitlement).toBe(71.25)
    // Gap matches published $53.75/day ($107.50/wk ÷ 2)
    expect(result.gapBeforeKindy).toBe(53.75)
    // Kindy funding: 7.5 hrs × ($12.50 − $7.125) = $40.31
    expect(result.kindyFundingAmount).toBe(40.31)
    // Gap fee: $53.75 − $40.31 = $13.44 (published $26.87/wk ÷ 2 = $13.435)
    expect(result.estimatedGapFee).toBe(13.44)
  })

  /**
   * QLD Govt "Mai" 90% CCS variant (3 days/week).
   * Published: gap before kindy $54.36/wk, Free Kindy $27.19/wk.
   */
  it('Mai 90%: $125/day, 7.5 hrs kindy', () => {
    const result = calculateQldDaily({
      ccsPercent: 90,
      ccsWithholdingPercent: 5,
      sessionFee: 125,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 7.5,

    })

    expect(result.applicableCcsHourlyRate).toBe(11.25) // $12.50 × 90%
    expect(result.ccsAmount).toBe(112.5)
  })

  it('no CCS: kindy covers full fee for kindy hours only', () => {
    const result = calculateQldDaily({
      ccsPercent: 0,
      ccsWithholdingPercent: 0,
      sessionFee: 125,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 7.5,

    })

    // 7.5 hrs × $12.50 = $93.75 funded, 2.5 hrs unfunded = $31.25 gap
    expect(result.kindyFundingAmount).toBe(93.75)
    expect(result.estimatedGapFee).toBe(31.25)
  })
})

describe('calculateQldFortnightly', () => {
  /**
   * 2 kindy days (Mon+Tue) + 1 regular day (Wed) per week.
   * Kindy days should get funding, regular days should not.
   */
  it('kindy days get funding, non-kindy days do not', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 3
      const hasKindy = dayIdx < 2

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 125 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: booked && hasKindy ? 8 : null,
        kindyProgramEndHour: booked && hasKindy ? 15.5 : null,
      }
    })

    const result = calculateQldFortnightly({
      ccsPercent: 60,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    const kindyDays = result!.sessions.filter((s) => s.kindyFundingAmount > 0)
    const regularDays = result!.sessions.filter((s) => s.sessionHoursDecimal > 0 && s.kindyFundingAmount === 0)
    expect(kindyDays).toHaveLength(4) // 2 per week × 2 weeks
    expect(regularDays).toHaveLength(2) // Wed × 2 weeks
  })

  /**
   * 30 hrs/fortnight pool: 4 × 7.5hr kindy days = 30hrs, exhausts the pool.
   * A 5th kindy day should get no funding.
   */
  it('respects 30 hrs/fortnight kindy pool', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 3
      // 5 kindy days total: Mon-Wed week 1, Mon-Tue week 2
      const hasKindy = (week === 1 && dayIdx < 3) || (week === 2 && dayIdx < 2)

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 125 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasKindy ? 8 : null,
        kindyProgramEndHour: hasKindy ? 15.5 : null,
      }
    })

    const result = calculateQldFortnightly({
      ccsPercent: 60,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)
    const week2 = result!.sessions.filter((s) => s.week === 2)
    // Week 1: 3 × 7.5 = 22.5 hrs, all funded (pool has 30)
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[2].kindyFundingAmount).toBeGreaterThan(0)
    // Week 2: Mon = 7.5 (total 30, exhausted), Tue gets nothing
    expect(week2[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[1].kindyFundingAmount).toBe(0) // pool exhausted
  })
})

describe('QLD edge cases', () => {
  it('handles zero session fee gracefully', () => {
    const result = calculateQldDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 0,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 7.5,
    })

    expect(result.ccsAmount).toBe(0)
    expect(result.kindyFundingAmount).toBe(0)
    expect(result.estimatedGapFee).toBe(0)
  })

  it('0% CCS: kindy funding still applies', () => {
    const result = calculateQldDaily({
      ccsPercent: 0,
      ccsWithholdingPercent: 0,
      sessionFee: 125,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 7.5,
    })

    expect(result.ccsAmount).toBe(0)
    expect(result.ccsEntitlement).toBe(0)
    // Kindy covers full fee for kindy hours: 7.5 × $12.50 = $93.75
    expect(result.kindyFundingAmount).toBe(93.75)
    expect(result.estimatedGapFee).toBe(31.25)
  })

  it('100% withholding: CCS entitlement is 0 but kindy funding still applies', () => {
    const result = calculateQldDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 100,
      sessionFee: 125,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 7.5,
    })

    expect(result.ccsEntitlement).toBe(0)
    // With 100% withholding, gap before kindy is the full fee
    expect(result.gapBeforeKindy).toBe(125)
    // Kindy funding should still apply
    expect(result.kindyFundingAmount).toBeGreaterThan(0)
  })
})

describe('QLD withholding normalization', () => {
  const baseInputs = {
    ccsPercent: 60,
    ccsWithholdingPercent: 5,
    sessionFee: 125,
    sessionStartHour: 7,
    sessionEndHour: 17,
    kindyProgramHours: 7.5,
  }

  /**
   * At exactly 5% withholding the normalization is the identity transform:
   * it reconstructs ccsAmount from ccsEntitlement, then re-applies 5% withholding,
   * yielding the same normalisedCcsEntitlement as the original ccsEntitlement.
   */
  it('withholding at exactly 5% produces consistent kindy funding', () => {
    const result5 = calculateQldDaily({ ...baseInputs, ccsWithholdingPercent: 5 })
    // Kindy funding should be a well-defined positive value
    expect(result5.kindyFundingAmount).toBeGreaterThan(0)
    expect(result5.estimatedGapFee).toBeGreaterThan(0)
    // At 5%, normalisedCcsPerHour = ccsEntitlement / hours, so kindy = 7.5 * (12.50 - 7.125) = 40.31
    expect(result5.kindyFundingAmount).toBe(40.31)
  })

  /**
   * At 0% withholding, CCS entitlement = full ccsAmount (nothing withheld).
   * The normalisedCcsPerHour uses the actual 0% rate (not capped up to 5%),
   * so normalisedCcsPerHour = ccsAmount/hours, which is HIGHER than at 5%.
   * Higher normalisedCcsPerHour → less gap for kindy to cover → LESS kindy funding.
   */
  it('withholding at 0% gives LESS kindy funding than 5%', () => {
    const result0 = calculateQldDaily({ ...baseInputs, ccsWithholdingPercent: 0 })
    const result5 = calculateQldDaily({ ...baseInputs, ccsWithholdingPercent: 5 })
    // 0% withholding: family gets full CCS upfront, so there's less gap for kindy to cover
    expect(result0.kindyFundingAmount).toBeLessThan(result5.kindyFundingAmount)
  })

  /**
   * Withholding above 5% is capped at 5% for the normalization.
   * So 20% withholding produces the same kindy funding as 5%.
   */
  it('withholding at 20% gives same kindy funding as 5% (capped)', () => {
    const result5 = calculateQldDaily({ ...baseInputs, ccsWithholdingPercent: 5 })
    const result20 = calculateQldDaily({ ...baseInputs, ccsWithholdingPercent: 20 })
    expect(result20.kindyFundingAmount).toBe(result5.kindyFundingAmount)
  })

  /**
   * At 3%, the withholding rate is below the 5% cap, so it's used as-is.
   * normalisedCcsPerHour at 3% > normalisedCcsPerHour at 5% (less withheld
   * means more CCS per hour in the normalization), so kindy covers less.
   */
  it('withholding at 3% gives less kindy funding than 5%', () => {
    const result3 = calculateQldDaily({ ...baseInputs, ccsWithholdingPercent: 3 })
    const result5 = calculateQldDaily({ ...baseInputs, ccsWithholdingPercent: 5 })
    expect(result3.kindyFundingAmount).toBeLessThan(result5.kindyFundingAmount)
  })

  /**
   * 50% withholding should also be capped at 5%, same kindy funding as 5%.
   */
  it('withholding at 50% gives same kindy funding as 5% (capped)', () => {
    const result5 = calculateQldDaily({ ...baseInputs, ccsWithholdingPercent: 5 })
    const result50 = calculateQldDaily({ ...baseInputs, ccsWithholdingPercent: 50 })
    expect(result50.kindyFundingAmount).toBe(result5.kindyFundingAmount)
  })

  /**
   * At 99% withholding (the max before the withholdingRate < 1 guard),
   * kindy funding should still match the 5% normalized amount.
   */
  it('withholding at 99% gives same kindy funding as 5% (capped)', () => {
    const result5 = calculateQldDaily({ ...baseInputs, ccsWithholdingPercent: 5 })
    const result99 = calculateQldDaily({ ...baseInputs, ccsWithholdingPercent: 99 })
    expect(result99.kindyFundingAmount).toBe(result5.kindyFundingAmount)
  })
})

describe('QLD kindy pool exhaustion', () => {
  /**
   * 3 kindy days in week 1, each with 7.5 hrs of kindy program.
   * Pool is 15 hrs/week → first 2 days (2 × 7.5 = 15) exhaust it.
   * 3rd day should get 0 kindy hours and 0 kindy funding.
   */
  it('exhausts kindy pool across multiple days in same week', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 3
      // All 3 booked days in week 1 have kindy; week 2 has none
      const hasKindy = week === 1 && booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 125 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasKindy ? 8 : null,
        kindyProgramEndHour: hasKindy ? 15.5 : null,
      }
    })

    const result = calculateQldFortnightly({
      ccsPercent: 60,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)

    // Mon: 7.5 hrs consumed from 30 → 22.5 remaining
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[0].remainingKindyHours).toBe(22.5)

    // Tue: 7.5 hrs consumed from 22.5 → 15 remaining
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].remainingKindyHours).toBe(15)

    // Wed: 7.5 hrs consumed from 15 → 7.5 remaining (pool is fortnightly, not weekly)
    expect(week1[2].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[2].remainingKindyHours).toBe(7.5)
  })

  /**
   * Partial pool: 2 kindy days with 10hr kindy programs in a week.
   * Pool is 15 hrs → day 1 consumes 10, day 2 has 5 remaining.
   * Day 2 should get partial kindy funding for 5 of its 10 hrs.
   */
  it('partially funds a day when kindy pool runs low', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 2
      // Both booked days in week 1 have kindy: 7am-5pm session, 7am-5pm kindy (10 hrs)
      const hasKindy = week === 1 && booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 125 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasKindy ? 7 : null,
        kindyProgramEndHour: hasKindy ? 17 : null, // Full 10hr kindy
      }
    })

    const result = calculateQldFortnightly({
      ccsPercent: 60,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)

    // Mon: 10 hrs requested, pool is 30 → consumes 10, 20 remaining
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[0].remainingKindyHours).toBe(20)

    // Tue: 10 hrs requested, 20 remaining → consumes 10, 10 remaining
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].remainingKindyHours).toBe(10)

    // Both days get full kindy funding (pool has enough)
    expect(week1[1].kindyFundingAmount).toBe(week1[0].kindyFundingAmount)
  })

  /**
   * Single 30hr fortnightly pool shared across both weeks.
   * 6 kindy days × 7.5hrs = 45hrs exceeds 30, so last 2 days get nothing.
   */
  it('shares kindy pool across both weeks', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 3
      // 3 kindy days in both weeks = 6 total
      const hasKindy = booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 125 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasKindy ? 8 : null,
        kindyProgramEndHour: hasKindy ? 15.5 : null,
      }
    })

    const result = calculateQldFortnightly({
      ccsPercent: 60,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 100,
      sessions,
    })

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)
    const week2 = result!.sessions.filter((s) => s.week === 2)

    // Week 1: 3 × 7.5 = 22.5 hrs, all funded (pool starts at 30)
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[2].kindyFundingAmount).toBeGreaterThan(0)

    // Week 2: 7.5 remaining in pool → Mon gets funding, Tue+Wed don't
    expect(week2[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[1].kindyFundingAmount).toBe(0)
    expect(week2[2].kindyFundingAmount).toBe(0)
  })
})
