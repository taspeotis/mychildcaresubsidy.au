import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Container } from './Container'
import { useRates } from '../context/RatesState'
import { RATES_EFFECTIVE } from '../calculators/ccs'

// Bump the version suffix when a new rate-change notice should re-appear for
// users who dismissed a previous one.
const DISMISS_KEY = 'mccs.banner.fy2627-rates'

const ARTICLE_URL =
  'https://www.education.gov.au/early-childhood/announcements/child-care-subsidy-hourly-rate-caps-are-changing-soon-1'

/**
 * Site-wide notice mounted above every route.
 *
 * Two modes:
 *  - Default (latest rates): a dismissable heads-up that the rates change on
 *    6 July 2026 and the calculators already use them. Auto-hides once those
 *    rates take effect. Mentions, quietly, that the previous rates are
 *    available in Settings.
 *  - Historical (a `?rates=` set is active): a persistent, non-dismissable
 *    notice that an older rate set is in use, with a one-click way back.
 */
export function RateChangeBanner() {
  const { rateSet, isDefault } = useRates()
  const { pathname } = useLocation()

  if (!isDefault) {
    // The historical notice is for when you're actually using a calculator, so
    // don't show it on the Settings page where the rate year is chosen.
    if (pathname === '/settings') return null
    return (
      <Container className="pt-6">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-snug text-amber-900 sm:items-center sm:gap-4 sm:p-5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 sm:mt-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.75 2.25M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
            </svg>
          </span>
          <div className="min-w-0">
            <span className="font-semibold">You&rsquo;re viewing historical FY{rateSet.fyLabel} rates.</span>{' '}
            <span className="text-amber-800/90">
              These are the Child Care Subsidy caps and thresholds from that year, kept for checking
              past estimates.{' '}
              <Link
                to="."
                search={() => ({})}
                className="font-medium text-amber-900 underline underline-offset-2 transition-colors hover:text-amber-950"
              >
                Switch to current rates
              </Link>
              .
            </span>
          </div>
        </div>
      </Container>
    )
  }

  return <DefaultRateBanner />
}

function DefaultRateBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  // Once the new rates take effect, "changing soon" is no longer accurate (and
  // they're now the current rates), so the heads-up hides itself.
  if (dismissed || new Date() >= RATES_EFFECTIVE) return null

  function dismiss() {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // localStorage may be unavailable (private browsing, quota); the banner
      // simply reappears next load. No functional impact.
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
          <span className="font-semibold">Child Care Subsidy rates are changing soon.</span>{' '}
          <span className="text-brand-800/90">
            Our calculations have been updated to use the FY26&ndash;27 rates.{' '}
            <a
              href={ARTICLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-700 underline underline-offset-2 transition-colors hover:text-brand-900"
            >
              Read the announcement
            </a>
            .{' '}
            <span className="text-brand-700/80">
              Checking figures against last year&rsquo;s rates? You can switch to the previous
              FY2025&ndash;26 rates in{' '}
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
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Container>
  )
}
