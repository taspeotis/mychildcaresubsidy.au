/**
 * Compute per-week daily gaps when CCS hours may not cover both weeks.
 *
 * Returns null when both weeks are identical (CCS hours are sufficient),
 * or { week1Gap, week2Gap } when they differ.
 */
export function computeWeeklyGaps(params: {
  sessionFee: number
  sessionHours: number
  daysPerWeek: number
  ccsHoursPerFortnight: number
  /** CCS entitlement for a single day assuming full CCS coverage */
  fullDailyCcs: number
  /** State funding applied per day (kindy funding, fee relief, offset, etc.) */
  dailyStateFunding: number
}): { week1Gap: number; week2Gap: number } | null {
  const { sessionFee, sessionHours, daysPerWeek, ccsHoursPerFortnight, fullDailyCcs, dailyStateFunding } = params

  if (sessionHours <= 0 || daysPerWeek <= 0) return null

  const weeklyHours = sessionHours * daysPerWeek
  const fortnightlyHours = weeklyHours * 2

  // CCS hours cover the full fortnight — no difference between weeks
  if (ccsHoursPerFortnight >= fortnightlyHours) return null

  const week1Ratio = Math.min(1, ccsHoursPerFortnight / weeklyHours)
  const week2Remaining = Math.max(0, ccsHoursPerFortnight - weeklyHours)
  const week2Ratio = weeklyHours > 0 ? Math.min(1, week2Remaining / weeklyHours) : 1

  const week1Ccs = fullDailyCcs * week1Ratio
  const week2Ccs = fullDailyCcs * week2Ratio

  return {
    week1Gap: Math.max(0, sessionFee - week1Ccs - dailyStateFunding),
    week2Gap: Math.max(0, sessionFee - week2Ccs - dailyStateFunding),
  }
}
