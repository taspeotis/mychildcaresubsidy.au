import { useState } from 'react'
import clsx from 'clsx'
import type { ColorScheme } from '../types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

export interface DayConfig {
  booked: boolean
  sessionFee: string
  sessionStart: number
  sessionEnd: number
  hasKindy: boolean
}

export interface DayResult {
  ccsEntitlement: number
  kindyFunding: number
  gapFee: number
}

export interface FortnightlyGridProps {
  days: DayConfig[]
  onChange: (days: DayConfig[]) => void
  results: DayResult[] | null
  kindyToggle?: {
    label: string
    maxPerWeek?: number
  }
  fundingLabel: string
  fmt: (n: number) => string
  colorScheme?: ColorScheme
}

export function createDefaultDays(
  defaults: { sessionFee: string; sessionStart: number; sessionEnd: number },
  kindyPattern?: boolean[],
): DayConfig[] {
  return Array.from({ length: 10 }, (_, i) => ({
    booked: false,
    sessionFee: defaults.sessionFee,
    sessionStart: defaults.sessionStart,
    sessionEnd: defaults.sessionEnd,
    hasKindy: kindyPattern?.[i] ?? false,
  }))
}

function fmtTime(h: number): string {
  const hours = Math.floor(h)
  const mins = Math.round((h - hours) * 60)
  const period = hours >= 12 ? 'PM' : 'AM'
  const display = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${display}:${mins.toString().padStart(2, '0')} ${period}`
}

function timeOptions(min: number, max: number) {
  const opts: { value: string; label: string }[] = []
  for (let h = min; h <= max; h += 0.5) {
    opts.push({ value: String(h), label: fmtTime(h) })
  }
  return opts
}

const START_TIMES = timeOptions(5, 12)
const END_TIMES = timeOptions(12, 21)

export function FortnightlyGrid({ days, onChange, results, kindyToggle, fundingLabel, fmt, colorScheme = 'accent' }: FortnightlyGridProps) {
  const [editingDay, setEditingDay] = useState<number | null>(null)

  function updateDay(index: number, patch: Partial<DayConfig>) {
    const next = [...days]
    next[index] = { ...next[index], ...patch }

    if (patch.hasKindy && kindyToggle?.maxPerWeek) {
      const weekStart = index < 5 ? 0 : 5
      let kindyCount = 0
      for (let i = weekStart; i < weekStart + 5; i++) {
        if (next[i].hasKindy && next[i].booked) kindyCount++
      }
      if (kindyCount > kindyToggle.maxPerWeek) {
        for (let i = weekStart; i < weekStart + 5; i++) {
          if (i !== index && next[i].hasKindy) {
            next[i] = { ...next[i], hasKindy: false }
            break
          }
        }
      }
    }
    onChange(next)
  }

  return (
    <>
      <div className="space-y-4">
        {[1, 2].map((week) => (
          <div key={week} className="rounded-2xl card-glass p-4 sm:p-5">
            <p className="text-xs font-bold text-slate-400 mb-3">Week {week}</p>
            <div className="space-y-1.5">
              {WEEKDAYS.map((dayName, dayIdx) => {
                const i = (week - 1) * 5 + dayIdx
                const day = days[i]
                const result = results?.[i]

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEditingDay(i)}
                    className={clsx(
                      'w-full rounded-xl p-3 text-left transition-colors',
                      day.booked
                        ? 'bg-slate-50 hover:bg-slate-100'
                        : 'hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-sm font-bold', day.booked ? 'text-slate-900' : 'text-slate-300')}>
                          {dayName}
                        </span>
                        {day.booked && day.hasKindy && kindyToggle && (
                          <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', colorScheme === 'brand' ? 'bg-brand-100 text-brand-700' : 'bg-accent-100 text-accent-700')}>
                            {kindyToggle.label}
                          </span>
                        )}
                      </div>
                      {day.booked && result ? (
                        <span className="text-sm font-bold tabular-nums">{fmt(result.gapFee)}</span>
                      ) : !day.booked ? (
                        <span className="text-xs text-slate-300">Not booked</span>
                      ) : null}
                    </div>
                    {day.booked && (
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          ${day.sessionFee} &middot; {fmtTime(day.sessionStart)}&ndash;{fmtTime(day.sessionEnd)}
                        </p>
                        {result && (result.ccsEntitlement > 0 || result.kindyFunding > 0) && (
                          <p className="text-xs tabular-nums text-slate-400">
                            CCS {fmt(result.ccsEntitlement)}
                            {result.kindyFunding > 0 && (
                              <span className={clsx('font-semibold', colorScheme === 'brand' ? 'text-brand-600' : 'text-accent-500')}> + {fundingLabel} {fmt(result.kindyFunding)}</span>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {editingDay !== null && (
        <DayEditModal
          day={days[editingDay]}
          dayLabel={`Week ${editingDay < 5 ? 1 : 2} ${WEEKDAYS[editingDay % 5]}`}
          kindyToggle={kindyToggle}
          colorScheme={colorScheme}
          onSave={(updated) => {
            updateDay(editingDay, updated)
            setEditingDay(null)
          }}
          onCancel={() => setEditingDay(null)}
        />
      )}
    </>
  )
}

function DayEditModal({
  day,
  dayLabel,
  kindyToggle,
  colorScheme = 'accent',
  onSave,
  onCancel,
}: {
  day: DayConfig
  dayLabel: string
  kindyToggle?: FortnightlyGridProps['kindyToggle']
  colorScheme?: ColorScheme
  onSave: (updated: DayConfig) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<DayConfig>(day)

  function update(patch: Partial<DayConfig>) {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">{dayLabel}</h3>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.booked}
              onChange={(e) => update({ booked: e.target.checked })}
              className={clsx('h-5 w-5 rounded border-slate-300', colorScheme === 'brand' ? 'text-brand-600 focus:ring-brand-500' : 'text-accent-500 focus:ring-accent-400')}
            />
            <span className="text-sm font-medium text-slate-900">Attending this day</span>
          </label>

          {draft.booked && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700">Session fee</label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm text-slate-400">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft.sessionFee}
                    onChange={(e) => update({ sessionFee: e.target.value.replace(/[^0-9.]/g, '') })}
                    className={clsx(
                      'block w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-colors',
                      colorScheme === 'brand'
                        ? 'focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none'
                        : 'focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none',
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Start</label>
                  <div className="relative mt-1.5">
                    <select
                      value={draft.sessionStart}
                      onChange={(e) => update({ sessionStart: Number(e.target.value) })}
                      className={clsx(
                        'block w-full appearance-none rounded-xl border-2 border-slate-200 bg-white py-3 pr-10 pl-4 text-sm text-slate-900 shadow-sm transition-colors',
                        colorScheme === 'brand'
                          ? 'focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none'
                          : 'focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none',
                      )}
                    >
                      {START_TIMES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-5 w-5 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                        <path d="M5.75 10.75L8 13L10.25 10.75" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10.25 5.25L8 3L5.75 5.25" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">End</label>
                  <div className="relative mt-1.5">
                    <select
                      value={draft.sessionEnd}
                      onChange={(e) => update({ sessionEnd: Number(e.target.value) })}
                      className={clsx(
                        'block w-full appearance-none rounded-xl border-2 border-slate-200 bg-white py-3 pr-10 pl-4 text-sm text-slate-900 shadow-sm transition-colors',
                        colorScheme === 'brand'
                          ? 'focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 focus:outline-none'
                          : 'focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none',
                      )}
                    >
                      {END_TIMES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg className="h-5 w-5 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                        <path d="M5.75 10.75L8 13L10.25 10.75" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10.25 5.25L8 3L5.75 5.25" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>

              {kindyToggle && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.hasKindy}
                    onChange={(e) => update({ hasKindy: e.target.checked })}
                    className={clsx('h-5 w-5 rounded border-slate-300', colorScheme === 'brand' ? 'text-brand-600 focus:ring-brand-500' : 'text-accent-500 focus:ring-accent-400')}
                  />
                  <span className="text-sm font-medium text-slate-900">{kindyToggle.label} day</span>
                </label>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSave(draft)}
          className={clsx('mt-6 w-full rounded-xl bg-gradient-to-b py-3 text-sm font-bold text-white shadow-md', colorScheme === 'brand' ? 'from-brand-500 to-brand-700' : 'from-accent-400 to-accent-600')}
        >
          Done
        </button>
      </div>
    </div>
  )
}
