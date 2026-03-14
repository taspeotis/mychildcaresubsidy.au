/** Shared default values for calculator inputs */
export const DEFAULTS = {
  ccsPercent: '85.00',
  ccsWithholding: '5',
  ccsHoursPerFortnight: '72',
  sessionFee: '150.00',
  sessionStartHour: 8,
  sessionEndHour: 18,
}

/** Format a number as Australian currency */
export function fmt(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })
}

export const DAYS_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '2', label: '2 days' },
  { value: '3', label: '3 days' },
  { value: '4', label: '4 days' },
  { value: '5', label: '5 days' },
]

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

/**
 * Compute per-day debt recovery amount and its impact on CCS paid to service.
 * Used by all calculators (CCS, ACT, NSW, QLD, VIC) in both daily and fortnightly modes.
 *
 * - percent mode: deducts X% of the CCS entitlement for this session
 * - amount mode: spreads the $/fortnight evenly across all booked days in the fortnight
 *
 * CCS entitlement and state funding are unchanged. Only the gap fee increases.
 * CCS paid to service floors at $0; overflow is "recovered elsewhere".
 */
export function computeDebtRecovery(params: {
  ccsEntitlement: number
  debtRecoveryRaw: string
  debtRecoveryMode: 'percent' | 'amount'
  bookedDaysPerFortnight: number
}) {
  const raw = Number(params.debtRecoveryRaw?.replace(/,/g, '') ?? '0') || 0
  if (raw <= 0) return { debtPerDay: 0, ccsPaidToService: params.ccsEntitlement, recoveredElsewhere: 0 }

  let debtPerDay: number
  if (params.debtRecoveryMode === 'percent') {
    debtPerDay = Math.round(params.ccsEntitlement * raw / 100 * 100) / 100
  } else {
    debtPerDay = params.bookedDaysPerFortnight > 0
      ? Math.round(raw / params.bookedDaysPerFortnight * 100) / 100
      : 0
  }

  const ccsPaidToService = Math.max(0, Math.round((params.ccsEntitlement - debtPerDay) * 100) / 100)
  const recoveredElsewhere = Math.max(0, Math.round((debtPerDay - params.ccsEntitlement) * 100) / 100)
  return { debtPerDay, ccsPaidToService, recoveredElsewhere }
}

/** Format a decimal hour as 12-hour time (e.g. 8.5 → "8:30 AM") */
export function formatTime(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`
}
