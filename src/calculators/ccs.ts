// FY2026 Child Care Subsidy rate tables per Commonwealth legislation

// Hourly fee caps (FY2026)
export const CCS_HOURLY_RATE_CAP = 14.63 // Centre Based LDC, below school age
export const CCS_HOURLY_RATE_CAP_SCHOOL_AGE = 12.81
export const FDC_HOURLY_RATE_CAP = 13.56

// CCS Withholding default
export const DEFAULT_WITHHOLDING_PERCENT = 5

// Activity test hours per fortnight
export const ACTIVITY_TEST_HOURS = {
  '8-16': 36,
  '17-48': 72,
  '48+': 100,
} as const

/**
 * Calculate Standard CCS percentage based on family adjusted taxable income.
 * FY2026 rates.
 */
export function calculateStandardCcsPercent(income: number): number {
  if (income <= 83_280) return 90
  if (income >= 533_280) return 0

  // Tapers at 1% per $5,000 from 90%
  const reduction = Math.floor((income - 83_280) / 5_000) * 1
  return Math.max(0, 90 - reduction)
}

/**
 * Calculate Higher CCS percentage for 2nd+ under-6 child.
 * FY2026 rates.
 */
export function calculateHigherCcsPercent(income: number): number {
  if (income <= 141_321) return 95
  if (income >= 365_611) return 0

  if (income < 186_321) {
    // Tapers at 1% per $3,000 from 95%
    const reduction = Math.floor((income - 141_321) / 3_000) * 1
    return Math.max(80, 95 - reduction)
  }

  if (income < 265_611) return 80

  if (income < 355_611) {
    // Tapers at 1% per $3,000 from 80%
    const reduction = Math.floor((income - 265_611) / 3_000) * 1
    return Math.max(50, 80 - reduction)
  }

  if (income < 365_611) return 50

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
 * useHigherCcs = true for 2nd+ under-6 child when income < $365,611
 */
export function estimateCcs(inputs: CcsEstimateInputs): CcsEstimateResult {
  const standardPercent = calculateStandardCcsPercent(inputs.income)
  const higherPercent = calculateHigherCcsPercent(inputs.income)

  const eligibleForHigher =
    inputs.useHigherCcs &&
    inputs.numberOfChildren > 1 &&
    inputs.income < 365_611

  return {
    standardPercent,
    higherPercent,
    applicablePercent: eligibleForHigher ? higherPercent : standardPercent,
    hourlyRateCap: CCS_HOURLY_RATE_CAP,
  }
}
