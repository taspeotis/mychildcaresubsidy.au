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
