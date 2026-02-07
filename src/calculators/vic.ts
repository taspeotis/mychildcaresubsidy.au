import { CCS_HOURLY_RATE_CAP } from './ccs'
import { computeSessionCcs, roundTo } from './shared'

// VIC Free Kinder for Long Day Care — 2026 annual offset amounts
// Applied over 40 program weeks per year, after CCS
export const VIC_FREE_KINDER_WEEKS = 40

export const VIC_FREE_KINDER_OFFSET = {
  standard: 2101,
  priority: 2693,
} as const

export type VicCohort = 'standard' | 'priority'

export interface VicDailyInputs {
  ccsPercent: number
  ccsWithholdingPercent: number
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
  cohort: VicCohort
  kinderHoursPerWeek: number
  daysPerWeek: number
}

export interface VicDailyResult {
  sessionHoursDecimal: number
  hourlySessionFee: number
  ccsEntitlement: number
  gapBeforeFreeKinder: number
  annualOffset: number
  weeklyOffset: number
  dailyOffset: number
  estimatedGapFee: number
}

/**
 * Calculate daily out-of-pocket cost for a VIC Free Kinder LDC session.
 */
export function calculateVicDaily(inputs: VicDailyInputs): VicDailyResult {
  const ccs = computeSessionCcs({
    sessionFee: inputs.sessionFee,
    sessionStartHour: inputs.sessionStartHour,
    sessionEndHour: inputs.sessionEndHour,
    ccsPercent: inputs.ccsPercent,
    ccsWithholdingPercent: inputs.ccsWithholdingPercent,
    hourlyRateCap: CCS_HOURLY_RATE_CAP,
  })

  const gapBeforeFreeKinder = roundTo(inputs.sessionFee - ccs.ccsEntitlement, 2)

  // Pro-rate the annual offset by enrolled hours
  const baseOffset = VIC_FREE_KINDER_OFFSET[inputs.cohort]
  const annualOffset = roundTo(baseOffset * (inputs.kinderHoursPerWeek / 15), 2)
  const weeklyOffset = roundTo(annualOffset / VIC_FREE_KINDER_WEEKS, 2)
  const dailyOffset = roundTo(weeklyOffset / inputs.daysPerWeek, 2)

  // Offset can't exceed gap after CCS
  const appliedOffset = Math.min(dailyOffset, gapBeforeFreeKinder)
  const estimatedGapFee = roundTo(Math.max(0, gapBeforeFreeKinder - appliedOffset), 2)

  return {
    sessionHoursDecimal: ccs.sessionHours,
    hourlySessionFee: ccs.hourlySessionFee,
    ccsEntitlement: ccs.ccsEntitlement,
    gapBeforeFreeKinder,
    annualOffset,
    weeklyOffset,
    dailyOffset: appliedOffset,
    estimatedGapFee,
  }
}

export interface VicSessionInput {
  booked: boolean
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
}

export interface VicFortnightlySessionsResult {
  sessions: { ccsEntitlement: number; freeKinder: number; gapFee: number }[]
  totalSessionFees: number
  totalCcsEntitlement: number
  totalFreeKinder: number
  totalGapFee: number
}

/**
 * Calculate fortnightly out-of-pocket costs for VIC Free Kinder LDC with per-session inputs.
 */
export function calculateVicFortnightlySessions(inputs: {
  ccsPercent: number
  ccsWithholdingPercent: number
  fortnightlyCcsHours: number
  cohort: VicCohort
  kinderHoursPerWeek: number
  sessions: VicSessionInput[]
}): VicFortnightlySessionsResult | null {
  const week1Booked = inputs.sessions.slice(0, 5).filter((s) => s.booked).length
  const week2Booked = inputs.sessions.slice(5, 10).filter((s) => s.booked).length
  if (week1Booked + week2Booked === 0) return null

  const baseOffset = VIC_FREE_KINDER_OFFSET[inputs.cohort]
  const annualOffset = roundTo(baseOffset * (inputs.kinderHoursPerWeek / 15), 2)
  const weeklyOffset = roundTo(annualOffset / VIC_FREE_KINDER_WEEKS, 2)

  let remainingCcsHours = inputs.fortnightlyCcsHours
  const sessionResults: VicFortnightlySessionsResult['sessions'] = []
  let totalFees = 0
  let totalCcs = 0
  let totalKinder = 0
  let totalGap = 0

  for (let i = 0; i < inputs.sessions.length; i++) {
    const s = inputs.sessions[i]
    if (!s.booked || s.sessionFee <= 0) {
      sessionResults.push({ ccsEntitlement: 0, freeKinder: 0, gapFee: 0 })
      continue
    }

    const weekBooked = i < 5 ? week1Booked : week2Booked
    const dailyOffset = weekBooked > 0 ? roundTo(weeklyOffset / weekBooked, 2) : 0

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

    const gapBeforeKinder = roundTo(s.sessionFee - ccs.ccsEntitlement, 2)
    const appliedOffset = Math.min(dailyOffset, gapBeforeKinder)
    const gapFee = roundTo(Math.max(0, gapBeforeKinder - appliedOffset), 2)

    sessionResults.push({ ccsEntitlement: ccs.ccsEntitlement, freeKinder: appliedOffset, gapFee })
    totalFees += s.sessionFee
    totalCcs += ccs.ccsEntitlement
    totalKinder += appliedOffset
    totalGap += gapFee
  }

  return {
    sessions: sessionResults,
    totalSessionFees: roundTo(totalFees, 2),
    totalCcsEntitlement: roundTo(totalCcs, 2),
    totalFreeKinder: roundTo(totalKinder, 2),
    totalGapFee: roundTo(totalGap, 2),
  }
}
