import { CCS_HOURLY_RATE_CAP } from './ccs'

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

export interface NswFortnightlyInputs {
  ccsPercent: number
  ccsWithholdingPercent: number
  fortnightlyCcsHours: number
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
  ageGroup: NswAgeGroup
  feeReliefTier: NswFeeReliefTier
  serviceWeeks: number
  daysPerWeek: number
}

export interface NswFortnightlyResult {
  totalSessionFees: number
  totalCcsEntitlement: number
  totalFeeRelief: number
  totalGapFee: number
  dailyBreakdown: {
    day: number
    sessionFee: number
    ccsEntitlement: number
    feeRelief: number
    gapFee: number
  }[]
}

/**
 * Calculate daily out-of-pocket cost for an NSW Start Strong LDC session.
 */
export function calculateNswDaily(inputs: NswDailyInputs): NswDailyResult {
  const sessionHoursDecimal = inputs.sessionEndHour - inputs.sessionStartHour
  const hourlySessionFee = sessionHoursDecimal > 0 ? inputs.sessionFee / sessionHoursDecimal : 0

  const ccsRate = inputs.ccsPercent / 100
  const applicableCcsHourlyRate = roundTo(Math.min(hourlySessionFee, CCS_HOURLY_RATE_CAP) * ccsRate, 2)
  const ccsAmount = roundTo(Math.min(sessionHoursDecimal * applicableCcsHourlyRate, inputs.sessionFee), 4)
  const ccsWithholding = roundTo(ccsAmount * (inputs.ccsWithholdingPercent / 100), 4)
  const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)

  const gapBeforeFeeRelief = roundTo(inputs.sessionFee - ccsEntitlement, 2)

  // Annual fee relief divided across service operating weeks, then by days per week
  const annualFeeRelief = NSW_FEE_RELIEF[inputs.ageGroup][inputs.feeReliefTier]
  const weeklyFeeRelief = roundTo(annualFeeRelief / inputs.serviceWeeks, 2)
  const dailyFeeRelief = roundTo(weeklyFeeRelief / inputs.daysPerWeek, 2)

  // Fee relief can't exceed the gap after CCS
  const appliedDailyFeeRelief = Math.min(dailyFeeRelief, gapBeforeFeeRelief)
  const estimatedGapFee = roundTo(Math.max(0, gapBeforeFeeRelief - appliedDailyFeeRelief), 2)

  return {
    sessionHoursDecimal,
    hourlySessionFee: roundTo(hourlySessionFee, 4),
    ccsEntitlement,
    gapBeforeFeeRelief,
    weeklyFeeRelief,
    dailyFeeRelief: appliedDailyFeeRelief,
    annualFeeRelief,
    estimatedGapFee,
  }
}

/**
 * Calculate fortnightly out-of-pocket costs for NSW Start Strong LDC.
 */
export function calculateNswFortnightly(inputs: NswFortnightlyInputs): NswFortnightlyResult {
  const sessionHoursDecimal = inputs.sessionEndHour - inputs.sessionStartHour
  const hourlySessionFee = sessionHoursDecimal > 0 ? inputs.sessionFee / sessionHoursDecimal : 0
  const totalDays = inputs.daysPerWeek * 2

  const annualFeeRelief = NSW_FEE_RELIEF[inputs.ageGroup][inputs.feeReliefTier]
  const weeklyFeeRelief = roundTo(annualFeeRelief / inputs.serviceWeeks, 2)
  const dailyFeeRelief = roundTo(weeklyFeeRelief / inputs.daysPerWeek, 2)

  let remainingCcsHours = inputs.fortnightlyCcsHours
  const dailyBreakdown: NswFortnightlyResult['dailyBreakdown'] = []

  for (let d = 0; d < totalDays; d++) {
    const ccsRate = inputs.ccsPercent / 100
    const applicableCcsHourlyRate = roundTo(Math.min(hourlySessionFee, CCS_HOURLY_RATE_CAP) * ccsRate, 2)
    const applicableCcsHours = Math.min(sessionHoursDecimal, Math.max(0, remainingCcsHours))
    remainingCcsHours -= applicableCcsHours

    const ccsAmount = roundTo(Math.min(applicableCcsHours * applicableCcsHourlyRate, inputs.sessionFee), 4)
    const ccsWithholding = roundTo(ccsAmount * (inputs.ccsWithholdingPercent / 100), 4)
    const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)

    const gapBeforeFeeRelief = roundTo(inputs.sessionFee - ccsEntitlement, 2)
    const appliedFeeRelief = Math.min(dailyFeeRelief, gapBeforeFeeRelief)
    const gapFee = roundTo(Math.max(0, gapBeforeFeeRelief - appliedFeeRelief), 2)

    dailyBreakdown.push({
      day: d + 1,
      sessionFee: inputs.sessionFee,
      ccsEntitlement,
      feeRelief: appliedFeeRelief,
      gapFee,
    })
  }

  return {
    totalSessionFees: roundTo(dailyBreakdown.reduce((s, d) => s + d.sessionFee, 0), 2),
    totalCcsEntitlement: roundTo(dailyBreakdown.reduce((s, d) => s + d.ccsEntitlement, 0), 2),
    totalFeeRelief: roundTo(dailyBreakdown.reduce((s, d) => s + d.feeRelief, 0), 2),
    totalGapFee: roundTo(dailyBreakdown.reduce((s, d) => s + d.gapFee, 0), 2),
    dailyBreakdown,
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

    const sessionHours = s.sessionEndHour - s.sessionStartHour
    const hourlyFee = sessionHours > 0 ? s.sessionFee / sessionHours : 0

    const ccsRate = inputs.ccsPercent / 100
    const applicableCcsHourlyRate = roundTo(Math.min(hourlyFee, CCS_HOURLY_RATE_CAP) * ccsRate, 2)
    const applicableCcsHours = Math.min(sessionHours, Math.max(0, remainingCcsHours))
    remainingCcsHours -= applicableCcsHours

    const ccsAmount = roundTo(Math.min(applicableCcsHours * applicableCcsHourlyRate, s.sessionFee), 4)
    const ccsWithholding = roundTo(ccsAmount * (inputs.ccsWithholdingPercent / 100), 4)
    const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)

    const gapBeforeRelief = roundTo(s.sessionFee - ccsEntitlement, 2)
    const appliedRelief = Math.min(dailyFeeRelief, gapBeforeRelief)
    const gapFee = roundTo(Math.max(0, gapBeforeRelief - appliedRelief), 2)

    sessionResults.push({ ccsEntitlement, feeRelief: appliedRelief, gapFee })
    totalFees += s.sessionFee
    totalCcs += ccsEntitlement
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

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
