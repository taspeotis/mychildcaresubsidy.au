import { useSearch } from '@tanstack/react-router'
import { DEFAULT_RATE_SET, getRateSetBySlug, type RateSet } from '../calculators/ccs'

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
