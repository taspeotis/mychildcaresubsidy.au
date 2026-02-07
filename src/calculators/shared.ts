/**
 * Shared CCS calculation logic used by all calculator modules.
 */

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export interface CcsResult {
  sessionHours: number
  hourlySessionFee: number
  applicableCcsHourlyRate: number
  applicableCcsHours: number
  ccsAmount: number
  ccsWithholding: number
  ccsEntitlement: number
}

/**
 * Compute the base CCS entitlement for a single session.
 *
 * All state/territory calculators share this core CCS logic.
 * State-specific funding (Free Kindy, Start Strong, etc.) is layered
 * on top by each calculator.
 */
export function computeSessionCcs(params: {
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
  ccsPercent: number
  ccsWithholdingPercent: number
  hourlyRateCap: number
  /** Hours of CCS available for this session. Defaults to full session hours. */
  ccsHoursAvailable?: number
}): CcsResult {
  const sessionHours = params.sessionEndHour - params.sessionStartHour
  const hourlySessionFee = sessionHours > 0 ? params.sessionFee / sessionHours : 0

  const ccsRate = params.ccsPercent / 100
  const applicableCcsHourlyRate = roundTo(Math.min(hourlySessionFee, params.hourlyRateCap) * ccsRate, 2)

  const applicableCcsHours = params.ccsHoursAvailable !== undefined
    ? Math.min(sessionHours, Math.max(0, params.ccsHoursAvailable))
    : sessionHours

  const ccsAmount = roundTo(Math.min(applicableCcsHours * applicableCcsHourlyRate, params.sessionFee), 4)
  const ccsWithholding = roundTo(ccsAmount * (params.ccsWithholdingPercent / 100), 4)
  const ccsEntitlement = roundTo(ccsAmount - ccsWithholding, 4)

  return {
    sessionHours,
    hourlySessionFee: roundTo(hourlySessionFee, 4),
    applicableCcsHourlyRate,
    applicableCcsHours,
    ccsAmount,
    ccsWithholding,
    ccsEntitlement,
  }
}
