import type { DailyInputs, DailyResult, FortnightlyInputs, FortnightlyResult, FortnightlySessionResult } from '../types'
import { CCS_HOURLY_RATE_CAP } from './ccs'

// ACT 3-Year-Old Preschool: $2,575/year for 300 hours, paid to provider
// Default 40 program weeks/year
export const ACT_PROGRAM_WEEKS_PER_YEAR = 40
export const ACT_TOTAL_PROGRAM_HOURS = 300

export function getActKindyHoursPerWeek(programWeeks: number = ACT_PROGRAM_WEEKS_PER_YEAR): number {
  return ACT_TOTAL_PROGRAM_HOURS / programWeeks
}

/**
 * Calculate daily out-of-pocket cost for an ACT 3-Year-Old Preschool session.
 * The preschool program hours are free to the parent. The funding
 * ($2,575/year) is paid directly to the provider.
 */
export function calculateActDaily(inputs: DailyInputs): DailyResult {
  const sessionHoursDecimal = inputs.sessionEndHour - inputs.sessionStartHour
  const hourlySessionFee = sessionHoursDecimal > 0 ? inputs.sessionFee / sessionHoursDecimal : 0

  const ccsRate = inputs.ccsPercent / 100
  const applicableCcsHourlyRate = roundTo(Math.min(hourlySessionFee, CCS_HOURLY_RATE_CAP) * ccsRate, 2)
  const applicableCcsHours = inputs.sessionCoveredByCcs ? sessionHoursDecimal : 0

  const ccsAmount = roundTo(Math.min(applicableCcsHours * applicableCcsHourlyRate, inputs.sessionFee), 4)
  const ccsWithholding = roundTo(ccsAmount * (inputs.ccsWithholdingPercent / 100), 4)
  const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)

  // CCS per hour (for gap on preschool hours)
  const ccsPerHour = applicableCcsHours > 0 ? ccsAmount / applicableCcsHours : 0

  const gapBeforeKindy = roundTo(inputs.sessionFee - ccsAmount, 2)

  // Preschool funding: covers the gap between session fee and CCS for preschool hours
  const kindyHoursDecimal = inputs.kindyProgramHours
  const ccsFundedKindyHours = applicableCcsHours >= sessionHoursDecimal
    ? kindyHoursDecimal
    : Math.min(kindyHoursDecimal, Math.max(0, applicableCcsHours))
  const nonCcsFundedKindyHours = kindyHoursDecimal - ccsFundedKindyHours

  const kindyFundingCcsHours = ccsFundedKindyHours * (hourlySessionFee - ccsPerHour)
  const kindyFundingNonCcsHours = nonCcsFundedKindyHours * hourlySessionFee
  const kindyFundingAmount = roundTo(Math.max(0, kindyFundingCcsHours + kindyFundingNonCcsHours), 2)

  const estimatedGapFee = roundTo(Math.max(0, gapBeforeKindy - kindyFundingAmount), 2)

  return {
    sessionHoursDecimal,
    hourlySessionFee: roundTo(hourlySessionFee, 4),
    applicableCcsHourlyRate,
    applicableCcsHours,
    ccsAmount,
    ccsWithholding,
    ccsEntitlement,
    gapBeforeKindy,
    kindyFundingAmount,
    estimatedGapFee,
  }
}

/**
 * Calculate fortnightly out-of-pocket costs for ACT 3-Year-Old Preschool.
 */
export function calculateActFortnightly(inputs: FortnightlyInputs, programWeeks: number = ACT_PROGRAM_WEEKS_PER_YEAR): FortnightlyResult {
  const kindyHoursPerWeek = getActKindyHoursPerWeek(programWeeks)
  const results: FortnightlySessionResult[] = []
  let remainingCcsHours = inputs.fortnightlyCcsHours
  let remainingKindyHoursWeek1 = kindyHoursPerWeek
  let remainingKindyHoursWeek2 = kindyHoursPerWeek

  for (const session of inputs.sessions) {
    const sessionHoursDecimal = session.sessionEndHour - session.sessionStartHour
    const hourlySessionFee = sessionHoursDecimal > 0 ? session.sessionFee / sessionHoursDecimal : 0

    const ccsRate = inputs.ccsPercent / 100
    const applicableCcsHourlyRate = roundTo(Math.min(hourlySessionFee, CCS_HOURLY_RATE_CAP) * ccsRate, 2)

    const applicableCcsHours = Math.min(sessionHoursDecimal, Math.max(0, remainingCcsHours))
    remainingCcsHours -= applicableCcsHours

    const ccsAmount = roundTo(Math.min(applicableCcsHours * applicableCcsHourlyRate, session.sessionFee), 4)
    const ccsWithholding = roundTo(ccsAmount * (inputs.ccsWithholdingPercent / 100), 4)
    const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)
    const ccsPerHour = applicableCcsHours > 0 ? ccsAmount / applicableCcsHours : 0

    const gapBeforeKindy = roundTo(session.sessionFee - ccsAmount, 2)

    let kindyFundingAmount = 0
    const remainingKindyHours = session.week === 1 ? remainingKindyHoursWeek1 : remainingKindyHoursWeek2

    if (session.kindyProgramStartHour !== null && session.kindyProgramEndHour !== null) {
      const kindyHoursDecimal = session.kindyProgramEndHour - session.kindyProgramStartHour
      const ccsFundedKindyHours = applicableCcsHours >= sessionHoursDecimal
        ? kindyHoursDecimal
        : Math.max(0, Math.min(kindyHoursDecimal, applicableCcsHours - (session.kindyProgramStartHour - session.sessionStartHour)))
      const nonCcsFundedKindyHours = kindyHoursDecimal - ccsFundedKindyHours
      const applicableKindyHours = Math.min(kindyHoursDecimal, remainingKindyHours)
      const applicableKindyFundedCcsHours = Math.min(applicableKindyHours, ccsFundedKindyHours)
      const applicableKindyFundedNonCcsHours = Math.min(Math.max(0, applicableKindyHours - applicableKindyFundedCcsHours), nonCcsFundedKindyHours)

      kindyFundingAmount = roundTo(
        Math.max(0, applicableKindyFundedCcsHours * (hourlySessionFee - ccsPerHour) + applicableKindyFundedNonCcsHours * hourlySessionFee),
        2,
      )

      if (session.week === 1) {
        remainingKindyHoursWeek1 = Math.max(0, remainingKindyHoursWeek1 - applicableKindyHours)
      } else {
        remainingKindyHoursWeek2 = Math.max(0, remainingKindyHoursWeek2 - applicableKindyHours)
      }
    }

    const estimatedGapFee = roundTo(Math.max(0, gapBeforeKindy - kindyFundingAmount), 2)

    results.push({
      week: session.week,
      day: session.day,
      sessionHoursDecimal,
      hourlySessionFee: roundTo(hourlySessionFee, 4),
      applicableCcsHourlyRate,
      applicableCcsHours,
      ccsAmount,
      ccsWithholding,
      ccsEntitlement,
      gapBeforeKindy,
      kindyFundingAmount,
      estimatedGapFee,
      remainingCcsHours: Math.max(0, remainingCcsHours),
      remainingKindyHours: session.week === 1 ? remainingKindyHoursWeek1 : remainingKindyHoursWeek2,
    })
  }

  return {
    sessions: results,
    totalSessionFees: roundTo(results.reduce((s, r) => s + inputs.sessions[results.indexOf(r)]!.sessionFee, 0), 2),
    totalCcsEntitlement: roundTo(results.reduce((s, r) => s + r.ccsEntitlement, 0), 2),
    totalKindyFunding: roundTo(results.reduce((s, r) => s + r.kindyFundingAmount, 0), 2),
    totalGapFee: roundTo(results.reduce((s, r) => s + r.estimatedGapFee, 0), 2),
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}
