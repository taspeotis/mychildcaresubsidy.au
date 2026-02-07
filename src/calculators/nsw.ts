import { CCS_HOURLY_RATE_CAP } from './ccs'
import { computeSessionCcs, roundTo } from './shared'

// NSW Start Strong for Long Day Care — 2026 annual fee relief amounts
export const NSW_FEE_RELIEF = {
  '4+': { standard: 1783, maximum: 2563 },
  '3': { standard: 423, maximum: 769 },
} as const

export type NswAgeGroup = '4+' | '3'
export type NswFeeReliefTier = 'standard' | 'maximum'

export interface NswDailyInputs {
  ccsPercent: number
  ccsWithholdingPercent: number
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
  ageGroup: NswAgeGroup
  feeReliefTier: NswFeeReliefTier
  serviceWeeks: number
  daysPerWeek: number
}

export interface NswDailyResult {
  sessionHoursDecimal: number
  hourlySessionFee: number
  ccsEntitlement: number
  gapBeforeFeeRelief: number
  weeklyFeeRelief: number
  dailyFeeRelief: number
  annualFeeRelief: number
  estimatedGapFee: number
}

/**
 * Calculate daily out-of-pocket cost for an NSW Start Strong LDC session.
 */
export function calculateNswDaily(inputs: NswDailyInputs): NswDailyResult {
  const ccs = computeSessionCcs({
    sessionFee: inputs.sessionFee,
    sessionStartHour: inputs.sessionStartHour,
    sessionEndHour: inputs.sessionEndHour,
    ccsPercent: inputs.ccsPercent,
    ccsWithholdingPercent: inputs.ccsWithholdingPercent,
    hourlyRateCap: CCS_HOURLY_RATE_CAP,
  })

  const gapBeforeFeeRelief = roundTo(inputs.sessionFee - ccs.ccsEntitlement, 2)

  // Annual fee relief divided across service operating weeks, then by days per week
  const annualFeeRelief = NSW_FEE_RELIEF[inputs.ageGroup][inputs.feeReliefTier]
  const weeklyFeeRelief = roundTo(annualFeeRelief / inputs.serviceWeeks, 2)
  const dailyFeeRelief = roundTo(weeklyFeeRelief / inputs.daysPerWeek, 2)

  // Fee relief can't exceed the gap after CCS
  const appliedDailyFeeRelief = Math.min(dailyFeeRelief, gapBeforeFeeRelief)
  const estimatedGapFee = roundTo(Math.max(0, gapBeforeFeeRelief - appliedDailyFeeRelief), 2)

  return {
    sessionHoursDecimal: ccs.sessionHours,
    hourlySessionFee: ccs.hourlySessionFee,
    ccsEntitlement: ccs.ccsEntitlement,
    gapBeforeFeeRelief,
    weeklyFeeRelief,
    dailyFeeRelief: appliedDailyFeeRelief,
    annualFeeRelief,
    estimatedGapFee,
  }
}

export interface NswSessionInput {
  booked: boolean
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
}

export interface NswFortnightlySessionsResult {
  sessions: { ccsEntitlement: number; feeRelief: number; gapFee: number }[]
  totalSessionFees: number
  totalCcsEntitlement: number
  totalFeeRelief: number
  totalGapFee: number
}

/**
 * Calculate fortnightly out-of-pocket costs for NSW Start Strong LDC with per-session inputs.
 */
export function calculateNswFortnightlySessions(inputs: {
  ccsPercent: number
  ccsWithholdingPercent: number
  fortnightlyCcsHours: number
  ageGroup: NswAgeGroup
  feeReliefTier: NswFeeReliefTier
  serviceWeeks: number
  sessions: NswSessionInput[]
}): NswFortnightlySessionsResult | null {
  const week1Booked = inputs.sessions.slice(0, 5).filter((s) => s.booked).length
  const week2Booked = inputs.sessions.slice(5, 10).filter((s) => s.booked).length
  if (week1Booked + week2Booked === 0) return null

  const annualFeeRelief = NSW_FEE_RELIEF[inputs.ageGroup][inputs.feeReliefTier]
  const weeklyFeeRelief = roundTo(annualFeeRelief / inputs.serviceWeeks, 2)

  let remainingCcsHours = inputs.fortnightlyCcsHours
  const sessionResults: NswFortnightlySessionsResult['sessions'] = []
  let totalFees = 0
  let totalCcs = 0
  let totalRelief = 0
  let totalGap = 0

  for (let i = 0; i < inputs.sessions.length; i++) {
    const s = inputs.sessions[i]
    if (!s.booked || s.sessionFee <= 0) {
      sessionResults.push({ ccsEntitlement: 0, feeRelief: 0, gapFee: 0 })
      continue
    }

    const weekBooked = i < 5 ? week1Booked : week2Booked
    const dailyFeeRelief = weekBooked > 0 ? roundTo(weeklyFeeRelief / weekBooked, 2) : 0

    const ccs = computeSessionCcs({
      sessionFee: s.sessionFee,
      sessionStartHour: s.sessionStartHour,
      sessionEndHour: s.sessionEndHour,
      ccsPercent: inputs.ccsPercent,
      ccsWithholdingPercent: inputs.ccsWithholdingPercent,
      hourlyRateCap: CCS_HOURLY_RATE_CAP,
      ccsHoursAvailable: remainingCcsHours,
    })
    remainingCcsHours -= ccs.applicableCcsHours

    const gapBeforeRelief = roundTo(s.sessionFee - ccs.ccsEntitlement, 2)
    const appliedRelief = Math.min(dailyFeeRelief, gapBeforeRelief)
    const gapFee = roundTo(Math.max(0, gapBeforeRelief - appliedRelief), 2)

    sessionResults.push({ ccsEntitlement: ccs.ccsEntitlement, feeRelief: appliedRelief, gapFee })
    totalFees += s.sessionFee
    totalCcs += ccs.ccsEntitlement
    totalRelief += appliedRelief
    totalGap += gapFee
  }

  return {
    sessions: sessionResults,
    totalSessionFees: roundTo(totalFees, 2),
    totalCcsEntitlement: roundTo(totalCcs, 2),
    totalFeeRelief: roundTo(totalRelief, 2),
    totalGapFee: roundTo(totalGap, 2),
  }
}
