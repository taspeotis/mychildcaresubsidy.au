import { useSearch } from '@tanstack/react-router'
import { DEFAULT_RATE_SET, getRateSetBySlug, type RateSet } from '../calculators/ccs'
import { DEFAULT_STATE_RATE_YEAR, getStateRateYear, type StateRateYear } from '../calculators/stateRates'

/**
 * The active CCS rate set, derived from the `?rates=` URL search param.
 *
 * Selection lives entirely in the URL — there is no stored preference. A bare
 * URL (no `rates` param) always resolves to the latest rates, so the default
 * visitor experience never changes and is never "stuck" on an old set. A
 * historical set is opted into via the Settings page, which produces
 * bookmarkable links like `/qld?rates=2025-26` for services double-checking
 * past kindy-funding figures.
 *
 * Calculators pass the returned `rateSet` into the pure calculation functions,
 * so switching rates (i.e. navigating to a `?rates=` link) recomputes results.
 */
export function useRates(): { rateSet: RateSet; isDefault: boolean } {
  const search = useSearch({ strict: false }) as { rates?: string }
  const rateSet = getRateSetBySlug(search.rates) ?? DEFAULT_RATE_SET
  return { rateSet, isDefault: rateSet.id === DEFAULT_RATE_SET.id }
}

/**
 * The active state and territory rate year, derived from the `?state=` URL
 * search param. Same URL-only approach as `useRates()`: a bare URL always
 * resolves to the latest year.
 *
 * Kept separate from the CCS rate set because the two change at different times
 * of year (CCS in July, state and territory funding in January).
 */
export function useStateRates(): { stateRates: StateRateYear; isDefault: boolean } {
  const search = useSearch({ strict: false }) as { state?: number }
  const stateRates = getStateRateYear(search.state) ?? DEFAULT_STATE_RATE_YEAR
  return { stateRates, isDefault: stateRates.id === DEFAULT_STATE_RATE_YEAR.id }
}
