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
   * Per-week allocation: week 1 demands 22.5hrs (3 × 7.5) but gets 15hrs max.
   * Week 2 demands 15hrs (2 × 7.5) and gets 15hrs.
   * Week 1's 3rd kindy day goes unfunded, week 2's 2 days are fully funded.
   */
  it('respects 15 hrs/week allocation', () => {
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
    // Week 1: gets 15hrs allocation. Mon+Tue funded (15hrs), Wed unfunded
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[2].kindyFundingAmount).toBe(0) // 15hr/week cap
    // Week 2: gets 15hrs allocation. Mon+Tue both funded
    expect(week2[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[1].kindyFundingAmount).toBeGreaterThan(0)
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

describe('QLD 30hr fortnightly pool splits', () => {
  /**
   * 12/18 split: week 1 has 2 kindy days × 6hrs (12hrs),
   * week 2 has 3 kindy days × 6hrs (18hrs). Total 30hrs. All days funded.
   */
  it('12/18 split: 2 kindy days week 1, 3 kindy days week 2 — all funded', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const bookedWeek1 = dayIdx < 2
      const bookedWeek2 = dayIdx < 3
      const booked = week === 1 ? bookedWeek1 : bookedWeek2
      const hasKindy = booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 120 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasKindy ? 8 : null,
        kindyProgramEndHour: hasKindy ? 14 : null,
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

    // Week 1: allocation 12hrs. 2 × 6 = 12 consumed (0 remaining)
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].remainingKindyHours).toBe(0)

    // Week 2: allocation 18hrs. 3 × 6 = 18 consumed (0 remaining)
    expect(week2[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[2].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[2].remainingKindyHours).toBe(0)
  })

  /**
   * 18/12 split: week 1 has 3 kindy days × 6hrs (18hrs),
   * week 2 has 2 kindy days × 6hrs (12hrs). Total 30hrs. All funded.
   */
  it('18/12 split: 3 kindy days week 1, 2 kindy days week 2 — all funded', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const bookedWeek1 = dayIdx < 3
      const bookedWeek2 = dayIdx < 2
      const booked = week === 1 ? bookedWeek1 : bookedWeek2
      const hasKindy = booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 120 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasKindy ? 8 : null,
        kindyProgramEndHour: hasKindy ? 14 : null,
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

    // Week 1: allocation 18hrs. 3 × 6 = 18 consumed (0 remaining)
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[2].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[2].remainingKindyHours).toBe(0)

    // Week 2: allocation 12hrs. 2 × 6 = 12 consumed (0 remaining)
    expect(week2[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[1].remainingKindyHours).toBe(0)
  })

  /**
   * 5 kindy days × 7.5hrs in week 1 only = 37.5hrs demand.
   * Capped at 18hrs/week, so only Mon+Tue funded (15hrs) + partial Wed (3hrs).
   */
  it('exceeding 18hr/week cap: 5 × 7.5hrs in one week', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = week === 1
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

    // Week 1 allocation: min(37.5, 18, 30) = 18hrs
    // Mon: 7.5 (18→10.5), Tue: 7.5 (10.5→3), Wed: 3 of 7.5 (3→0)
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[2].kindyFundingAmount).toBeGreaterThan(0) // partial
    expect(week1[2].remainingKindyHours).toBe(0)
    expect(week1[3].kindyFundingAmount).toBe(0) // cap reached
    expect(week1[4].kindyFundingAmount).toBe(0)
  })
})

describe('QLD kindy on any day of the week', () => {
  /**
   * Child attends Thu+Fri with 7.5hr kindy program each day.
   * Should receive full kindy funding — the 30hr pool doesn't care which days.
   */
  it('Thu+Fri kindy: 2 × 7.5hrs/week — fully funded', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx >= 3 // Thu (3) and Fri (4) only
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
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)
    const week2 = result!.sessions.filter((s) => s.week === 2)

    // Thu+Fri each week should all receive kindy funding
    expect(week1[3].kindyFundingAmount).toBeGreaterThan(0) // Thu W1
    expect(week1[4].kindyFundingAmount).toBeGreaterThan(0) // Fri W1
    expect(week2[3].kindyFundingAmount).toBeGreaterThan(0) // Thu W2
    expect(week2[4].kindyFundingAmount).toBeGreaterThan(0) // Fri W2

    // 4 × 7.5 = 30hrs exactly exhausts the pool
    expect(week2[4].remainingKindyHours).toBe(0)

    // Total kindy funding should match the Mon+Tue equivalent
    expect(result!.totalKindyFunding).toBeGreaterThan(0)
  })

  /**
   * Wed+Fri kindy with 7.5hr program — non-consecutive days, 30hrs total.
   */
  it('Wed+Fri kindy: non-consecutive days — fully funded', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx === 2 || dayIdx === 4 // Wed and Fri
      const hasKindy = booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 125 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasKindy ? 8 : null,
        kindyProgramEndHour: hasKindy ? 15.5 : null, // 7.5hr = 15/wk = 30/fn
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

    // Wed and Fri each week should all receive kindy funding
    expect(week1[2].kindyFundingAmount).toBeGreaterThan(0) // Wed W1
    expect(week1[4].kindyFundingAmount).toBeGreaterThan(0) // Fri W1
    expect(week2[2].kindyFundingAmount).toBeGreaterThan(0) // Wed W2
    expect(week2[4].kindyFundingAmount).toBeGreaterThan(0) // Fri W2

    // Each week: 2 × 7.5 = 15hrs, 0 remaining per week
    expect(week1[4].remainingKindyHours).toBe(0)
    expect(week2[4].remainingKindyHours).toBe(0)
  })
})

describe('QLD 6hr kindy partial funding', () => {
  /**
   * 3 × 6hr kindy both weeks = 18/18 demand. Each week gets 15hrs.
   * Day 1: 6hrs funded, Day 2: 6hrs funded, Day 3: 3hrs funded (partial).
   */
  it('3 × 6hr kindy: funded 6, 6, 3 per week', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 3
      const hasKindy = booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 120 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasKindy ? 8 : null,
        kindyProgramEndHour: hasKindy ? 14 : null,
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

    // Each week: 15hr allocation. Mon 6 (15→9), Tue 6 (9→3), Wed 3 of 6 (3→0)
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[2].kindyFundingAmount).toBeGreaterThan(0) // partial
    expect(week1[2].remainingKindyHours).toBe(0)

    // Wed gets less funding than Mon/Tue (3hrs vs 6hrs)
    expect(week1[2].kindyFundingAmount).toBeLessThan(week1[0].kindyFundingAmount)
    // Mon and Tue get equal funding
    expect(week1[0].kindyFundingAmount).toBe(week1[1].kindyFundingAmount)

    // Same pattern in week 2
    expect(week2[0].kindyFundingAmount).toBe(week1[0].kindyFundingAmount)
    expect(week2[2].kindyFundingAmount).toBe(week1[2].kindyFundingAmount)
  })

  /**
   * 4 × 6hr kindy both weeks. Each week gets 15hrs.
   * Days 1-2: 6hrs each, Day 3: 3hrs partial, Day 4: 0.
   */
  it('4 × 6hr kindy: funded 6, 6, 3, 0 per week', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 4
      const hasKindy = booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 120 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasKindy ? 8 : null,
        kindyProgramEndHour: hasKindy ? 14 : null,
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

    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0) // Mon: 6hrs
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0) // Tue: 6hrs
    expect(week1[2].kindyFundingAmount).toBeGreaterThan(0) // Wed: 3hrs partial
    expect(week1[3].kindyFundingAmount).toBe(0) // Thu: pool exhausted
    expect(week1[2].kindyFundingAmount).toBeLessThan(week1[0].kindyFundingAmount)
  })

  /**
   * 5 × 6hr kindy both weeks. Each week gets 15hrs.
   * Days 1-2: 6hrs each, Day 3: 3hrs partial, Days 4-5: 0.
   */
  it('5 × 6hr kindy: funded 6, 6, 3, 0, 0 per week', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: 120,
        sessionStartHour: 7,
        sessionEndHour: 17,
        kindyProgramStartHour: 8,
        kindyProgramEndHour: 14,
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

    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0) // Mon: 6hrs
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0) // Tue: 6hrs
    expect(week1[2].kindyFundingAmount).toBeGreaterThan(0) // Wed: 3hrs partial
    expect(week1[3].kindyFundingAmount).toBe(0) // Thu: 0
    expect(week1[4].kindyFundingAmount).toBe(0) // Fri: 0
  })
})

describe('QLD per-week allocation', () => {
  /**
   * 18/12 split with 7.5hr kindy sessions.
   * Week 1: 3 × 7.5 = 22.5hr demand, capped at 18hrs.
   * Week 2: 2 × 7.5 = 15hr demand, gets 12hrs (30 - 18).
   */
  it('caps week at 18hrs in an uneven 7.5hr split', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const bookedWeek1 = dayIdx < 3
      const bookedWeek2 = dayIdx < 2
      const booked = week === 1 ? bookedWeek1 : bookedWeek2
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
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)

    // Week 1 allocation: min(22.5, 18, 30-15) = 15. (Not 18 because week 2 reserves 15.)
    // Mon: 7.5 (15→7.5), Tue: 7.5 (7.5→0), Wed: 0 (pool exhausted)
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[2].kindyFundingAmount).toBe(0)
  })

  /**
   * Partial funding: 18/12 split with 10hr kindy sessions in week 1.
   * Week 1: 2 × 10 = 20hr demand. Week 2: 2 × 7.5 = 15hr demand. Total 35 ≥ 30.
   * Week 1 allocation: min(20, 18, 30-15) = 15. Mon gets 10, Tue gets 5.
   */
  it('partially funds a day when weekly allocation runs low', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 2
      const hasKindyWeek1 = booked // 10hr kindy in week 1
      const hasKindyWeek2 = booked // 7.5hr kindy in week 2

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 125 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: week === 1 && hasKindyWeek1 ? 7 : week === 2 && hasKindyWeek2 ? 8 : null,
        kindyProgramEndHour: week === 1 && hasKindyWeek1 ? 17 : week === 2 && hasKindyWeek2 ? 15.5 : null,
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

    // Week 1 allocation: min(20, 18, 30-15) = 15
    // Mon: 10hrs from 15 → 5 remaining
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[0].remainingKindyHours).toBe(5)

    // Tue: 10hrs requested, 5 available → partial
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].remainingKindyHours).toBe(0)

    // Tue gets less than Mon (partial funding)
    expect(week1[1].kindyFundingAmount).toBeLessThan(week1[0].kindyFundingAmount)
  })

  /**
   * 3 × 7.5hr kindy both weeks = 45hrs demand.
   * Each week gets 15hrs (symmetric allocation). 2 funded days per week.
   */
  it('identical weeks split pool evenly: 15hrs each', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 3
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

    // Each week: Mon+Tue funded (15hrs), Wed unfunded
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[2].kindyFundingAmount).toBe(0) // 15hr allocation exhausted
    expect(week2[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[2].kindyFundingAmount).toBe(0)
  })

  /**
   * Weekly mode bug reproduction: 5 kindy days × 7.5hrs duplicated.
   * Each week should get 15hrs (2 funded days), NOT 4 funded days in week 1.
   */
  it('weekly mode: 5 kindy days — only 2 funded per week', () => {
    // Simulate weekly mode: identical pattern duplicated
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: 125,
        sessionStartHour: 7,
        sessionEndHour: 17,
        kindyProgramStartHour: 8,
        kindyProgramEndHour: 15.5,
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

    // Each week gets 15hrs allocation: Mon+Tue funded, Wed-Fri unfunded
    const week1Funded = week1.filter((s) => s.kindyFundingAmount > 0)
    const week2Funded = week2.filter((s) => s.kindyFundingAmount > 0)
    expect(week1Funded).toHaveLength(2)
    expect(week2Funded).toHaveLength(2)

    // Total kindy funding uses 30hrs
    expect(result!.totalKindyFunding).toBeGreaterThan(0)
  })

  /**
   * 1d/4d split forbidden: week 1 has 1 × 7.5hr (under 12hr min), gets $0.
   * Week 2 has 4 × 7.5hr, capped at 18hrs.
   */
  it('1d/4d split: week 1 under minimum, week 2 capped at 18hrs', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const bookedWeek1 = dayIdx === 0
      const bookedWeek2 = dayIdx < 4
      const booked = week === 1 ? bookedWeek1 : bookedWeek2
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

    // Week 1: 7.5hrs < 12hr minimum → no funding
    expect(week1[0].kindyFundingAmount).toBe(0)

    // Week 2: 18hr cap. Mon 7.5 + Tue 7.5 + Wed 3 partial = 18hrs. Thu unfunded.
    expect(week2[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[2].kindyFundingAmount).toBeGreaterThan(0) // partial
    expect(week2[3].kindyFundingAmount).toBe(0) // cap exhausted
  })

  /**
   * 6hr/24hr split: week 1 under minimum (6 < 12), week 2 capped at 18.
   */
  it('6/24 split: week 1 under minimum, week 2 capped at 18hrs', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const bookedWeek1 = dayIdx === 0
      const bookedWeek2 = dayIdx < 4
      const booked = week === 1 ? bookedWeek1 : bookedWeek2
      const hasKindy = booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 120 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasKindy ? 8 : null,
        kindyProgramEndHour: hasKindy ? 14 : null,
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

    // Week 1: 6hrs < 12hr minimum → no funding
    expect(week1[0].kindyFundingAmount).toBe(0)

    // Week 2: 18hr cap. 3 × 6 = 18hrs funded, 4th day gets 0
    expect(week2[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[1].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[2].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[3].kindyFundingAmount).toBe(0)
  })
})

describe('QLD minimum hours per week', () => {
  /**
   * Single kindy day per week (7.5hrs) — under the 12hr minimum.
   * No kindy funding should be allocated.
   */
  it('single 7.5hr kindy day per week: no funding', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx === 4 // Friday only
      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 150 : 0,
        sessionStartHour: booked ? 6.5 : 0,
        sessionEndHour: booked ? 18.5 : 0,
        kindyProgramStartHour: booked ? 8 : null,
        kindyProgramEndHour: booked ? 15.5 : null,
      }
    })

    const result = calculateQldFortnightly({
      ccsPercent: 60,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    // No kindy funding at all — under 12hr/week minimum
    expect(result!.totalKindyFunding).toBe(0)
    result!.sessions.forEach((s) => {
      expect(s.kindyFundingAmount).toBe(0)
    })
  })

  /**
   * Single 6hr kindy day per week — also under the 12hr minimum.
   */
  it('single 6hr kindy day per week: no funding', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx === 0 // Monday only
      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 120 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: booked ? 8 : null,
        kindyProgramEndHour: booked ? 14 : null,
      }
    })

    const result = calculateQldFortnightly({
      ccsPercent: 60,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    expect(result!.totalKindyFunding).toBe(0)
  })

  /**
   * 2 × 7.5hr kindy both weeks = 15/15 = 30hrs/fortnight. Funded.
   */
  it('2 × 7.5hr kindy days per week: meets both minimums, funded', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 2
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
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    expect(result!.totalKindyFunding).toBeGreaterThan(0)
    const week1 = result!.sessions.filter((s) => s.week === 1)
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0)
  })

  /**
   * 1d week 1 / 2d week 2 = 7.5 + 15 = 22.5hrs/fortnight.
   * Under 30hr fortnightly minimum — no funding for either week.
   */
  it('1d/2d split (22.5hrs/fortnight): under 30hr minimum, no funding', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const bookedWeek1 = dayIdx === 0
      const bookedWeek2 = dayIdx < 2
      const booked = week === 1 ? bookedWeek1 : bookedWeek2
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
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    expect(result!.totalKindyFunding).toBe(0)
  })

  /**
   * 2 × 6hr kindy both weeks = 12/12 = 24hrs/fortnight.
   * Under 30hr fortnightly requirement — no funding at all.
   */
  it('12/12 split (24hrs/fortnight): under 30hr minimum, no funding', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 2
      const hasKindy = booked
      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 120 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasKindy ? 8 : null,
        kindyProgramEndHour: hasKindy ? 14 : null,
      }
    })

    const result = calculateQldFortnightly({
      ccsPercent: 60,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    expect(result!.totalKindyFunding).toBe(0)
    result!.sessions.forEach((s) => {
      expect(s.kindyFundingAmount).toBe(0)
    })
  })

  /**
   * No kindy days at all — zero funding, no errors.
   */
  it('no kindy days: zero funding', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 3
      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 125 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: null,
        kindyProgramEndHour: null,
      }
    })

    const result = calculateQldFortnightly({
      ccsPercent: 60,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      sessions,
    })

    expect(result).not.toBeNull()
    expect(result!.totalKindyFunding).toBe(0)
  })
})
