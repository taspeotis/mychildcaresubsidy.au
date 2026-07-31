import { Link, useLocation } from '@tanstack/react-router'
import { Container } from './Container'
import { useRates } from '../context/RatesState'

/**
 * Site-wide notice mounted at the top of `<main>` in `__root.tsx`.
 *
 * Only shows when a historical `?rates=` set is active: a persistent,
 * non-dismissable reminder that an older rate year is in use, with a one-click
 * way back to the current rates. On the latest rates there is nothing to say,
 * so it renders nothing.
 */
export function Banner() {
  const { rateSet, isDefault } = useRates()
  const { pathname } = useLocation()

  if (isDefault) return null

  // The notice is for when you're actually using a calculator, so don't show it
  // on the Settings page where the rate year is chosen.
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
