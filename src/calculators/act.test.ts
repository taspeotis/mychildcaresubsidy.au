/**
 * ACT 3-Year-Old Preschool calculator tests.
 *
 * Sources:
 *   - ACT Government — Free three-year-old preschool
 *     https://www.act.gov.au/education-and-training/early-childhood-and-preschool/free-three-year-old-preschool
 *     "Harry": 3yo, 3 days/wk, 85% CCS, preschool 9am-3pm, pays $12.20/day.
 *     "Ahmed": no CCS, pays $20.80/day.
 *
 *   - The Canberra Times — How the ACT's free 3-year-old preschool will work
 *     https://www.canberratimes.com.au/story/8405676/
 *     300 hours/year: 6 hrs/wk × 50 weeks or 7.5 hrs/wk × 40 weeks.
 *
 * Key model difference: ACT uses ccsAmount (pre-withholding) for the gap
 * calculation, meaning preschool funding covers the fee-minus-CCS gap
 * for preschool hours.
 */
import { describe, it, expect } from 'vitest'
import { calculateActDaily, calculateActFortnightly } from './act'
import type { FortnightlySession } from '../types'

describe('calculateActDaily', () => {
  /**
   * 6-hour preschool program (50-week variant, per Canberra Times).
   * Preschool hours are funded; parent pays gap on wrap-around hours only.
   */
  it('6hr preschool: parent pays only for non-preschool hours', () => {
    const result = calculateActDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 150,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 6,

    })

    // CCS on full session: $14.63 cap × 85% = $12.44/hr × 10 hrs = $124.40
    expect(result.ccsAmount).toBe(124.4)
    // ACT gap uses pre-withholding: $150 − $124.40 = $25.60
    expect(result.gapBeforeKindy).toBe(25.6)
    // Kindy: 6 hrs × ($15 − $12.44) = $15.36
    expect(result.kindyFundingAmount).toBe(15.36)
    // Gap = 4 non-preschool hrs × $2.56/hr = $10.24
    expect(result.estimatedGapFee).toBe(10.24)
  })

  /**
   * 7.5-hour preschool program (40-week variant).
   * More preschool hours → lower gap.
   */
  it('7.5hr preschool: lower gap than 6hr program', () => {
    const result = calculateActDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 150,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 7.5,

    })

    // 7.5 hrs × $2.56 = $19.20 funded
    expect(result.kindyFundingAmount).toBe(19.2)
    // 2.5 non-preschool hrs × $2.56 = $6.40
    expect(result.estimatedGapFee).toBe(6.4)
  })

  /**
   * No CCS (inspired by ACT "Ahmed" example).
   * Preschool funding covers full fee for preschool hours.
   */
  it('no CCS: funding covers full fee for preschool hours', () => {
    const result = calculateActDaily({
      ccsPercent: 0,
      ccsWithholdingPercent: 0,
      sessionFee: 150,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 6,

    })

    // 6 hrs × $15 = $90 funded
    expect(result.kindyFundingAmount).toBe(90)
    // 4 hrs × $15 = $60 gap (non-preschool hours at full rate)
    expect(result.estimatedGapFee).toBe(60)
  })
})

describe('calculateActFortnightly', () => {
  /**
   * Typical pattern: 1 preschool day (Wed) + 2 regular days (Mon, Tue) per week.
   * Preschool day should have lower gap than regular days.
   */
  it('preschool days have lower gap than regular days', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 3
      const isPreschool = dayIdx === 2

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 150 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: booked && isPreschool ? 8.5 : null,
        kindyProgramEndHour: booked && isPreschool ? 14.5 : null,
      }
    })

    const result = calculateActFortnightly({ ccsPercent: 85, ccsWithholdingPercent: 5, fortnightlyCcsHours: 72, sessions }, 50)

    expect(result).not.toBeNull()
    const preschoolDays = result!.sessions.filter((s) => s.kindyFundingAmount > 0)
    const regularDays = result!.sessions.filter((s) => s.sessionHoursDecimal > 0 && s.kindyFundingAmount === 0)
    expect(preschoolDays).toHaveLength(2)
    expect(regularDays).toHaveLength(4)
    preschoolDays.forEach((ps) => {
      regularDays.forEach((rd) => expect(ps.estimatedGapFee).toBeLessThan(rd.estimatedGapFee))
    })
  })

  /**
   * Per-week kindy pool: 6 hrs for 50-week program.
   * One 6hr day exhausts it; second preschool day gets nothing.
   */
  it('respects per-week kindy hours pool', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 3
      const hasPreschool = week === 1 && (dayIdx === 1 || dayIdx === 2) && booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 150 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasPreschool ? 8.5 : null,
        kindyProgramEndHour: hasPreschool ? 14.5 : null,
      }
    })

    const result = calculateActFortnightly({ ccsPercent: 85, ccsWithholdingPercent: 5, fortnightlyCcsHours: 72, sessions }, 50)

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)
    expect(week1[1].kindyFundingAmount).toBeGreaterThan(0) // Tue: funded
    expect(week1[2].kindyFundingAmount).toBe(0) // Wed: pool exhausted
  })
})
