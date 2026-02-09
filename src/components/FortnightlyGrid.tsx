import { useState } from 'react'
import clsx from 'clsx'
import type { ColorScheme } from '../types'
import { WEEKDAYS, formatTime } from '../config'
import { InputField } from './InputField'
import { TimePicker } from './TimePicker'

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
                          ${day.sessionFee} &middot; {formatTime(day.sessionStart)}&ndash;{formatTime(day.sessionEnd)}
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div role="dialog" aria-modal="true" aria-labelledby="day-edit-title" className="relative w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 id="day-edit-title" className="text-lg font-bold text-slate-900">{dayLabel}</h3>
          <button type="button" onClick={onCancel} aria-label="Close" className="text-slate-400 hover:text-slate-600">
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
              <InputField
                label="Session fee"
                value={draft.sessionFee}
                onChange={(e) => update({ sessionFee: e.target.value })}
                prefix="$"
                format="currency"
                min={0}
                colorScheme={colorScheme}
              />

              <div className="grid grid-cols-2 gap-3">
                <TimePicker
                  label="Start"
                  value={draft.sessionStart}
                  onChange={(v) => update({ sessionStart: v })}
                  min={5}
                  max={12}
                  colorScheme={colorScheme}
                />
                <TimePicker
                  label="End"
                  value={draft.sessionEnd}
                  onChange={(v) => update({ sessionEnd: v })}
                  min={12}
                  max={21}
                  colorScheme={colorScheme}
                />
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
