/**
 * NSW Start Strong fee relief calculator tests.
 *
 * All 4 case studies sourced from the NSW Department of Education:
 *   https://education.nsw.gov.au/early-childhood-education/operating-an-early-childhood-education-service/grants-and-funded-programs/start-strong-funding/start-strong-for-long-day-care/calculating-fee-relief-payment
 *
 * Annual fee relief rates (2026, Long Day Care):
 *   4YO+ maximum $2,563, 4YO+ standard $1,783, 3YO maximum $769, 3YO standard $423.
 * Formula: annual flat rate ÷ service operating weeks = weekly fee relief.
 */
import { describe, it, expect } from 'vitest'
import { calculateNswDaily, calculateNswFortnightlySessions } from './nsw'

describe('calculateNswDaily', () => {
  /**
   * Case Study 1: 4YO+ Maximum Rate
   * $150/day, SEIFA decile 2 (maximum), 4 days/wk, 49 service weeks.
   * Published: weekly relief = $52.31, weekly gap after CCS = $440, after relief = $387.69.
   */
  it('NSW Case Study 1: 4YO+ maximum, $150/day, 4 days/wk, 49 weeks', () => {
    const result = calculateNswDaily({
      ccsPercent: 36,
      ccsWithholdingPercent: 5,
      sessionFee: 150,
      sessionStartHour: 7,
      sessionEndHour: 17,
      ageGroup: '4+',
      feeReliefTier: 'maximum',
      serviceWeeks: 49,
      daysPerWeek: 4,
    })

    // $2,563 ÷ 49 = $52.31 (matches published case study)
    expect(result.weeklyFeeRelief).toBe(52.31)
    expect(result.dailyFeeRelief).toBe(13.08) // $52.31 ÷ 4
  })

  /**
   * Case Study 2: 4YO+ Standard Rate — relief exceeds gap
   * $137/day, SEIFA decile 9 (standard), 1 day/wk, 52 service weeks.
   * Published: weekly relief = $34.29, gap = $26.45, unused relief = $7.84/wk.
   */
  it('NSW Case Study 2: 4YO+ standard, relief exceeds gap → $0 gap', () => {
    const result = calculateNswDaily({
      ccsPercent: 90,
      ccsWithholdingPercent: 5,
      sessionFee: 137,
      sessionStartHour: 7,
      sessionEndHour: 17,
      ageGroup: '4+',
      feeReliefTier: 'standard',
      serviceWeeks: 52,
      daysPerWeek: 1,
    })

    // $1,783 ÷ 52 = $34.29 (matches published case study)
    expect(result.weeklyFeeRelief).toBe(34.29)
    // Relief ($34.29) exceeds gap ($19.86), so gap = $0
    expect(result.dailyFeeRelief).toBe(result.gapBeforeFeeRelief)
    expect(result.estimatedGapFee).toBe(0)
  })

  /**
   * Case Study 3: 3YO Maximum Rate, No CCS
   * Aboriginal child, $115/day, no CCS, 2 days/wk, 50 service weeks.
   * Published: weekly relief = $15.38, weekly fee after relief = $214.62.
   */
  it('NSW Case Study 3: 3YO maximum, no CCS, 2 days/wk, 50 weeks', () => {
    const result = calculateNswDaily({
      ccsPercent: 0,
      ccsWithholdingPercent: 0,
      sessionFee: 115,
      sessionStartHour: 7,
      sessionEndHour: 17,
      ageGroup: '3',
      feeReliefTier: 'maximum',
      serviceWeeks: 50,
      daysPerWeek: 2,
    })

    expect(result.ccsEntitlement).toBe(0)
    // $769 ÷ 50 = $15.38 (matches published case study)
    expect(result.weeklyFeeRelief).toBe(15.38)
    expect(result.dailyFeeRelief).toBe(7.69)
    // Published: weekly after relief = $214.62 → daily = $107.31
    expect(result.estimatedGapFee).toBe(107.31)
  })

  /**
   * Case Study 4: 3YO Standard Rate
   * $120/day, SEIFA decile 7, CCS eligible, 1 day/wk, 49 service weeks.
   * Published: weekly relief = $8.63.
   */
  it('NSW Case Study 4: 3YO standard, 1 day/wk, 49 weeks', () => {
    const result = calculateNswDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 120,
      sessionStartHour: 7,
      sessionEndHour: 17,
      ageGroup: '3',
      feeReliefTier: 'standard',
      serviceWeeks: 49,
      daysPerWeek: 1,
    })

    // $423 ÷ 49 = $8.63 (matches published case study)
    expect(result.weeklyFeeRelief).toBe(8.63)
    expect(result.dailyFeeRelief).toBe(8.63) // 1 day/wk
  })
})

describe('calculateNswFortnightlySessions', () => {
  /**
   * Fortnightly: 3 days/week, 4YO+ standard, 50 weeks.
   * Verifies weekly relief is divided evenly across booked days.
   */
  it('distributes weekly fee relief evenly across booked days', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      booked: i % 5 < 3,
      sessionFee: i % 5 < 3 ? 150 : 0,
      sessionStartHour: 7,
      sessionEndHour: 17,
    }))

    const result = calculateNswFortnightlySessions({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      ageGroup: '4+',
      feeReliefTier: 'standard',
      serviceWeeks: 50,
      sessions,
    })

    expect(result).not.toBeNull()
    // $1,783 ÷ 50 = $35.66/wk, ÷ 3 days = $11.89/day
    const booked = result!.sessions.filter((s) => s.ccsEntitlement > 0)
    booked.forEach((s) => expect(s.feeRelief).toBe(11.89))
  })
})
