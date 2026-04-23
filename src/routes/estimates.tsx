import { useMemo } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { StickyPanel } from '../components/StickyPanel'
import { PlanEntryRow } from '../components/PlanEntryRow'
import { Button } from '../components/Button'
import { usePlan } from '../plan/PlanState'
import { calculateEntry } from '../plan/snapshot'
import { formatEntryLabel } from '../plan/labels'
import type { PlanEntry, PlanEntryResult } from '../plan/types'
import { fmt } from '../config'

export const Route = createFileRoute('/estimates')({
  component: EstimatesPage,
})

interface CalculatedEntry {
  entry: PlanEntry
  result: PlanEntryResult | null
  label: string
}

function EstimatesPage() {
  const { entries, deleteEntry, clearAll, startEditing } = usePlan()
  const navigate = useNavigate()

  const calculated = useMemo<CalculatedEntry[]>(
    () => entries.map((entry, i) => ({
      entry,
      result: calculateEntry(entry),
      label: formatEntryLabel(entry, i + 1),
    })),
    [entries],
  )

  const fortnightly = calculated.filter((c) => c.entry.mode !== 'daily')
  const daily = calculated.filter((c) => c.entry.mode === 'daily')
  const hasBoth = fortnightly.length > 0 && daily.length > 0

  const fortnightlyTotals = totals(fortnightly)
  const dailyTotals = totals(daily)

  const showSiblingNudge =
    entries.length >= 2 &&
    new Set(entries.map((e) => e.shared.ccsPercent)).size === 1

  function handleEdit(entry: PlanEntry) {
    startEditing(entry.id)
    navigate({ to: `/${entry.scheme}` })
  }

  function handleClearAll() {
    if (window.confirm('Remove all your estimates? This cannot be undone.')) {
      clearAll()
    }
  }

  return (
    <Container className="py-10">
      <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-10 xl:grid-cols-[360px_1fr]">
        {/* Sidebar panel */}
        <aside className="relative mb-8 lg:mb-0">
          <StickyPanel className="rounded-2xl sidebar-gradient p-6 lg:p-8">
            <Link
              to="/"
              className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back
            </Link>
            <h1 className="mb-3 text-2xl font-bold leading-tight tracking-tight text-white">Your Estimates</h1>
            <p className="text-sm leading-relaxed text-white/70">
              Saved from the calculators. Edit any estimate to revisit the full calculator for that child.
            </p>
            {entries.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-white/50">Saved</p>
                <p className="mt-2 text-sm text-white/80">
                  {entries.length} {entries.length === 1 ? 'estimate' : 'estimates'}
                </p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="mt-4 text-xs font-medium text-white/60 underline underline-offset-2 transition-colors hover:text-white"
                >
                  Clear All
                </button>
              </div>
            )}
          </StickyPanel>
        </aside>

        {/* Main content */}
        <div className="min-w-0 space-y-6">
          {entries.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {showSiblingNudge && (
                <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
                  <p className="font-bold">Have you set the sibling rate?</p>
                  <p className="mt-1">
                    The second and later children in care usually qualify for a higher CCS percentage (up to 95%).
                    Edit each sibling to reflect your actual rate from myGov.
                  </p>
                </div>
              )}

              {fortnightly.length > 0 && (
                <GroupCard
                  title="Fortnightly Estimates"
                  periodLabel="Fortnight"
                  calculated={fortnightly}
                  totals={fortnightlyTotals}
                  onEdit={handleEdit}
                  onDelete={deleteEntry}
                />
              )}

              {hasBoth && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-bold">Mixed daily and fortnightly estimates</p>
                  <p className="mt-1">
                    Daily estimates don't capture attendance across a full fortnight (including kindy/preschool days),
                    so we haven't combined them with your fortnightly totals.
                    Edit each daily entry and switch to Weekly or Fortnightly mode for a more accurate household picture.
                  </p>
                </div>
              )}

              {daily.length > 0 && (
                <GroupCard
                  title="Daily Estimates"
                  periodLabel="Day"
                  calculated={daily}
                  totals={dailyTotals}
                  onEdit={handleEdit}
                  onDelete={deleteEntry}
                />
              )}
            </>
          )}
        </div>
      </div>
    </Container>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl card-glass p-8 text-center">
      <h2 className="text-lg font-bold text-slate-900">No estimates yet</h2>
      <p className="mt-2 text-sm text-slate-600">
        Open a calculator, fill in your details, and click{' '}
        <span className="font-bold text-accent-600">Add Estimate</span> at the bottom to save one here.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button href="/ccs" color="brand">CCS</Button>
        <Button href="/act">ACT</Button>
        <Button href="/nsw">NSW</Button>
        <Button href="/qld">QLD</Button>
        <Button href="/vic">VIC</Button>
      </div>
    </div>
  )
}

interface GroupCardProps {
  title: string
  periodLabel: string
  calculated: CalculatedEntry[]
  totals: ReturnType<typeof totals>
  onEdit: (entry: PlanEntry) => void
  onDelete: (id: string) => void
}

function GroupCard({ title, periodLabel, calculated, totals, onEdit, onDelete }: GroupCardProps) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">{title}</h2>
        <p className="text-xs text-white/60">{calculated.length} {calculated.length === 1 ? 'entry' : 'entries'}</p>
      </div>
      <div className="space-y-3">
        {calculated.map(({ entry, result, label }) => (
          <PlanEntryRow
            key={entry.id}
            entry={entry}
            result={result}
            label={label}
            onEdit={() => onEdit(entry)}
            onDelete={() => onDelete(entry.id)}
          />
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-brand-50 to-accent-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-900">Household Total Per {periodLabel}</p>
          <p className="text-2xl font-bold tabular-nums text-brand-700">{fmt(totals.gap)}</p>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Session fees</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-slate-900">{fmt(totals.sessionFees)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">CCS</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-green-700">{fmt(totals.ccsEntitlement)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">State funding</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-green-700">{fmt(totals.stateFunding)}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

function totals(items: CalculatedEntry[]) {
  return items.reduce(
    (acc, { result }) => {
      if (!result) return acc
      acc.sessionFees += result.sessionFees
      acc.ccsEntitlement += result.ccsEntitlement
      acc.stateFunding += result.stateFunding
      acc.gap += result.gap
      return acc
    },
    { sessionFees: 0, ccsEntitlement: 0, stateFunding: 0, gap: 0 },
  )
}
