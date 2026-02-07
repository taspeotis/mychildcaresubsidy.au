import type { DailyInputs, DailyResult, FortnightlyInputs, FortnightlyResult, FortnightlySessionResult } from '../types'
import { CCS_HOURLY_RATE_CAP } from './ccs'
import { computeSessionCcs, roundTo } from './shared'

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
  const ccs = computeSessionCcs({
    sessionFee: inputs.sessionFee,
    sessionStartHour: inputs.sessionStartHour,
    sessionEndHour: inputs.sessionEndHour,
    ccsPercent: inputs.ccsPercent,
    ccsWithholdingPercent: inputs.ccsWithholdingPercent,
    hourlyRateCap: CCS_HOURLY_RATE_CAP,
  })

  // CCS per hour (for gap on preschool hours) — uses ccsAmount (pre-withholding)
  const ccsPerHour = ccs.applicableCcsHours > 0 ? ccs.ccsAmount / ccs.applicableCcsHours : 0

  const gapBeforeKindy = roundTo(inputs.sessionFee - ccs.ccsAmount, 2)

  // Preschool funding: covers the gap between session fee and CCS for preschool hours
  const kindyHoursDecimal = inputs.kindyProgramHours
  const ccsFundedKindyHours = ccs.applicableCcsHours >= ccs.sessionHours
    ? kindyHoursDecimal
    : Math.min(kindyHoursDecimal, Math.max(0, ccs.applicableCcsHours))
  const nonCcsFundedKindyHours = kindyHoursDecimal - ccsFundedKindyHours

  const kindyFundingCcsHours = ccsFundedKindyHours * (ccs.hourlySessionFee - ccsPerHour)
  const kindyFundingNonCcsHours = nonCcsFundedKindyHours * ccs.hourlySessionFee
  const kindyFundingAmount = roundTo(Math.max(0, kindyFundingCcsHours + kindyFundingNonCcsHours), 2)

  const estimatedGapFee = roundTo(Math.max(0, gapBeforeKindy - kindyFundingAmount), 2)

  return {
    sessionHoursDecimal: ccs.sessionHours,
    hourlySessionFee: ccs.hourlySessionFee,
    applicableCcsHourlyRate: ccs.applicableCcsHourlyRate,
    applicableCcsHours: ccs.applicableCcsHours,
    ccsAmount: ccs.ccsAmount,
    ccsWithholding: ccs.ccsWithholding,
    ccsEntitlement: ccs.ccsEntitlement,
    gapBeforeKindy,
    kindyFundingAmount,
    estimatedGapFee,
    kindyCcsCoveredHours: ccsFundedKindyHours,
    kindyNonCcsCoveredHours: nonCcsFundedKindyHours,
    kindyCcsPerHour: roundTo(ccsPerHour, 4),
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
    const ccs = computeSessionCcs({
      sessionFee: session.sessionFee,
      sessionStartHour: session.sessionStartHour,
      sessionEndHour: session.sessionEndHour,
      ccsPercent: inputs.ccsPercent,
      ccsWithholdingPercent: inputs.ccsWithholdingPercent,
      hourlyRateCap: CCS_HOURLY_RATE_CAP,
      ccsHoursAvailable: remainingCcsHours,
    })
    remainingCcsHours -= ccs.applicableCcsHours

    const ccsPerHour = ccs.applicableCcsHours > 0 ? ccs.ccsAmount / ccs.applicableCcsHours : 0
    const gapBeforeKindy = roundTo(session.sessionFee - ccs.ccsAmount, 2)

    let kindyFundingAmount = 0
    const remainingKindyHours = session.week === 1 ? remainingKindyHoursWeek1 : remainingKindyHoursWeek2

    if (session.kindyProgramStartHour !== null && session.kindyProgramEndHour !== null) {
      const kindyHoursDecimal = session.kindyProgramEndHour - session.kindyProgramStartHour
      const ccsFundedKindyHours = ccs.applicableCcsHours >= ccs.sessionHours
        ? kindyHoursDecimal
        : Math.max(0, Math.min(kindyHoursDecimal, ccs.applicableCcsHours - (session.kindyProgramStartHour - session.sessionStartHour)))
      const nonCcsFundedKindyHours = kindyHoursDecimal - ccsFundedKindyHours
      const applicableKindyHours = Math.min(kindyHoursDecimal, remainingKindyHours)
      const applicableKindyFundedCcsHours = Math.min(applicableKindyHours, ccsFundedKindyHours)
      const applicableKindyFundedNonCcsHours = Math.min(Math.max(0, applicableKindyHours - applicableKindyFundedCcsHours), nonCcsFundedKindyHours)

      kindyFundingAmount = roundTo(
        Math.max(0, applicableKindyFundedCcsHours * (ccs.hourlySessionFee - ccsPerHour) + applicableKindyFundedNonCcsHours * ccs.hourlySessionFee),
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
      sessionHoursDecimal: ccs.sessionHours,
      hourlySessionFee: ccs.hourlySessionFee,
      applicableCcsHourlyRate: ccs.applicableCcsHourlyRate,
      applicableCcsHours: ccs.applicableCcsHours,
      ccsAmount: ccs.ccsAmount,
      ccsWithholding: ccs.ccsWithholding,
      ccsEntitlement: ccs.ccsEntitlement,
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
