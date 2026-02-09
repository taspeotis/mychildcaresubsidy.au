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
   * 15 hrs/week pool: 2 × 7.5hr days exhausts it.
   * A 3rd kindy day in the same week gets no funding.
   */
  it('respects 15 hrs/week kindy pool', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 3
      const hasKindy = week === 1 && dayIdx < 3 // 3 kindy days week 1

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
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0) // Mon: funded
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0) // Tue: funded
    expect(week1[2].kindyFundingAmount).toBe(0) // Wed: pool exhausted
  })
})
