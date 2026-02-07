import type { DailyInputs, DailyResult, FortnightlyInputs, FortnightlyResult, FortnightlySessionResult } from '../types'
import { CCS_HOURLY_RATE_CAP } from './ccs'

// QLD Free Kindy: 15 hours/week, 30 hours/fortnight, 40 weeks/year
export const QLD_KINDY_HOURS_PER_WEEK = 15
export const QLD_KINDY_HOURS_PER_FORTNIGHT = 30

/**
 * Calculate daily out-of-pocket cost for a QLD Free Kindy session.
 */
export function calculateQldDaily(inputs: DailyInputs): DailyResult {
  const sessionHoursDecimal = inputs.sessionEndHour - inputs.sessionStartHour
  const hourlySessionFee = sessionHoursDecimal > 0 ? inputs.sessionFee / sessionHoursDecimal : 0

  const ccsRate = inputs.ccsPercent / 100
  const applicableCcsHourlyRate = roundTo(Math.min(hourlySessionFee, CCS_HOURLY_RATE_CAP) * ccsRate, 2)
  const applicableCcsHours = inputs.sessionCoveredByCcs ? sessionHoursDecimal : 0

  const ccsAmount = roundTo(Math.min(applicableCcsHours * applicableCcsHourlyRate, inputs.sessionFee), 4)
  const ccsWithholding = roundTo(ccsAmount * (inputs.ccsWithholdingPercent / 100), 4)

  // Normalise withholding at 5% for kindy funding calculation
  const withholdingRate = inputs.ccsWithholdingPercent / 100
  const normalisedCcsWithholding = roundTo(
    (ccsAmount - ccsWithholding + (ccsAmount - ccsWithholding) * ((withholdingRate * 100) / (100 - withholdingRate * 100))) *
      (withholdingRate <= 0.05 ? withholdingRate : 0.05),
    4,
  )
  const normalisedCcsEntitlement = ccsAmount - ccsWithholding + (ccsAmount - ccsWithholding) * ((withholdingRate * 100) / (100 - withholdingRate * 100)) - normalisedCcsWithholding
  const normalisedCcsPerHour = applicableCcsHours > 0 ? normalisedCcsEntitlement / applicableCcsHours : 0

  const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)
  const gapBeforeKindy = roundTo(inputs.sessionFee - ccsEntitlement, 4)

  // Kindy funding calculation
  const kindyHoursDecimal = inputs.kindyProgramHours
  const ccsFundedKindyHours = applicableCcsHours >= sessionHoursDecimal
    ? kindyHoursDecimal
    : Math.max(0, applicableCcsHours - (inputs.kindyProgramHours > 0 ? 0 : 0))
  const applicableKindyHours = Math.min(kindyHoursDecimal, QLD_KINDY_HOURS_PER_WEEK)
  const applicableKindyFundedCcsHours = Math.min(applicableKindyHours, ccsFundedKindyHours)
  const applicableKindyFundedNonCcsHours = Math.max(0, applicableKindyHours - applicableKindyFundedCcsHours)

  const kindyFundingCcsHours = applicableKindyFundedCcsHours * (hourlySessionFee - normalisedCcsPerHour)
  const kindyFundingNonCcsHours = applicableKindyFundedNonCcsHours * hourlySessionFee
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
    gapBeforeKindy: roundTo(gapBeforeKindy, 2),
    kindyFundingAmount,
    estimatedGapFee,
    kindyCcsCoveredHours: applicableKindyFundedCcsHours,
    kindyNonCcsCoveredHours: applicableKindyFundedNonCcsHours,
    kindyCcsPerHour: roundTo(normalisedCcsPerHour, 4),
  }
}

/**
 * Calculate fortnightly out-of-pocket costs for QLD Free Kindy.
 */
export function calculateQldFortnightly(inputs: FortnightlyInputs): FortnightlyResult {
  const results: FortnightlySessionResult[] = []
  let remainingCcsHours = inputs.fortnightlyCcsHours
  let remainingKindyHoursWeek1 = QLD_KINDY_HOURS_PER_WEEK
  let remainingKindyHoursWeek2 = QLD_KINDY_HOURS_PER_WEEK

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
    const gapBeforeKindy = roundTo(session.sessionFee - ccsEntitlement, 2)

    // Normalised CCS per hour for kindy funding
    const withholdingRate = inputs.ccsWithholdingPercent / 100
    const normalisedCcsWithholding = roundTo(
      (ccsEntitlement + ccsEntitlement * ((withholdingRate * 100) / (100 - withholdingRate * 100))) *
        (withholdingRate <= 0.05 ? withholdingRate : 0.05),
      4,
    )
    const normalisedCcsEntitlement = ccsEntitlement + ccsEntitlement * ((withholdingRate * 100) / (100 - withholdingRate * 100)) - normalisedCcsWithholding
    const normalisedCcsPerHour = applicableCcsHours > 0 ? normalisedCcsEntitlement / applicableCcsHours : 0

    // Kindy hours for this session
    let kindyFundingAmount = 0
    const remainingKindyHours = session.week === 1 ? remainingKindyHoursWeek1 : remainingKindyHoursWeek2

    if (session.kindyProgramStartHour !== null && session.kindyProgramEndHour !== null) {
      const kindyHoursDecimal = session.kindyProgramEndHour - session.kindyProgramStartHour
      const ccsFundedKindyHours = applicableCcsHours >= sessionHoursDecimal
        ? kindyHoursDecimal
        : Math.max(0, applicableCcsHours - (session.kindyProgramStartHour - session.sessionStartHour))
      const nonCcsFundedKindyHours = kindyHoursDecimal - ccsFundedKindyHours
      const applicableKindyHours = Math.min(kindyHoursDecimal, remainingKindyHours)
      const applicableKindyFundedCcsHours = Math.min(applicableKindyHours, ccsFundedKindyHours)
      const applicableKindyFundedNonCcsHours = Math.min(Math.max(0, applicableKindyHours - applicableKindyFundedCcsHours), nonCcsFundedKindyHours)

      kindyFundingAmount = roundTo(
        Math.max(0, applicableKindyFundedCcsHours * (hourlySessionFee - normalisedCcsPerHour) + applicableKindyFundedNonCcsHours * hourlySessionFee),
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
