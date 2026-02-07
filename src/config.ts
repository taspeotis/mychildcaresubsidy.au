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
