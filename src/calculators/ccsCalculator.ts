import { CCS_HOURLY_RATE_CAP, CCS_HOURLY_RATE_CAP_SCHOOL_AGE, FDC_HOURLY_RATE_CAP } from './ccs'
import { computeSessionCcs, roundTo } from './shared'

export type CareType = 'centre-based' | 'family-day-care' | 'oshc'

export function getHourlyRateCap(careType: CareType, schoolAge: boolean): number {
  if (careType === 'family-day-care') return FDC_HOURLY_RATE_CAP
  if (careType === 'oshc' || schoolAge) return CCS_HOURLY_RATE_CAP_SCHOOL_AGE
  return CCS_HOURLY_RATE_CAP
}

export interface CcsDailyInputs {
  ccsPercent: number
  ccsWithholdingPercent: number
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
  careType: CareType
  schoolAge: boolean
}

export interface CcsDailyResult {
  sessionHours: number
  hourlySessionFee: number
  hourlyRateCap: number
  ccsHourlyRate: number
  ccsAmount: number
  ccsWithholding: number
  ccsEntitlement: number
  estimatedGapFee: number
}

export function calculateCcsDaily(inputs: CcsDailyInputs): CcsDailyResult | null {
  if (inputs.sessionEndHour - inputs.sessionStartHour <= 0 || inputs.sessionFee <= 0) return null

  const hourlyRateCap = getHourlyRateCap(inputs.careType, inputs.schoolAge)
  const ccs = computeSessionCcs({
    sessionFee: inputs.sessionFee,
    sessionStartHour: inputs.sessionStartHour,
    sessionEndHour: inputs.sessionEndHour,
    ccsPercent: inputs.ccsPercent,
    ccsWithholdingPercent: inputs.ccsWithholdingPercent,
    hourlyRateCap,
  })

  return {
    sessionHours: ccs.sessionHours,
    hourlySessionFee: ccs.hourlySessionFee,
    hourlyRateCap,
    ccsHourlyRate: ccs.applicableCcsHourlyRate,
    ccsAmount: ccs.ccsAmount,
    ccsWithholding: ccs.ccsWithholding,
    ccsEntitlement: ccs.ccsEntitlement,
    estimatedGapFee: roundTo(Math.max(0, inputs.sessionFee - ccs.ccsEntitlement), 2),
  }
}

export interface CcsFortnightlySession {
  booked: boolean
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
}

export interface CcsFortnightlyInputs {
  ccsPercent: number
  ccsWithholdingPercent: number
  fortnightlyCcsHours: number
  careType: CareType
  schoolAge: boolean
  sessions: CcsFortnightlySession[]
}

export interface CcsFortnightlySessionResult {
  sessionHours: number
  ccsAmount: number
  ccsWithholding: number
  ccsEntitlement: number
  gapFee: number
}

export interface CcsFortnightlyResult {
  sessions: CcsFortnightlySessionResult[]
  totalSessionFees: number
  totalCcsEntitlement: number
  totalGapFee: number
}

export function calculateCcsFortnightly(inputs: CcsFortnightlyInputs): CcsFortnightlyResult | null {
  const hourlyRateCap = getHourlyRateCap(inputs.careType, inputs.schoolAge)
  let remainingCcsHours = inputs.fortnightlyCcsHours

  const hasBookedDay = inputs.sessions.some((s) => s.booked && s.sessionFee > 0)
  if (!hasBookedDay) return null

  const results: CcsFortnightlySessionResult[] = inputs.sessions.map((session) => {
    if (!session.booked || session.sessionFee <= 0) {
      return { sessionHours: 0, ccsAmount: 0, ccsWithholding: 0, ccsEntitlement: 0, gapFee: 0 }
    }

    const ccs = computeSessionCcs({
      sessionFee: session.sessionFee,
      sessionStartHour: session.sessionStartHour,
      sessionEndHour: session.sessionEndHour,
      ccsPercent: inputs.ccsPercent,
      ccsWithholdingPercent: inputs.ccsWithholdingPercent,
      hourlyRateCap,
      ccsHoursAvailable: remainingCcsHours,
    })
    remainingCcsHours -= ccs.applicableCcsHours

    return {
      sessionHours: ccs.sessionHours,
      ccsAmount: ccs.ccsAmount,
      ccsWithholding: ccs.ccsWithholding,
      ccsEntitlement: ccs.ccsEntitlement,
      gapFee: roundTo(Math.max(0, session.sessionFee - ccs.ccsEntitlement), 2),
    }
  })

  return {
    sessions: results,
    totalSessionFees: roundTo(inputs.sessions.reduce((s, sess) => s + (sess.booked ? sess.sessionFee : 0), 0), 2),
    totalCcsEntitlement: roundTo(results.reduce((s, r) => s + r.ccsEntitlement, 0), 2),
    totalGapFee: roundTo(results.reduce((s, r) => s + r.gapFee, 0), 2),
  }
}
