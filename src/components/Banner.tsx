import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Container } from './Container'
import { useRates, useStateRates } from '../context/RatesState'
import { useEstimates } from '../estimates/EstimatesState'
import { DEFAULT_STATE_RATE_YEAR, defaultStateRatesStart } from '../calculators/stateRates'

// Remembers a dismissed state-rates heads-up. Bump the suffix for the next
// year's heads-up so it re-surfaces for people who dismissed this one.
const DISMISS_KEY = `mccs.banner.state-rates-${DEFAULT_STATE_RATE_YEAR.year}`

/**
 * Site-wide notice mounted at the top of `<main>` in `__root.tsx`. Two modes:
 *
 * 1. **Earlier rates in use.** When the URL picks an earlier CCS rate set
 *    (`?rates=`) or state and territory rate year (`?state=`): a persistent,
 *    non-dismissable amber notice with a one-click way back to the latest rates.
 *
 * 2. **Heads-up: updated to next year's state rates.** The calculators default to
 *    the latest state and territory rates as soon as they're published, even
 *    before they start on 1 January. Until then, a dismissable purple notice on
 *    the pages whose amounts changed (NSW, VIC, and Estimates when it holds one
 *    of those) says so, and quietly points to Settings for the previous year.
 *    Hides itself from 1 January.
 *
 * Neither shows on `/settings`, where the rate years are chosen.
 */
export function Banner() {
  const { rateSet, isDefault: ccsIsDefault } = useRates()
  const { stateRates, isDefault: stateIsDefault } = useStateRates()
  const { estimates } = useEstimates()
  const { pathname } = useLocation()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  if (pathname === '/settings') return null

  if (!ccsIsDefault || !stateIsDefault) {
    const viewing = [
      !ccsIsDefault && `FY${rateSet.fyLabel} Child Care Subsidy rates`,
      !stateIsDefault && `${stateRates.year} state and territory rates`,
    ].filter(Boolean).join(' and ')

    return (
      <Container className="pt-6">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-snug text-amber-900 sm:items-center sm:gap-4 sm:p-5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 sm:mt-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.75 2.25M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
            </svg>
          </span>
          <div className="min-w-0">
            <span className="font-semibold">You&rsquo;re viewing {viewing}.</span>{' '}
            <span className="text-amber-800/90">
              <Link
                to="."
                search={() => ({})}
                className="font-medium text-amber-900 underline underline-offset-2 transition-colors hover:text-amber-950"
              >
                Switch to the latest rates
              </Link>
              .
            </span>
          </div>
        </div>
      </Container>
    )
  }

  // Mode 2: heads-up that the calculators already use next year's state rates.
  if (dismissed || new Date() >= defaultStateRatesStart()) return null

  const message = headsUpMessage(pathname, estimates.some((e) => e.scheme === 'nsw' || e.scheme === 'vic'))
  if (!message) return null

  function dismiss() {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // localStorage may be unavailable (private browsing, quota); the banner
      // still hides for this visit.
    }
  }

  return (
    <Container className="pt-6">
      <div className="relative flex items-start gap-3 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100 p-4 pr-11 shadow-sm sm:items-center sm:gap-4 sm:p-5 sm:pr-14">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-brand-700 sm:mt-0">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0V11.25A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        </span>

        <div className="min-w-0 text-sm leading-snug text-brand-900">
          <span className="font-semibold">Updated for {DEFAULT_STATE_RATE_YEAR.year}.</span>{' '}
          <span className="text-brand-800/90">
            {message}{' '}
            <span className="text-brand-700/80">
              Need {DEFAULT_STATE_RATE_YEAR.year - 1} figures? Switch rate years in{' '}
              <Link
                to="/settings"
                search={(prev) => prev}
                className="font-medium text-brand-700 underline underline-offset-2 transition-colors hover:text-brand-900"
              >
                Settings
              </Link>
              .
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notice"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 transition-colors hover:bg-brand-200/60 hover:text-brand-800 sm:top-1/2 sm:right-3 sm:-translate-y-1/2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Container>
  )
}

/** What changed, for the pages whose figures it affects. */
function headsUpMessage(pathname: string, hasAffectedEstimate: boolean): string | null {
  const year = DEFAULT_STATE_RATE_YEAR.year
  switch (pathname) {
    case '/nsw':
      return `Start Strong is now Preschool Fee Relief, and this calculator uses the ${year} amounts.`
    case '/vic':
      return `This calculator uses the ${year} Free Kinder amounts.`
    case '/estimates':
      return hasAffectedEstimate ? `NSW and VIC estimates use the ${year} state funding amounts.` : null
    default:
      return null
  }
}
