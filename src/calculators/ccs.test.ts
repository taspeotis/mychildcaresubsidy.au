/**
 * Federal CCS calculator tests.
 *
 * Sources:
 *   - Family Assistance Guide 3.5.4 (Calculating CCS entitlement)
 *     https://guides.dss.gov.au/family-assistance-guide/3/5/4
 *     "Jane": CBDC, $10/hr, CCS 50%, hourly CCS rate = $5.00
 *
 *   - Family Assistance Guide 3.5.3 (hourly rate cap examples)
 *     https://guides.dss.gov.au/family-assistance-guide/3/5/3
 *     "Mahunta": CBDC, $154/session (10 hrs), $15.40/hr exceeds cap of $15.19
 *
 * All rates are FY2026-27 (effective 6 July 2026).
 */
import { describe, it, expect } from 'vitest'
import { calculateCcsDaily, calculateCcsFortnightly } from './ccsCalculator'
import { calculateStandardCcsPercent, calculateHigherCcsPercent, estimateCcs, CCS_HOURLY_RATE_CAP } from './ccs'

describe('calculateCcsDaily', () => {
  /**
   * Family Assistance Guide 3.5.4 "Jane" example.
   * Jane's child attends CBDC at $10/hr. Combined ATI gives CCS of 50%.
   * The FAG confirms the hourly CCS rate is $5.00/hr.
   * We extend with a 10-hour session and 5% withholding.
   */
  it('FAG 3.5.4 — Jane: $10/hr CBDC, 50% CCS, fee below cap', () => {
    const result = calculateCcsDaily({
      ccsPercent: 50,
      ccsWithholdingPercent: 5,
      sessionFee: 100,
      sessionStartHour: 7,
      sessionEndHour: 17,
      careType: 'centre-based',
      schoolAge: false,
    })

    expect(result).not.toBeNull()
    // $10/hr is below the cap of $15.19, so CCS is based on actual fee
    expect(result!.ccsHourlyRate).toBe(5) // $10 × 50% = $5.00 (per FAG 3.5.4)
    expect(result!.ccsAmount).toBe(50) // $5 × 10 hrs
    expect(result!.ccsWithholding).toBe(2.5) // $50 × 5%
    expect(result!.ccsEntitlement).toBe(47.5) // $50 – $2.50
    expect(result!.estimatedGapFee).toBe(52.5) // $100 – $47.50
  })

  /**
   * Family Assistance Guide 3.5.3 "Mahunta" example.
   * The Mahunta family's 1yo attends CBDC at $154/session (10 hours).
   * Hourly rate = $15.40, which exceeds the cap of $15.19.
   * CCS is calculated on the capped rate.
   * The FAG doesn't specify CCS %, so we use 85%.
   */
  it('FAG 3.5.3 — Mahunta: $154/session, fee exceeds hourly cap', () => {
    const result = calculateCcsDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 154,
      sessionStartHour: 7,
      sessionEndHour: 17,
      careType: 'centre-based',
      schoolAge: false,
    })

    expect(result).not.toBeNull()
    expect(result!.hourlySessionFee).toBeCloseTo(15.4, 2)
    // Fee $15.40/hr exceeds cap $15.19, so CCS based on cap
    expect(result!.ccsHourlyRate).toBe(12.91) // $15.19 × 85%
    expect(result!.ccsAmount).toBe(129.1) // $12.91 × 10
    expect(result!.ccsWithholding).toBe(6.455) // $129.10 × 5%
    expect(result!.ccsEntitlement).toBe(122.645) // $129.10 – $6.455
    expect(result!.estimatedGapFee).toBe(31.36) // $154 – $122.645, rounded
  })

  /**
   * OSHC uses the school-age hourly rate cap ($13.30).
   * Source: Family Assistance Guide 3.5.3
   */
  it('FAG 3.5.3 — OSHC uses school-age cap ($13.30)', () => {
    const result = calculateCcsDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 60,
      sessionStartHour: 15,
      sessionEndHour: 18,
      careType: 'oshc',
      schoolAge: false,
    })

    expect(result).not.toBeNull()
    expect(result!.hourlyRateCap).toBe(13.3)
    // $20/hr exceeds $13.30 cap
    expect(result!.ccsHourlyRate).toBe(11.31) // $13.30 × 85%
  })
})

describe('calculateCcsFortnightly', () => {
  /**
   * 3 Day Guarantee: 72 CCS hours per fortnight.
   * Source: https://www.education.gov.au/early-childhood/child-care-subsidy/3-day-guarantee
   * 6 sessions × 12 hrs = 72 hrs, exactly the pool.
   */
  it('72-hour pool exactly covers 3 days/week of 12-hour sessions', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      booked: i % 5 < 3,
      sessionFee: i % 5 < 3 ? 120 : 0,
      sessionStartHour: 7,
      sessionEndHour: 19,
    }))

    const result = calculateCcsFortnightly({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      careType: 'centre-based',
      schoolAge: false,
      sessions,
    })

    expect(result).not.toBeNull()
    expect(result!.totalSessionFees).toBe(720)
    const booked = result!.sessions.filter((s) => s.sessionHours > 0)
    expect(booked).toHaveLength(6)
    booked.forEach((s) => {
      expect(s.ccsEntitlement).toBe(96.9)
      expect(s.gapFee).toBe(23.1)
    })
  })

  /**
   * CCS hours exhausted: 4 days/week × 12 hrs = 96 hrs but only 72 in pool.
   * Last 2 sessions get no CCS.
   */
  it('sessions beyond CCS pool get no subsidy', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      booked: i % 5 < 4,
      sessionFee: i % 5 < 4 ? 120 : 0,
      sessionStartHour: 7,
      sessionEndHour: 19,
    }))

    const result = calculateCcsFortnightly({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      careType: 'centre-based',
      schoolAge: false,
      sessions,
    })

    expect(result).not.toBeNull()
    const booked = result!.sessions.filter((s) => s.sessionHours > 0)
    // First 6 sessions: full CCS
    for (let i = 0; i < 6; i++) expect(booked[i].ccsEntitlement).toBe(96.9)
    // Last 2 sessions: no CCS hours left
    for (let i = 6; i < 8; i++) expect(booked[i].ccsEntitlement).toBe(0)
  })
})

describe('edge cases', () => {
  it('returns null for zero session fee', () => {
    const result = calculateCcsDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 0,
      sessionStartHour: 7,
      sessionEndHour: 17,
      careType: 'centre-based',
      schoolAge: false,
    })

    expect(result).toBeNull()
  })

  it('returns null when session start >= end', () => {
    const result = calculateCcsDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 150,
      sessionStartHour: 18,
      sessionEndHour: 8,
      careType: 'centre-based',
      schoolAge: false,
    })

    expect(result).toBeNull()
  })

  it('handles 0% CCS correctly', () => {
    const result = calculateCcsDaily({
      ccsPercent: 0,
      ccsWithholdingPercent: 5,
      sessionFee: 150,
      sessionStartHour: 7,
      sessionEndHour: 17,
      careType: 'centre-based',
      schoolAge: false,
    })

    expect(result).not.toBeNull()
    expect(result!.ccsHourlyRate).toBe(0)
    expect(result!.ccsAmount).toBe(0)
    expect(result!.ccsWithholding).toBe(0)
    expect(result!.ccsEntitlement).toBe(0)
    expect(result!.estimatedGapFee).toBe(150)
  })

  it('handles 100% withholding without errors', () => {
    const result = calculateCcsDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 100,
      sessionFee: 150,
      sessionStartHour: 7,
      sessionEndHour: 17,
      careType: 'centre-based',
      schoolAge: false,
    })

    expect(result).not.toBeNull()
    expect(result!.ccsEntitlement).toBe(0)
    expect(result!.estimatedGapFee).toBe(150)
  })
})

describe('CCS percentage boundaries', () => {
  it('returns 90% at income <= 88,520', () => {
    expect(calculateStandardCcsPercent(88_520)).toBe(90)
    expect(calculateStandardCcsPercent(80_000)).toBe(90)
  })

  it('returns 0% at income >= 538,520', () => {
    expect(calculateStandardCcsPercent(538_520)).toBe(0)
    expect(calculateStandardCcsPercent(600_000)).toBe(0)
  })

  it('tapers correctly just above threshold', () => {
    // $93,520 is one full $5,000 step above the $88,520 threshold,
    // so reduction = floor((93520 - 88520) / 5000) * 1 = 1 → 89%
    expect(calculateStandardCcsPercent(93_520)).toBe(89)
  })
})

describe('fortnightly rounding consistency', () => {
  /**
   * Verify that the reported total gap fee equals the sum of per-session gap fees.
   * Uses a fee ($143.33) that produces non-round CCS amounts to stress rounding.
   */
  it('total gap fee equals sum of per-session gap fees', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      booked: i % 5 < 3, // 3 days per week
      sessionFee: i % 5 < 3 ? 143.33 : 0,
      sessionStartHour: 7,
      sessionEndHour: 17,
    }))

    const result = calculateCcsFortnightly({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      careType: 'centre-based',
      schoolAge: false,
      sessions,
    })

    expect(result).not.toBeNull()
    const sumGapFees = result!.sessions.reduce((s, r) => s + r.gapFee, 0)
    const roundedSum = Math.round(sumGapFees * 100) / 100
    expect(result!.totalGapFee).toBe(roundedSum)
  })

  /**
   * Verify that total CCS entitlement equals the sum of per-session entitlements.
   */
  it('total CCS entitlement equals sum of per-session entitlements', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      booked: i % 5 < 3,
      sessionFee: i % 5 < 3 ? 143.33 : 0,
      sessionStartHour: 7,
      sessionEndHour: 17,
    }))

    const result = calculateCcsFortnightly({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      careType: 'centre-based',
      schoolAge: false,
      sessions,
    })

    expect(result).not.toBeNull()
    const sumCcs = result!.sessions.reduce((s, r) => s + r.ccsEntitlement, 0)
    const roundedSum = Math.round(sumCcs * 100) / 100
    expect(result!.totalCcsEntitlement).toBe(roundedSum)
  })

  /**
   * With varying fees across sessions, totals should still be consistent.
   * Uses alternating fees to maximize rounding divergence.
   */
  it('totals match session sums with varying fees', () => {
    const fees = [133.33, 166.67, 141.11]
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      booked: i % 5 < 3,
      sessionFee: i % 5 < 3 ? fees[i % 5] : 0,
      sessionStartHour: 7,
      sessionEndHour: 17,
    }))

    const result = calculateCcsFortnightly({
      ccsPercent: 73,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      careType: 'centre-based',
      schoolAge: false,
      sessions,
    })

    expect(result).not.toBeNull()

    // Total session fees
    const sumFees = sessions.filter((s) => s.booked).reduce((s, sess) => s + sess.sessionFee, 0)
    expect(result!.totalSessionFees).toBe(Math.round(sumFees * 100) / 100)

    // Total gap fee = sum of session gap fees (rounded)
    const sumGapFees = result!.sessions.reduce((s, r) => s + r.gapFee, 0)
    expect(result!.totalGapFee).toBe(Math.round(sumGapFees * 100) / 100)

    // Total CCS entitlement = sum of session entitlements (rounded)
    const sumCcs = result!.sessions.reduce((s, r) => s + r.ccsEntitlement, 0)
    expect(result!.totalCcsEntitlement).toBe(Math.round(sumCcs * 100) / 100)
  })

  /**
   * When CCS hours run out partway through the fortnight, the sessions that
   * get partial or no CCS should still sum correctly.
   */
  it('totals consistent when CCS hours exhaust mid-fortnight', () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      booked: i % 5 < 4, // 4 days/week = 80 hrs > 72 pool
      sessionFee: i % 5 < 4 ? 155.55 : 0,
      sessionStartHour: 7,
      sessionEndHour: 17,
    }))

    const result = calculateCcsFortnightly({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      fortnightlyCcsHours: 72,
      careType: 'centre-based',
      schoolAge: false,
      sessions,
    })

    expect(result).not.toBeNull()

    const sumGapFees = result!.sessions.reduce((s, r) => s + r.gapFee, 0)
    expect(result!.totalGapFee).toBe(Math.round(sumGapFees * 100) / 100)

    const sumCcs = result!.sessions.reduce((s, r) => s + r.ccsEntitlement, 0)
    expect(result!.totalCcsEntitlement).toBe(Math.round(sumCcs * 100) / 100)
  })
})

/**
 * Higher CCS for the 2nd and younger children aged 5 or under.
 * FY2026-27 bands per the "Rates for second and younger children 2026-27"
 * table on https://www.education.gov.au/early-childhood/child-care-subsidy
 * Two tapers (1% per $3,000) bracket two flat bands (80%, 50%).
 */
describe('calculateHigherCcsPercent (second/younger child)', () => {
  it('returns 95% at or below $146,437', () => {
    expect(calculateHigherCcsPercent(0)).toBe(95)
    expect(calculateHigherCcsPercent(100_000)).toBe(95)
    expect(calculateHigherCcsPercent(146_437)).toBe(95)
  })

  it('tapers 95% → 80% at 1% per $3,000 above $146,437', () => {
    expect(calculateHigherCcsPercent(149_437)).toBe(94) // first full $3,000 step
    expect(calculateHigherCcsPercent(191_436)).toBe(81) // last taper point before the flat band
  })

  it('returns 80% across $191,437 to below $270,727', () => {
    expect(calculateHigherCcsPercent(191_437)).toBe(80) // continuous with the taper (81 → 80)
    expect(calculateHigherCcsPercent(230_000)).toBe(80)
    expect(calculateHigherCcsPercent(270_726)).toBe(80)
  })

  it('tapers 80% → 50% at 1% per $3,000 above $270,727', () => {
    expect(calculateHigherCcsPercent(270_727)).toBe(80) // continuous with the flat band
    expect(calculateHigherCcsPercent(273_727)).toBe(79)
    expect(calculateHigherCcsPercent(360_726)).toBe(51) // last taper point before the 50% band
  })

  it('returns 50% across $360,727 to below $370,727', () => {
    expect(calculateHigherCcsPercent(360_727)).toBe(50) // continuous with the taper (51 → 50)
    expect(calculateHigherCcsPercent(370_726)).toBe(50)
  })

  it('returns 0% (standard rate applies) at or above $370,727', () => {
    expect(calculateHigherCcsPercent(370_727)).toBe(0)
    expect(calculateHigherCcsPercent(400_000)).toBe(0)
  })
})

describe('estimateCcs', () => {
  it('applies the higher rate for a 2nd+ child under 6 when eligible', () => {
    const result = estimateCcs({ income: 80_000, numberOfChildren: 2, isFirstChildUnder6: true, useHigherCcs: true })
    expect(result.standardPercent).toBe(90)
    expect(result.higherPercent).toBe(95)
    expect(result.applicablePercent).toBe(95)
    expect(result.hourlyRateCap).toBe(CCS_HOURLY_RATE_CAP) // returns the LDC cap
  })

  it('uses the standard rate when there is only one child', () => {
    const result = estimateCcs({ income: 80_000, numberOfChildren: 1, isFirstChildUnder6: true, useHigherCcs: true })
    expect(result.applicablePercent).toBe(result.standardPercent)
    expect(result.applicablePercent).toBe(90)
  })

  it('uses the standard rate when higher CCS is not requested', () => {
    const result = estimateCcs({ income: 80_000, numberOfChildren: 3, isFirstChildUnder6: true, useHigherCcs: false })
    expect(result.applicablePercent).toBe(result.standardPercent)
  })

  it('does not apply the higher rate once income reaches $370,727', () => {
    const result = estimateCcs({ income: 380_000, numberOfChildren: 2, isFirstChildUnder6: true, useHigherCcs: true })
    // Higher CCS no longer applies, so the standard (tapered) rate is used.
    expect(result.higherPercent).toBe(0)
    expect(result.applicablePercent).toBe(result.standardPercent)
    expect(result.applicablePercent).toBe(32) // 90 − floor((380,000 − 88,520) / 5,000)
  })
})

describe('hourly rate caps by care type', () => {
  it('Family Day Care uses the FDC cap ($14.08) when the fee exceeds it', () => {
    const result = calculateCcsDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 160, // $16/hr over 10 hrs, exceeds the FDC cap
      sessionStartHour: 7,
      sessionEndHour: 17,
      careType: 'family-day-care',
      schoolAge: false,
    })

    expect(result).not.toBeNull()
    expect(result!.hourlyRateCap).toBe(14.08)
    expect(result!.ccsHourlyRate).toBe(11.97) // $14.08 × 85%
    expect(result!.estimatedGapFee).toBe(46.29) // $160 − $113.715
  })

  it('Family Day Care uses the same cap regardless of school age', () => {
    const result = calculateCcsDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 160,
      sessionStartHour: 7,
      sessionEndHour: 17,
      careType: 'family-day-care',
      schoolAge: true,
    })

    // FDC is age-agnostic — not the $13.30 school-age cap.
    expect(result!.hourlyRateCap).toBe(14.08)
  })

  it('centre-based school-age uses the school-age cap ($13.30) via the schoolAge flag', () => {
    const result = calculateCcsDaily({
      ccsPercent: 85,
      ccsWithholdingPercent: 5,
      sessionFee: 150, // $15/hr over 10 hrs, exceeds the school-age cap
      sessionStartHour: 7,
      sessionEndHour: 17,
      careType: 'centre-based',
      schoolAge: true,
    })

    expect(result!.hourlyRateCap).toBe(13.3)
    expect(result!.ccsHourlyRate).toBe(11.31) // $13.30 × 85%
  })
})
