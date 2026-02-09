// FY2026 Child Care Subsidy rate tables per Commonwealth legislation

// Hourly fee caps (FY2026)
export const CCS_HOURLY_RATE_CAP = 14.63 // Centre Based LDC, below school age
export const CCS_HOURLY_RATE_CAP_SCHOOL_AGE = 12.81
export const FDC_HOURLY_RATE_CAP = 13.56

// CCS Withholding default
export const DEFAULT_WITHHOLDING_PERCENT = 5

// Activity test hours per fortnight (from January 2026 "3 Day Guarantee")
// All CCS-eligible families get at least 72 hrs; 100 hrs if both parents do 48+ hrs of activity
export const ACTIVITY_TEST_HOURS = {
  base: 72,
  higher: 100,
} as const

/**
 * Calculate Standard CCS percentage based on family adjusted taxable income.
 * FY2025-26 rates per Services Australia (updated 7 July 2025).
 */
export function calculateStandardCcsPercent(income: number): number {
  if (income <= 85_279) return 90
  if (income >= 535_279) return 0

  // Tapers at 1% per $5,000 from 90%
  const reduction = Math.floor((income - 85_279) / 5_000) * 1
  return Math.max(0, 90 - reduction)
}

/**
 * Calculate Higher CCS percentage for 2nd+ under-6 child.
 * FY2025-26 rates per education.gov.au.
 */
export function calculateHigherCcsPercent(income: number): number {
  if (income <= 143_273) return 95
  if (income >= 367_563) return 0

  if (income < 188_273) {
    // Tapers at 1% per $3,000 from 95%
    const reduction = Math.floor((income - 143_273) / 3_000) * 1
    return Math.max(80, 95 - reduction)
  }

  if (income < 267_563) return 80

  if (income < 357_563) {
    // Tapers at 1% per $3,000 from 80%
    const reduction = Math.floor((income - 267_563) / 3_000) * 1
    return Math.max(50, 80 - reduction)
  }

  if (income < 367_563) return 50

  return 0
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
 * useHigherCcs = true for 2nd+ under-6 child when income < $367,563
 */
export function estimateCcs(inputs: CcsEstimateInputs): CcsEstimateResult {
  const standardPercent = calculateStandardCcsPercent(inputs.income)
  const higherPercent = calculateHigherCcsPercent(inputs.income)

  const eligibleForHigher =
    inputs.useHigherCcs &&
    inputs.numberOfChildren > 1 &&
    inputs.income < 367_563

  return {
    standardPercent,
    higherPercent,
    applicablePercent: eligibleForHigher ? higherPercent : standardPercent,
    hourlyRateCap: CCS_HOURLY_RATE_CAP,
  }
}
