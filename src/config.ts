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
 * Compute debt recovery impact on a daily CCS entitlement.
 * debtRecoveryRaw: the raw string from shared state (could be % or $ amount)
 * The CcsDetailsCard stores: % mode → "20.00" means 20%, $ mode → "50.00" means $50/fn.
 * We detect mode by checking if the value looks like a small percentage (≤100) or a dollar amount.
 * For simplicity, the shared state stores the value and the component handles the mode internally.
 * Here we just take the per-day dollar amount to deduct.
 */
export function computeDebtRecovery(ccsEntitlement: number, debtRecoveryPerDay: number) {
  const ccsPaidToService = Math.max(0, ccsEntitlement - debtRecoveryPerDay)
  const recoveredElsewhere = Math.max(0, debtRecoveryPerDay - ccsEntitlement)
  const gapIncrease = ccsEntitlement - ccsPaidToService - recoveredElsewhere
  return { ccsPaidToService, recoveredElsewhere, debtRecoveryPerDay, gapIncrease }
}

/** Format a decimal hour as 12-hour time (e.g. 8.5 → "8:30 AM") */
export function formatTime(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`
}
