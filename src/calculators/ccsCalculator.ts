import { CCS_HOURLY_RATE_CAP, CCS_HOURLY_RATE_CAP_SCHOOL_AGE, FDC_HOURLY_RATE_CAP } from './ccs'

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
  const sessionHours = inputs.sessionEndHour - inputs.sessionStartHour
  if (sessionHours <= 0 || inputs.sessionFee <= 0) return null

  const hourlySessionFee = inputs.sessionFee / sessionHours
  const hourlyRateCap = getHourlyRateCap(inputs.careType, inputs.schoolAge)
  const ccsRate = inputs.ccsPercent / 100
  const ccsHourlyRate = roundTo(Math.min(hourlySessionFee, hourlyRateCap) * ccsRate, 2)

  const ccsAmount = roundTo(Math.min(ccsHourlyRate * sessionHours, inputs.sessionFee), 4)
  const ccsWithholding = roundTo(ccsAmount * (inputs.ccsWithholdingPercent / 100), 4)
  const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)
  const estimatedGapFee = roundTo(Math.max(0, inputs.sessionFee - ccsEntitlement), 2)

  return {
    sessionHours,
    hourlySessionFee: roundTo(hourlySessionFee, 4),
    hourlyRateCap,
    ccsHourlyRate,
    ccsAmount,
    ccsWithholding,
    ccsEntitlement,
    estimatedGapFee,
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
  const ccsRate = inputs.ccsPercent / 100
  let remainingCcsHours = inputs.fortnightlyCcsHours

  const hasBookedDay = inputs.sessions.some((s) => s.booked && s.sessionFee > 0)
  if (!hasBookedDay) return null

  const results: CcsFortnightlySessionResult[] = inputs.sessions.map((session) => {
    if (!session.booked || session.sessionFee <= 0) {
      return { sessionHours: 0, ccsAmount: 0, ccsWithholding: 0, ccsEntitlement: 0, gapFee: 0 }
    }

    const sessionHours = session.sessionEndHour - session.sessionStartHour
    const hourlySessionFee = sessionHours > 0 ? session.sessionFee / sessionHours : 0
    const ccsHourlyRate = roundTo(Math.min(hourlySessionFee, hourlyRateCap) * ccsRate, 2)

    const applicableCcsHours = Math.min(sessionHours, Math.max(0, remainingCcsHours))
    remainingCcsHours -= applicableCcsHours

    const ccsAmount = roundTo(Math.min(ccsHourlyRate * applicableCcsHours, session.sessionFee), 4)
    const ccsWithholding = roundTo(ccsAmount * (inputs.ccsWithholdingPercent / 100), 4)
    const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)
    const gapFee = roundTo(Math.max(0, session.sessionFee - ccsEntitlement), 2)

    return { sessionHours, ccsAmount, ccsWithholding, ccsEntitlement, gapFee }
  })

  return {
    sessions: results,
    totalSessionFees: roundTo(inputs.sessions.reduce((s, sess) => s + (sess.booked ? sess.sessionFee : 0), 0), 2),
    totalCcsEntitlement: roundTo(results.reduce((s, r) => s + r.ccsEntitlement, 0), 2),
    totalGapFee: roundTo(results.reduce((s, r) => s + r.gapFee, 0), 2),
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
