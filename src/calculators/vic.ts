import { CCS_HOURLY_RATE_CAP } from './ccs'
import { computeSessionCcs, roundTo } from './shared'
import { DEFAULT_STATE_RATE_YEAR, type VicFreeKinderRates } from './stateRates'

// VIC Free Kinder for Long Day Care: annual offset amounts and program weeks for
// the default (latest) rate year, applied after CCS. Rates for each year live in
// stateRates.ts; retained as named exports for callers wanting the headline figures.
export const VIC_FREE_KINDER_RATES: VicFreeKinderRates = DEFAULT_STATE_RATE_YEAR.vic
export const VIC_FREE_KINDER_WEEKS = VIC_FREE_KINDER_RATES.weeks
export const VIC_FREE_KINDER_OFFSET = VIC_FREE_KINDER_RATES.offset

export type VicCohort = 'standard' | 'priority'

// Most funded 4yo hours per week: Pre-Prep areas fund up to 20 hours, and
// priority cohort children are funded for up to 25 hours statewide.
export const VIC_MAX_FUNDED_HOURS: Record<VicCohort, number> = { standard: 20, priority: 25 }

/** Parse a Kinder Program select value into funded hours/week, capped for the cohort. */
export function vicKinderHours(kinderHours: string, cohort: VicCohort): number {
  const hrs = kinderHours === '15-3yo' ? 15 : Number(kinderHours) || 15
  return Math.min(hrs, VIC_MAX_FUNDED_HOURS[cohort])
}

export interface VicDailyInputs {
  ccsPercent: number
  ccsWithholdingPercent: number
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
  cohort: VicCohort
  kinderHoursPerWeek: number
  daysPerWeek: number
  /** CCS hourly rate cap (LDC). Defaults to the latest FY2026-27 cap when omitted. */
  hourlyRateCap?: number
  /** Offset amounts and program weeks. Defaults to the latest rate year when omitted. */
  freeKinderRates?: VicFreeKinderRates
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
    hourlyRateCap: inputs.hourlyRateCap ?? CCS_HOURLY_RATE_CAP,
  })

  const gapBeforeFreeKinder = roundTo(inputs.sessionFee - ccs.ccsEntitlement, 2)

  // Scale the annual offset by funded hours against a 15 hr/wk program. Below 15
  // that's the pro-rata for 3yo programs; above 15 it's Pre-Prep, where each extra
  // weekly hour is funded at the 15-hour rate ÷ 15 ($143.60 standard / $184
  // priority in 2027), so the same formula holds.
  const rates = inputs.freeKinderRates ?? VIC_FREE_KINDER_RATES
  const baseOffset = rates.offset[inputs.cohort]
  const annualOffset = roundTo(baseOffset * (inputs.kinderHoursPerWeek / 15), 2)
  const weeklyOffset = roundTo(annualOffset / rates.weeks, 2)
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
  hourlyRateCap?: number
  freeKinderRates?: VicFreeKinderRates
}): VicFortnightlySessionsResult | null {
  const week1Booked = inputs.sessions.slice(0, 5).filter((s) => s.booked).length
  const week2Booked = inputs.sessions.slice(5, 10).filter((s) => s.booked).length
  if (week1Booked + week2Booked === 0) return null

  const rates = inputs.freeKinderRates ?? VIC_FREE_KINDER_RATES
  const baseOffset = rates.offset[inputs.cohort]
  const annualOffset = roundTo(baseOffset * (inputs.kinderHoursPerWeek / 15), 2)
  const weeklyOffset = roundTo(annualOffset / rates.weeks, 2)

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
      hourlyRateCap: inputs.hourlyRateCap ?? CCS_HOURLY_RATE_CAP,
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
