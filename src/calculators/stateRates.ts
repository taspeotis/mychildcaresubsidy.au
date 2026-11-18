// State and territory rate tables, by calendar year.
//
// Separate from the federal CCS rate sets (ccs.ts) because the schemes run on
// different years: CCS rates change each financial year (July), state and
// territory kindy/preschool funding changes each calendar year (January). So a
// parent in December wants FY2026-27 CCS with 2026 state rates, and in February
// the same CCS with 2027 state rates.
//
// Only NSW and VIC carry dollar amounts. QLD Free Kindy and ACT Three-Year-Old
// Preschool fund the kindy/preschool hours directly (they cover the gap), so
// there's nothing year-specific to store for them.
//
// Sources:
//   - NSW 2027: "2027 Fee Relief for Long Day Care program guidelines",
//     education.nsw.gov.au, section 5.8 Table 1 (replaces Start Strong for
//     Long Day Care from 1 January 2027).
//   - VIC 2027: "2027 Kindergarten funding rates", vic.gov.au (updated
//     28 October 2026), long day care Free Kinder rate, first 15 hours/week.

export type StateRateYearId = '2026' | '2027'

export interface NswFeeReliefRates {
  /** Scheme name parents know it by that year. */
  name: string
  /** Who gets the maximum rate that year. */
  maximumEligibility: string
  '4+': { standard: number; maximum: number }
  '3': { standard: number; maximum: number }
}

export interface VicFreeKinderRates {
  /** Annual offset for a 15 hr/wk program, pro-rated for fewer hours. */
  offset: { standard: number; priority: number }
  /** Program weeks the annual offset is spread across. */
  weeks: number
}

export interface StateRateYear {
  id: StateRateYearId
  /** Calendar year the rates apply to; also the value of the `?state=` URL param. */
  year: number
  nsw: NswFeeReliefRates
  vic: VicFreeKinderRates
}

export const STATE_RATE_YEARS: Record<StateRateYearId, StateRateYear> = {
  '2026': {
    id: '2026',
    year: 2026,
    nsw: {
      name: 'Start Strong',
      maximumEligibility: 'Maximum rate applies if your child is Aboriginal/Torres Strait Islander, from a low-income family, has disability/additional needs, or attends a service in a disadvantaged or regional area.',
      '4+': { standard: 1783, maximum: 2563 },
      '3': { standard: 423, maximum: 769 },
    },
    vic: {
      offset: { standard: 2101, priority: 2693 },
      weeks: 40,
    },
  },
  '2027': {
    id: '2027',
    year: 2027,
    // Officially "Fee Relief for Long Day Care"
    nsw: {
      name: 'Preschool Fee Relief',
      maximumEligibility: 'Maximum rate applies if your child is Aboriginal and/or Torres Strait Islander, or attends a service in a regional or remote area, in a disadvantaged area, or run by an Aboriginal Community Controlled Organisation. Your centre can tell you which rate applies.',
      '4+': { standard: 1826, maximum: 2625 },
      '3': { standard: 434, maximum: 788 },
    },
    vic: {
      offset: { standard: 2154, priority: 2760 },
      // The rules only require the offset to be applied "weekly, or fortnightly";
      // 40 weeks is the department's own worked example. Services can choose
      // their schedule (one provider spreads 2027 over 44 weeks), so the real
      // per-week figure can vary.
      weeks: 40,
    },
  },
}

// The rate year used by default: the latest. Every visitor sees this unless they
// opt into an earlier year via the `?state=` URL param (see the Settings page).
export const DEFAULT_STATE_RATE_YEAR = STATE_RATE_YEARS['2027']

/** Resolve a `?state=` URL value (a calendar year) to a rate year, or null if it isn't recognised. */
export function getStateRateYear(year: number | undefined | null): StateRateYear | null {
  if (year == null) return null
  for (const set of Object.values(STATE_RATE_YEARS)) {
    if (set.year === year) return set
  }
  return null
}

/**
 * The date the default (latest) state rates take effect: 1 January of their
 * year, local time. Before then the site is showing next year's rates early, and
 * the Banner says so.
 */
export function defaultStateRatesStart(): Date {
  return new Date(DEFAULT_STATE_RATE_YEAR.year, 0, 1)
}
