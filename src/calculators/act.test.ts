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

describe('ACT edge cases', () => {
  it('handles zero session fee gracefully', () => {
    const result = calculateActDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 0,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 6,
    })

    // Zero fee means zero everything
    expect(result.ccsAmount).toBe(0)
    expect(result.kindyFundingAmount).toBe(0)
    expect(result.estimatedGapFee).toBe(0)
  })

  it('0% CCS: state funding still applies', () => {
    const result = calculateActDaily({
      ccsPercent: 0,
      ccsWithholdingPercent: 0,
      sessionFee: 150,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 6,
    })

    expect(result.ccsAmount).toBe(0)
    expect(result.ccsEntitlement).toBe(0)
    // ACT funding should still cover preschool hours: 6 × $15 = $90
    expect(result.kindyFundingAmount).toBe(90)
    expect(result.estimatedGapFee).toBe(60)
  })

  it('100% withholding: CCS entitlement is 0 but funding still applies', () => {
    const result = calculateActDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 100,
      sessionFee: 150,
      sessionStartHour: 7,
      sessionEndHour: 17,
      kindyProgramHours: 6,
    })

    expect(result.ccsEntitlement).toBe(0)
    // ACT gap uses ccsAmount (pre-withholding), not ccsEntitlement
    // ccsAmount = $14.63 cap * 85% = $12.44/hr * 10 hrs = $124.40
    expect(result.gapBeforeKindy).toBe(25.6)
    // Kindy funding should still apply
    expect(result.kindyFundingAmount).toBeGreaterThan(0)
  })
})

describe('ACT withholding independence', () => {
  const baseInputs = {
    ccsPercent: 85,
    ccsWithholdingPercent: 5,
    sessionFee: 150,
    sessionStartHour: 7,
    sessionEndHour: 17,
    kindyProgramHours: 6,
  }

  /**
   * ACT uses ccsAmount (pre-withholding) for kindy funding, so
   * changing withholding should not change kindy funding amount.
   * The gap before kindy is also based on ccsAmount, not ccsEntitlement.
   */
  it('kindy funding is independent of withholding percentage', () => {
    const result0 = calculateActDaily({ ...baseInputs, ccsWithholdingPercent: 0 })
    const result5 = calculateActDaily({ ...baseInputs, ccsWithholdingPercent: 5 })
    const result20 = calculateActDaily({ ...baseInputs, ccsWithholdingPercent: 20 })
    const result50 = calculateActDaily({ ...baseInputs, ccsWithholdingPercent: 50 })

    expect(result0.kindyFundingAmount).toBe(result5.kindyFundingAmount)
    expect(result5.kindyFundingAmount).toBe(result20.kindyFundingAmount)
    expect(result20.kindyFundingAmount).toBe(result50.kindyFundingAmount)
  })

  /**
   * The gap before kindy should also be withholding-independent in ACT,
   * since it's computed as sessionFee - ccsAmount (pre-withholding).
   */
  it('gap before kindy is independent of withholding percentage', () => {
    const result0 = calculateActDaily({ ...baseInputs, ccsWithholdingPercent: 0 })
    const result5 = calculateActDaily({ ...baseInputs, ccsWithholdingPercent: 5 })
    const result20 = calculateActDaily({ ...baseInputs, ccsWithholdingPercent: 20 })

    expect(result0.gapBeforeKindy).toBe(result5.gapBeforeKindy)
    expect(result5.gapBeforeKindy).toBe(result20.gapBeforeKindy)
  })

  /**
   * The estimated gap fee (final out-of-pocket) should also be withholding-independent,
   * since it's gapBeforeKindy - kindyFundingAmount, both of which are withholding-independent.
   */
  it('estimated gap fee is independent of withholding percentage', () => {
    const result0 = calculateActDaily({ ...baseInputs, ccsWithholdingPercent: 0 })
    const result5 = calculateActDaily({ ...baseInputs, ccsWithholdingPercent: 5 })
    const result20 = calculateActDaily({ ...baseInputs, ccsWithholdingPercent: 20 })

    expect(result0.estimatedGapFee).toBe(result5.estimatedGapFee)
    expect(result5.estimatedGapFee).toBe(result20.estimatedGapFee)
  })
})

describe('ACT kindy pool exhaustion', () => {
  /**
   * 50-week program → 300 / 50 = 6 hrs/week pool.
   * 2 preschool days with 6hr kindy programs in week 1.
   * Day 1 consumes 6 of 6 → day 2 gets 0.
   */
  it('exhausts weekly pool with a single day', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 2
      const hasPreschool = week === 1 && booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 150 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasPreschool ? 9 : null,
        kindyProgramEndHour: hasPreschool ? 15 : null, // 6hr program
      }
    })

    const result = calculateActFortnightly(
      { ccsPercent: 85, ccsWithholdingPercent: 5, fortnightlyCcsHours: 72, sessions },
      50, // 50 weeks → 6 hrs/week pool
    )

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)

    // Mon: 6hr kindy consumes full 6hr pool
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[0].remainingKindyHours).toBe(0)

    // Tue: pool exhausted → no funding
    expect(week1[1].kindyFundingAmount).toBe(0)
    expect(week1[1].remainingKindyHours).toBe(0)
  })

  /**
   * 40-week program → 300 / 40 = 7.5 hrs/week pool.
   * 2 days with 5hr kindy programs — only the first day gets funded.
   * ACT funds one preschool day per week, not a pool across days.
   */
  it('funds only the first preschool day per week', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 2
      const hasPreschool = week === 1 && booked

      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: booked ? 150 : 0,
        sessionStartHour: booked ? 7 : 0,
        sessionEndHour: booked ? 17 : 0,
        kindyProgramStartHour: hasPreschool ? 9 : null,
        kindyProgramEndHour: hasPreschool ? 14 : null, // 5hr kindy
      }
    })

    const result = calculateActFortnightly(
      { ccsPercent: 85, ccsWithholdingPercent: 5, fortnightlyCcsHours: 72, sessions },
      40, // 40 weeks → 7.5 hrs/week pool
    )

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)

    // Mon: first preschool day, gets funded, pool zeroed after
    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0)
    expect(week1[0].remainingKindyHours).toBe(0)

    // Tue: second preschool day, no funding
    expect(week1[1].kindyFundingAmount).toBe(0)
    expect(week1[1].remainingKindyHours).toBe(0)
  })
})

describe('ACT preschool on any day of the week', () => {
  /**
   * Preschool on Thu+Fri — only Thu (first in the week) gets funded.
   * Verifies funding works on any day, not just Mon/Tue/Wed.
   */
  it('Thu+Fri preschool: only Thu gets funded per week', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx >= 3 // Thu and Fri
      const hasPreschool = booked

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

    const result = calculateActFortnightly(
      { ccsPercent: 85, ccsWithholdingPercent: 5, fortnightlyCcsHours: 72, sessions },
      50,
    )

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)
    const week2 = result!.sessions.filter((s) => s.week === 2)

    // Thu gets funded each week (first preschool day)
    expect(week1[3].kindyFundingAmount).toBeGreaterThan(0)
    expect(week2[3].kindyFundingAmount).toBeGreaterThan(0)

    // Fri gets nothing (second preschool day)
    expect(week1[4].kindyFundingAmount).toBe(0)
    expect(week2[4].kindyFundingAmount).toBe(0)
  })

  /**
   * All 5 days marked as preschool — only the first day (Mon) gets funded.
   */
  it('all 5 days preschool: only Mon gets funded', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      return {
        week,
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][dayIdx],
        sessionFee: 150,
        sessionStartHour: 7,
        sessionEndHour: 17,
        kindyProgramStartHour: 8.5,
        kindyProgramEndHour: 14.5,
      }
    })

    const result = calculateActFortnightly(
      { ccsPercent: 85, ccsWithholdingPercent: 5, fortnightlyCcsHours: 100, sessions },
      50,
    )

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)

    expect(week1[0].kindyFundingAmount).toBeGreaterThan(0) // Mon funded
    expect(week1[1].kindyFundingAmount).toBe(0) // Tue not funded
    expect(week1[2].kindyFundingAmount).toBe(0) // Wed not funded
    expect(week1[3].kindyFundingAmount).toBe(0) // Thu not funded
    expect(week1[4].kindyFundingAmount).toBe(0) // Fri not funded
  })

  /**
   * Different preschool days in different weeks — both get funded.
   * Week 1: only Fri has preschool. Week 2: only Wed has preschool.
   */
  it('different preschool days across weeks — both funded', () => {
    const sessions: FortnightlySession[] = Array.from({ length: 10 }, (_, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const dayIdx = i % 5
      const booked = dayIdx < 5
      const hasPreschool = (week === 1 && dayIdx === 4) || (week === 2 && dayIdx === 2)

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

    const result = calculateActFortnightly(
      { ccsPercent: 85, ccsWithholdingPercent: 5, fortnightlyCcsHours: 100, sessions },
      50,
    )

    expect(result).not.toBeNull()
    const week1 = result!.sessions.filter((s) => s.week === 1)
    const week2 = result!.sessions.filter((s) => s.week === 2)

    // Week 1: Fri funded
    expect(week1[4].kindyFundingAmount).toBeGreaterThan(0)
    // Week 2: Wed funded
    expect(week2[2].kindyFundingAmount).toBeGreaterThan(0)
  })
})
