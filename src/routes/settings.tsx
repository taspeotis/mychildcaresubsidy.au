import type { ReactNode } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Page } from '../components/Page'
import { useRates, useStateRates } from '../context/RatesState'
import { RATE_SETS, DEFAULT_RATE_SET } from '../calculators/ccs'
import { STATE_RATE_YEARS, DEFAULT_STATE_RATE_YEAR } from '../calculators/stateRates'
import { fmt, fmtWhole } from '../config'
import { pageMeta } from '../seo'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
  head: () => pageMeta({
    title: 'Settings',
    description: 'Choose which Child Care Subsidy and state and territory rate years the calculators use.',
    noindex: true,
  }),
})

const CALCULATORS = [
  { to: '/ccs', label: 'CCS', name: 'Federal Child Care Subsidy' },
  { to: '/act', label: 'ACT', name: 'Three-Year-Old Preschool' },
  { to: '/nsw', label: 'NSW', name: 'Preschool Fee Relief' },
  { to: '/qld', label: 'QLD', name: 'Free Kindy' },
  { to: '/vic', label: 'VIC', name: 'Free Kinder' },
] as const

// Default first, then any earlier sets.
const RATE_OPTIONS = [DEFAULT_RATE_SET, RATE_SETS.current]
const STATE_RATE_OPTIONS = [DEFAULT_STATE_RATE_YEAR, STATE_RATE_YEARS['2026']]

function SettingsPage() {
  const { rateSet, isDefault: ccsIsDefault } = useRates()
  const { stateRates, isDefault: stateIsDefault } = useStateRates()

  // The current selection as calculator link search params (defaults omitted).
  const selection = {
    ...(ccsIsDefault ? {} : { rates: rateSet.urlSlug }),
    ...(stateIsDefault ? {} : { state: stateRates.year }),
  }

  return (
    <Page
      title="Settings"
      sidebar={
        <>
          <p className="text-sm leading-relaxed text-white/70">
            By default the calculators use the latest rates. If you&rsquo;re checking figures
            against another year, you can switch rate years here.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Most families won&rsquo;t need this.
          </p>
        </>
      }
    >
      <div className="space-y-6">
        <section className="rounded-2xl card-glass p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900">Child Care Subsidy rate year</h2>
          <p className="mt-1 text-sm text-slate-600">
            The financial year whose CCS hourly rate caps and income thresholds the calculators apply.
          </p>
          <div className="mt-4 space-y-3">
            {RATE_OPTIONS.map((set) => (
              <RateOption
                key={set.id}
                selected={set.id === rateSet.id}
                search={(prev) => ({ ...prev, rates: set.id === DEFAULT_RATE_SET.id ? undefined : set.urlSlug })}
                title={`FY${set.fyLabel}`}
                detail={`Rate caps: ${fmt(set.ldcCap)}/hr LDC · ${fmt(set.schoolAgeCap)}/hr school age · ${fmt(set.fdcCap)}/hr FDC`}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl card-glass p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900">State and territory rate year</h2>
          <p className="mt-1 text-sm text-slate-600">
            The calendar year whose NSW and VIC funding amounts the calculators apply. QLD Free Kindy
            and ACT Three-Year-Old Preschool cover the gap for funded hours, so they don&rsquo;t
            change by year.
          </p>
          <div className="mt-4 space-y-3">
            {STATE_RATE_OPTIONS.map((year) => (
              <RateOption
                key={year.id}
                selected={year.id === stateRates.id}
                search={(prev) => ({ ...prev, state: year.id === DEFAULT_STATE_RATE_YEAR.id ? undefined : year.year })}
                title={String(year.year)}
                detail={`NSW ${year.nsw.name} up to ${fmtWhole(year.nsw['4+'].maximum)}/yr · VIC Free Kinder up to ${fmtWhole(year.vic.offset.priority)}/yr`}
              />
            ))}
          </div>
        </section>

        <div className={`reveal ${ccsIsDefault && stateIsDefault ? '' : 'reveal-open'}`}>
          <div className="reveal__content">
            <section className="rounded-2xl card-glass p-6 sm:p-8">
              <h2 className="text-lg font-bold text-slate-900">Open a calculator</h2>
              <p className="mt-1 text-sm text-slate-600">
                Open a calculator with these rates. Bookmark it to come straight back.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {CALCULATORS.map((c) => (
                  <Link
                    key={c.to}
                    to={c.to}
                    search={selection}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-accent-300 hover:bg-accent-50/40"
                  >
                    <span className="flex h-8 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-xs font-bold text-white">
                      {c.label}
                    </span>
                    <span className="min-w-0 text-sm font-medium text-slate-900">{c.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </Page>
  )
}

type SettingsSearch = { rates?: string; state?: number }

function RateOption({ selected, search, title, detail }: {
  selected: boolean
  search: (prev: SettingsSearch) => SettingsSearch
  title: string
  detail: ReactNode
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border transition-colors ${
        selected
          ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-300'
          : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/40'
      }`}
    >
      <Link
        to="/settings"
        search={search}
        resetScroll={false}
        aria-current={selected ? 'true' : undefined}
        className="flex items-start gap-3 p-4"
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent'
          }`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
      </Link>
    </div>
  )
}
