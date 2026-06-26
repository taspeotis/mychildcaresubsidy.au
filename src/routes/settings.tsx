import { createFileRoute, Link } from '@tanstack/react-router'
import { Page } from '../components/Page'
import { useRates } from '../context/RatesState'
import { RATE_SETS, DEFAULT_RATE_SET } from '../calculators/ccs'
import { fmt } from '../config'
import { pageMeta } from '../seo'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
  head: () => pageMeta({
    title: 'Settings',
    description: 'Choose which Child Care Subsidy rate year the calculators use.',
    noindex: true,
  }),
})

const CALCULATORS = [
  { to: '/ccs', label: 'CCS', name: 'Federal Child Care Subsidy' },
  { to: '/act', label: 'ACT', name: 'Three-Year-Old Preschool' },
  { to: '/nsw', label: 'NSW', name: 'Start Strong' },
  { to: '/qld', label: 'QLD', name: 'Free Kindy' },
  { to: '/vic', label: 'VIC', name: 'Free Kinder' },
] as const

// Default first, then any historical sets.
const RATE_OPTIONS = [DEFAULT_RATE_SET, RATE_SETS.current]

function SettingsPage() {
  const { rateSet } = useRates()

  return (
    <Page
      title="Settings"
      sidebar={
        <>
          <p className="text-sm leading-relaxed text-white/70">
            By default the calculators use the latest Child Care Subsidy rates. If you&rsquo;re
            checking figures against a past year, you can switch to a historical rate year here.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Most families won&rsquo;t need this.
          </p>
        </>
      }
    >
      <section className="rounded-2xl card-glass p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Rate year</h2>
        <p className="mt-1 text-sm text-slate-600">
          The financial year whose CCS hourly rate caps and income thresholds the calculators apply.
        </p>
        <div className="mt-4 space-y-3">
          {RATE_OPTIONS.map((set) => {
            const selected = set.id === rateSet.id
            const isDefaultOption = set.id === DEFAULT_RATE_SET.id
            return (
              <div
                key={set.id}
                className={`overflow-hidden rounded-xl border transition-colors ${
                  selected
                    ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-300'
                    : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/40'
                }`}
              >
                <Link
                  to="/settings"
                  search={isDefaultOption ? {} : { rates: set.urlSlug }}
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
                    <p className="text-sm font-bold text-slate-900">FY{set.fyLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Rate caps: {fmt(set.ldcCap)}/hr LDC · {fmt(set.schoolAgeCap)}/hr school age · {fmt(set.fdcCap)}/hr FDC
                    </p>
                  </div>
                </Link>

                {!isDefaultOption && (
                  <div className={`reveal ${selected ? 'reveal-open' : ''}`}>
                    <div className="reveal__content">
                      <div className="border-t border-brand-200/70 px-4 pb-4 pt-4">
                        <p className="text-sm text-slate-600">
                          Open a calculator with these rates. Bookmark it to come straight back.
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {CALCULATORS.map((c) => (
                            <Link
                              key={c.to}
                              to={c.to}
                              search={{ rates: set.urlSlug }}
                              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-accent-300 hover:bg-accent-50/40"
                            >
                              <span className="flex h-8 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-xs font-bold text-white">
                                {c.label}
                              </span>
                              <span className="min-w-0 text-sm font-medium text-slate-900">{c.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </Page>
  )
}
