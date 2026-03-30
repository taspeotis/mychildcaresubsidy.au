import type { DailyInputs, DailyResult, FortnightlyInputs, FortnightlyResult, FortnightlySessionResult } from '../types'
import { CCS_HOURLY_RATE_CAP } from './ccs'
import { computeSessionCcs, roundTo } from './shared'

// QLD Free Kindy: 15 hours/week, 30 hours/fortnight, 40 weeks/year
export const QLD_KINDY_HOURS_PER_WEEK = 15
export const QLD_KINDY_HOURS_PER_FORTNIGHT = 30
// Max hours per week: 18 (3 × 6hr days in a 2/3-day split)
export const QLD_KINDY_MAX_HOURS_PER_WEEK = 18
// Minimum kindy hours per week to qualify for funding (2 × 6hr days)
export const QLD_KINDY_MIN_HOURS_PER_WEEK = 12

/**
 * Calculate daily out-of-pocket cost for a QLD Free Kindy session.
 */
export function calculateQldDaily(inputs: DailyInputs): DailyResult {
  const ccs = computeSessionCcs({
    sessionFee: inputs.sessionFee,
    sessionStartHour: inputs.sessionStartHour,
    sessionEndHour: inputs.sessionEndHour,
    ccsPercent: inputs.ccsPercent,
    ccsWithholdingPercent: inputs.ccsWithholdingPercent,
    hourlyRateCap: CCS_HOURLY_RATE_CAP,
  })

  // Normalise withholding at 5% for kindy funding calculation
  const withholdingRate = Math.min(inputs.ccsWithholdingPercent / 100, 0.99)
  const ccsAmount = withholdingRate < 1 ? ccs.ccsEntitlement / (1 - withholdingRate) : 0
  const cappedWithholdingRate = Math.min(withholdingRate, 0.05)
  const normalisedCcsWithholding = roundTo(ccsAmount * cappedWithholdingRate, 4)
  const normalisedCcsEntitlement = ccsAmount - normalisedCcsWithholding
  const normalisedCcsPerHour = ccs.applicableCcsHours > 0 ? normalisedCcsEntitlement / ccs.applicableCcsHours : 0

  const gapBeforeKindy = roundTo(inputs.sessionFee - ccs.ccsEntitlement, 4)

  // Kindy funding calculation
  const kindyHoursDecimal = inputs.kindyProgramHours
  const ccsFundedKindyHours = ccs.applicableCcsHours >= ccs.sessionHours
    ? kindyHoursDecimal
    : Math.max(0, ccs.applicableCcsHours - (inputs.kindyProgramHours > 0 ? 0 : 0))
  const applicableKindyHours = Math.min(kindyHoursDecimal, QLD_KINDY_HOURS_PER_WEEK)
  const applicableKindyFundedCcsHours = Math.min(applicableKindyHours, ccsFundedKindyHours)
  const applicableKindyFundedNonCcsHours = Math.max(0, applicableKindyHours - applicableKindyFundedCcsHours)

  const kindyFundingCcsHours = applicableKindyFundedCcsHours * (ccs.hourlySessionFee - normalisedCcsPerHour)
  const kindyFundingNonCcsHours = applicableKindyFundedNonCcsHours * ccs.hourlySessionFee
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
 *
 * The 30hr fortnightly pool is split into per-week allocations. Each week
 * gets a base of min(demand, 15hrs), then surplus pool is distributed to
 * weeks that need more. This ensures identical weeks get 15hrs each while
 * still supporting 12/18 and 18/12 splits.
 */
export function calculateQldFortnightly(inputs: FortnightlyInputs): FortnightlyResult {
  // First pass: calculate kindy demand per week
  let week1Demand = 0
  let week2Demand = 0
  for (const session of inputs.sessions) {
    if (session.kindyProgramStartHour !== null && session.kindyProgramEndHour !== null) {
      const hours = session.kindyProgramEndHour - session.kindyProgramStartHour
      if (session.week === 1) week1Demand += hours
      else week2Demand += hours
    }
  }

  // Weeks below the minimum (12hrs, i.e. 2 × 6hr days) don't qualify for funding
  const week1Qualifies = week1Demand >= QLD_KINDY_MIN_HOURS_PER_WEEK
  const week2Qualifies = week2Demand >= QLD_KINDY_MIN_HOURS_PER_WEEK
  const qualifiedDemand1 = week1Qualifies ? week1Demand : 0
  const qualifiedDemand2 = week2Qualifies ? week2Demand : 0

  // Allocate fortnightly pool to qualifying weeks.
  // Each week gets min(demand, 15) as a base, then surplus up to the 18hr/week cap.
  // Week 1 reserves at least min(demand2, 15) for week 2 before taking surplus.
  const week1Allocation = Math.min(qualifiedDemand1, QLD_KINDY_MAX_HOURS_PER_WEEK, QLD_KINDY_HOURS_PER_FORTNIGHT - Math.min(qualifiedDemand2, QLD_KINDY_HOURS_PER_WEEK))
  const week2Allocation = Math.min(qualifiedDemand2, QLD_KINDY_MAX_HOURS_PER_WEEK, QLD_KINDY_HOURS_PER_FORTNIGHT - week1Allocation)

  let remainingKindyHoursWeek1 = week1Allocation
  let remainingKindyHoursWeek2 = week2Allocation

  const results: FortnightlySessionResult[] = []
  let remainingCcsHours = inputs.fortnightlyCcsHours

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

    const gapBeforeKindy = roundTo(session.sessionFee - ccs.ccsEntitlement, 2)

    // Normalised CCS per hour for kindy funding (cap withholding at 5%)
    const withholdingRate = Math.min(inputs.ccsWithholdingPercent / 100, 0.99)
    const ccsAmount = withholdingRate < 1 ? ccs.ccsEntitlement / (1 - withholdingRate) : 0
    const cappedWithholdingRate = Math.min(withholdingRate, 0.05)
    const normalisedCcsWithholding = roundTo(ccsAmount * cappedWithholdingRate, 4)
    const normalisedCcsEntitlement = ccsAmount - normalisedCcsWithholding
    const normalisedCcsPerHour = ccs.applicableCcsHours > 0 ? normalisedCcsEntitlement / ccs.applicableCcsHours : 0

    // Kindy hours for this session (draws from per-week allocation)
    let kindyFundingAmount = 0
    const remainingKindyHours = session.week === 1 ? remainingKindyHoursWeek1 : remainingKindyHoursWeek2

    if (session.kindyProgramStartHour !== null && session.kindyProgramEndHour !== null) {
      const kindyHoursDecimal = session.kindyProgramEndHour - session.kindyProgramStartHour
      const ccsFundedKindyHours = ccs.applicableCcsHours >= ccs.sessionHours
        ? kindyHoursDecimal
        : Math.max(0, ccs.applicableCcsHours - (session.kindyProgramStartHour - session.sessionStartHour))
      const nonCcsFundedKindyHours = kindyHoursDecimal - ccsFundedKindyHours
      const applicableKindyHours = Math.min(kindyHoursDecimal, remainingKindyHours)
      const applicableKindyFundedCcsHours = Math.min(applicableKindyHours, ccsFundedKindyHours)
      const applicableKindyFundedNonCcsHours = Math.min(Math.max(0, applicableKindyHours - applicableKindyFundedCcsHours), nonCcsFundedKindyHours)

      kindyFundingAmount = roundTo(
        Math.max(0, applicableKindyFundedCcsHours * (ccs.hourlySessionFee - normalisedCcsPerHour) + applicableKindyFundedNonCcsHours * ccs.hourlySessionFee),
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
    totalSessionFees: roundTo(results.reduce((s, _r, i) => s + inputs.sessions[i]!.sessionFee, 0), 2),
    totalCcsEntitlement: roundTo(results.reduce((s, r) => s + r.ccsEntitlement, 0), 2),
    totalKindyFunding: roundTo(results.reduce((s, r) => s + r.kindyFundingAmount, 0), 2),
    totalGapFee: roundTo(results.reduce((s, r) => s + r.estimatedGapFee, 0), 2),
  }
}
