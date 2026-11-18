// Child Care Subsidy rate tables per Commonwealth legislation.
//
// Two rate sets are kept side by side so the site can switch between the rates
// in effect now and the higher caps/thresholds that take effect on 6 July 2026:
//   - 'current' — FY2025-26 (Services Australia, updated 7 July 2025)
//   - 'new'     — FY2026-27 (CPI-indexed, effective 6 July 2026)
// The user picks which set the calculators use via the rate-change banner.

export type RateSetId = 'current' | 'new'

export interface RateSet {
  id: RateSetId
  /** Financial-year label, e.g. "2026–27" (uses an en dash). */
  fyLabel: string
  /** Stable slug used in the `?rates=` URL param, e.g. "2025-26". */
  urlSlug: string

  // Hourly fee caps
  ldcCap: number // Centre Based LDC, below school age
  schoolAgeCap: number
  fdcCap: number

  // Standard CCS income thresholds
  standardFull: number // income at/below which Standard CCS is 90%
  standardZero: number // income at/above which Standard CCS is 0%

  // Higher CCS (2nd+ under-6 child) income thresholds
  higher95: number // income at/below which Higher CCS is 95%
  higher95TaperEnd: number // end of the 95→80 taper; start of the flat 80% band
  higher80FlatEnd: number // end of the flat 80% band; start of the 80→50 taper
  higher80TaperEnd: number // end of the 80→50 taper; start of the flat 50% band
  higher50End: number // end of the flat 50% band; income at/above which Higher CCS is 0%
}

export const RATE_SETS: Record<RateSetId, RateSet> = {
  current: {
    id: 'current',
    fyLabel: '2025–26',
    urlSlug: '2025-26',
    ldcCap: 14.63,
    schoolAgeCap: 12.81,
    fdcCap: 13.56,
    standardFull: 85_279,
    standardZero: 535_279,
    higher95: 143_273,
    higher95TaperEnd: 188_273,
    higher80FlatEnd: 267_563,
    higher80TaperEnd: 357_563,
    higher50End: 367_563,
  },
  new: {
    id: 'new',
    fyLabel: '2026–27',
    urlSlug: '2026-27',
    ldcCap: 15.19,
    schoolAgeCap: 13.30,
    fdcCap: 14.08,
    standardFull: 88_520,
    standardZero: 538_520,
    higher95: 146_437,
    higher95TaperEnd: 191_437,
    higher80FlatEnd: 270_727,
    higher80TaperEnd: 360_727,
    higher50End: 370_727,
  },
}

export function getRateSet(id: RateSetId): RateSet {
  return RATE_SETS[id]
}

// The rate set used by default — the latest rates. This is what every visitor
// sees unless they explicitly opt into a historical set via the `?rates=` URL
// param (see the Settings page).
export const DEFAULT_RATE_SET = RATE_SETS.new

/** Resolve a `?rates=` URL slug to a rate set, or null if it isn't recognised. */
export function getRateSetBySlug(slug: string | undefined | null): RateSet | null {
  if (!slug) return null
  for (const set of Object.values(RATE_SETS)) {
    if (set.urlSlug === slug) return set
  }
  return null
}

// Default rate set used when a calculator is called without an explicit set
// (tests, and any non-UI caller). The UI always passes the user's selection.
const DEFAULT_RATES = RATE_SETS.new

// Hourly fee caps for the default (latest) rate set. Retained as named exports
// for callers that just want the headline FY2026-27 figures.
export const CCS_HOURLY_RATE_CAP = DEFAULT_RATES.ldcCap
export const CCS_HOURLY_RATE_CAP_SCHOOL_AGE = DEFAULT_RATES.schoolAgeCap
export const FDC_HOURLY_RATE_CAP = DEFAULT_RATES.fdcCap

// CCS Withholding default
export const DEFAULT_WITHHOLDING_PERCENT = 5

// Activity test hours per fortnight (from January 2026 "3 Day Guarantee")
// All CCS-eligible families get at least 72 hrs; 100 hrs if both parents do 48+ hrs of activity
export const ACTIVITY_TEST_HOURS = {
  base: 72,
  higher: 100,
} as const

/** Round to 2 decimal places, as Schedule 2 requires for tapered percentages. */
function roundPercent(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Standard CCS percentage (A New Tax System (Family Assistance) Act 1999,
 * Schedule 2 clause 3). Between the thresholds it's a continuous taper, not
 * whole-percent steps:
 *   90 − (income − lower threshold) ÷ 5,000, rounded to 2 decimal places.
 * e.g. $100,000 in FY2026-27 → 90 − 11,480 ÷ 5,000 = 87.70%.
 */
export function calculateStandardCcsPercent(income: number, rates: RateSet = DEFAULT_RATES): number {
  if (income <= rates.standardFull) return 90
  if (income >= rates.standardZero) return 0
  return roundPercent(90 - (income - rates.standardFull) / 5_000)
}

/**
 * Higher CCS percentage for a 2nd+ child aged 5 or under (Schedule 2 clause 3A).
 * Continuous tapers, rounded to 2 decimal places:
 *   - up to `higher95`: 95%
 *   - to `higher95TaperEnd`: 95 − (income − higher95) ÷ 3,000 (the Act writes this
 *     as the lesser of 95% and 115 − (income − lower other-rate threshold) ÷ 3,000;
 *     `higher95` is that threshold + $60,000, so they're the same)
 *   - to `higher80FlatEnd`: 80%
 *   - to `higher80TaperEnd`: 80 − (income − higher80FlatEnd) ÷ 3,000
 *   - to `higher50End`: 50%
 * At or above `higher50End` the higher rate doesn't apply and the standard rate
 * does (clause 3A(1)(c)); and if the standard rate is ever higher, it wins
 * (clause 3A(2)).
 */
export function calculateHigherCcsPercent(income: number, rates: RateSet = DEFAULT_RATES): number {
  const standard = calculateStandardCcsPercent(income, rates)
  if (income >= rates.higher50End) return standard

  let higher: number
  if (income <= rates.higher95) higher = 95
  else if (income < rates.higher95TaperEnd) higher = roundPercent(95 - (income - rates.higher95) / 3_000)
  else if (income < rates.higher80FlatEnd) higher = 80
  else if (income < rates.higher80TaperEnd) higher = roundPercent(80 - (income - rates.higher80FlatEnd) / 3_000)
  else higher = 50

  return Math.max(higher, standard)
}

export interface CcsEstimateInputs {
  income: number
  numberOfChildren: number
  isFirstChildUnder6: boolean
  useHigherCcs: boolean
}

export interface CcsEstimateResult {
  standardPercent: number
  higherPercent: number
  applicablePercent: number
  hourlyRateCap: number
}

/**
 * Estimate CCS % for a family.
 * useHigherCcs = true for 2nd+ under-6 child when income < the Higher CCS zero threshold.
 */
export function estimateCcs(inputs: CcsEstimateInputs, rates: RateSet = DEFAULT_RATES): CcsEstimateResult {
  const standardPercent = calculateStandardCcsPercent(inputs.income, rates)
  const higherPercent = calculateHigherCcsPercent(inputs.income, rates)

  const eligibleForHigher =
    inputs.useHigherCcs &&
    inputs.numberOfChildren > 1 &&
    inputs.income < rates.higher50End

  return {
    standardPercent,
    higherPercent,
    applicablePercent: eligibleForHigher ? higherPercent : standardPercent,
    hourlyRateCap: rates.ldcCap,
  }
}
