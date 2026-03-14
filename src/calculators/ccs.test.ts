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
 *     "Mahunta": CBDC, $154/session (10 hrs), $15.40/hr exceeds cap of $14.63
 *
 * All rates are FY2025-26 (July 2025 – June 2026).
 */
import { describe, it, expect } from 'vitest'
import { calculateCcsDaily, calculateCcsFortnightly } from './ccsCalculator'
import { calculateStandardCcsPercent } from './ccs'

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
    // $10/hr is below the cap of $14.63, so CCS is based on actual fee
    expect(result!.ccsHourlyRate).toBe(5) // $10 × 50% = $5.00 (per FAG 3.5.4)
    expect(result!.ccsAmount).toBe(50) // $5 × 10 hrs
    expect(result!.ccsWithholding).toBe(2.5) // $50 × 5%
    expect(result!.ccsEntitlement).toBe(47.5) // $50 – $2.50
    expect(result!.estimatedGapFee).toBe(52.5) // $100 – $47.50
  })

  /**
   * Family Assistance Guide 3.5.3 "Mahunta" example.
   * The Mahunta family's 1yo attends CBDC at $154/session (10 hours).
   * Hourly rate = $15.40, which exceeds the cap of $14.63.
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
    // Fee $15.40/hr exceeds cap $14.63, so CCS based on cap
    expect(result!.ccsHourlyRate).toBe(12.44) // $14.63 × 85%
    expect(result!.ccsAmount).toBe(124.4) // $12.44 × 10
    expect(result!.ccsWithholding).toBe(6.22) // $124.40 × 5%
    expect(result!.ccsEntitlement).toBe(118.18) // $124.40 – $6.22
    expect(result!.estimatedGapFee).toBe(35.82) // $154 – $118.18
  })

  /**
   * OSHC uses the school-age hourly rate cap ($12.81).
   * Source: Family Assistance Guide 3.5.3
   */
  it('FAG 3.5.3 — OSHC uses school-age cap ($12.81)', () => {
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
    expect(result!.hourlyRateCap).toBe(12.81)
    // $20/hr exceeds $12.81 cap
    expect(result!.ccsHourlyRate).toBe(10.89) // $12.81 × 85%
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
  it('returns 90% at income <= 85,279', () => {
    expect(calculateStandardCcsPercent(85_279)).toBe(90)
    expect(calculateStandardCcsPercent(80_000)).toBe(90)
  })

  it('returns 0% at income >= 535,279', () => {
    expect(calculateStandardCcsPercent(535_279)).toBe(0)
    expect(calculateStandardCcsPercent(600_000)).toBe(0)
  })

  it('tapers correctly just above threshold', () => {
    // $90,279 is in the range ($85,279, $90,279], reduction = floor((90279 - 85279) / 5000) * 1 = 1
    expect(calculateStandardCcsPercent(90_279)).toBe(89)
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
