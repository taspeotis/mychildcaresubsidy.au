import { CCS_HOURLY_RATE_CAP } from './ccs'

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

export interface VicFortnightlyInputs {
  ccsPercent: number
  ccsWithholdingPercent: number
  fortnightlyCcsHours: number
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
  cohort: VicCohort
  kinderHoursPerWeek: number
  daysPerWeek: number
}

export interface VicFortnightlyResult {
  totalSessionFees: number
  totalCcsEntitlement: number
  totalFreeKinder: number
  totalGapFee: number
  dailyBreakdown: {
    day: number
    sessionFee: number
    ccsEntitlement: number
    freeKinder: number
    gapFee: number
  }[]
}

/**
 * Calculate daily out-of-pocket cost for a VIC Free Kinder LDC session.
 *
 * The Free Kinder offset is a flat annual amount pro-rated by
 * enrolled kinder hours: offset = base × (hours / 15).
 * It is divided by 40 program weeks and then by days per week.
 */
export function calculateVicDaily(inputs: VicDailyInputs): VicDailyResult {
  const sessionHoursDecimal = inputs.sessionEndHour - inputs.sessionStartHour
  const hourlySessionFee = sessionHoursDecimal > 0 ? inputs.sessionFee / sessionHoursDecimal : 0

  const ccsRate = inputs.ccsPercent / 100
  const applicableCcsHourlyRate = roundTo(Math.min(hourlySessionFee, CCS_HOURLY_RATE_CAP) * ccsRate, 2)
  const ccsAmount = roundTo(Math.min(sessionHoursDecimal * applicableCcsHourlyRate, inputs.sessionFee), 4)
  const ccsWithholding = roundTo(ccsAmount * (inputs.ccsWithholdingPercent / 100), 4)
  const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)

  const gapBeforeFreeKinder = roundTo(inputs.sessionFee - ccsEntitlement, 2)

  // Pro-rate the annual offset by enrolled hours
  const baseOffset = VIC_FREE_KINDER_OFFSET[inputs.cohort]
  const annualOffset = roundTo(baseOffset * (inputs.kinderHoursPerWeek / 15), 2)
  const weeklyOffset = roundTo(annualOffset / VIC_FREE_KINDER_WEEKS, 2)
  const dailyOffset = roundTo(weeklyOffset / inputs.daysPerWeek, 2)

  // Offset can't exceed gap after CCS
  const appliedOffset = Math.min(dailyOffset, gapBeforeFreeKinder)
  const estimatedGapFee = roundTo(Math.max(0, gapBeforeFreeKinder - appliedOffset), 2)

  return {
    sessionHoursDecimal,
    hourlySessionFee: roundTo(hourlySessionFee, 4),
    ccsEntitlement,
    gapBeforeFreeKinder,
    annualOffset,
    weeklyOffset,
    dailyOffset: appliedOffset,
    estimatedGapFee,
  }
}

/**
 * Calculate fortnightly out-of-pocket costs for VIC Free Kinder LDC.
 */
export function calculateVicFortnightly(inputs: VicFortnightlyInputs): VicFortnightlyResult {
  const sessionHoursDecimal = inputs.sessionEndHour - inputs.sessionStartHour
  const hourlySessionFee = sessionHoursDecimal > 0 ? inputs.sessionFee / sessionHoursDecimal : 0
  const totalDays = inputs.daysPerWeek * 2

  const baseOffset = VIC_FREE_KINDER_OFFSET[inputs.cohort]
  const annualOffset = roundTo(baseOffset * (inputs.kinderHoursPerWeek / 15), 2)
  const weeklyOffset = roundTo(annualOffset / VIC_FREE_KINDER_WEEKS, 2)
  const dailyOffset = roundTo(weeklyOffset / inputs.daysPerWeek, 2)

  let remainingCcsHours = inputs.fortnightlyCcsHours
  const dailyBreakdown: VicFortnightlyResult['dailyBreakdown'] = []

  for (let d = 0; d < totalDays; d++) {
    const ccsRate = inputs.ccsPercent / 100
    const applicableCcsHourlyRate = roundTo(Math.min(hourlySessionFee, CCS_HOURLY_RATE_CAP) * ccsRate, 2)
    const applicableCcsHours = Math.min(sessionHoursDecimal, Math.max(0, remainingCcsHours))
    remainingCcsHours -= applicableCcsHours

    const ccsAmount = roundTo(Math.min(applicableCcsHours * applicableCcsHourlyRate, inputs.sessionFee), 4)
    const ccsWithholding = roundTo(ccsAmount * (inputs.ccsWithholdingPercent / 100), 4)
    const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)

    const gapBeforeFreeKinder = roundTo(inputs.sessionFee - ccsEntitlement, 2)
    const appliedOffset = Math.min(dailyOffset, gapBeforeFreeKinder)
    const gapFee = roundTo(Math.max(0, gapBeforeFreeKinder - appliedOffset), 2)

    dailyBreakdown.push({
      day: d + 1,
      sessionFee: inputs.sessionFee,
      ccsEntitlement,
      freeKinder: appliedOffset,
      gapFee,
    })
  }

  return {
    totalSessionFees: roundTo(dailyBreakdown.reduce((s, d) => s + d.sessionFee, 0), 2),
    totalCcsEntitlement: roundTo(dailyBreakdown.reduce((s, d) => s + d.ccsEntitlement, 0), 2),
    totalFreeKinder: roundTo(dailyBreakdown.reduce((s, d) => s + d.freeKinder, 0), 2),
    totalGapFee: roundTo(dailyBreakdown.reduce((s, d) => s + d.gapFee, 0), 2),
    dailyBreakdown,
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

    const sessionHours = s.sessionEndHour - s.sessionStartHour
    const hourlyFee = sessionHours > 0 ? s.sessionFee / sessionHours : 0

    const ccsRate = inputs.ccsPercent / 100
    const applicableCcsHourlyRate = roundTo(Math.min(hourlyFee, CCS_HOURLY_RATE_CAP) * ccsRate, 2)
    const applicableCcsHours = Math.min(sessionHours, Math.max(0, remainingCcsHours))
    remainingCcsHours -= applicableCcsHours

    const ccsAmount = roundTo(Math.min(applicableCcsHours * applicableCcsHourlyRate, s.sessionFee), 4)
    const ccsWithholding = roundTo(ccsAmount * (inputs.ccsWithholdingPercent / 100), 4)
    const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)

    const gapBeforeKinder = roundTo(s.sessionFee - ccsEntitlement, 2)
    const appliedOffset = Math.min(dailyOffset, gapBeforeKinder)
    const gapFee = roundTo(Math.max(0, gapBeforeKinder - appliedOffset), 2)

    sessionResults.push({ ccsEntitlement, freeKinder: appliedOffset, gapFee })
    totalFees += s.sessionFee
    totalCcs += ccsEntitlement
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

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
