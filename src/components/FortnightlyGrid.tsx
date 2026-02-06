import { useState } from 'react'
import clsx from 'clsx'

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
  const ampm = hours >= 12 ? 'pm' : 'am'
  const display = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  return `${display}:${mins.toString().padStart(2, '0')}${ampm}`
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

export function FortnightlyGrid({ days, onChange, results, kindyToggle, fundingLabel, fmt }: FortnightlyGridProps) {
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
      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl card-glass p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-700">
              <th className="py-2 pr-2 font-bold">Day</th>
              <th className="py-2 px-1 font-bold">Fee</th>
              <th className="py-2 px-1 font-bold">Start</th>
              <th className="py-2 px-1 font-bold">End</th>
              {kindyToggle && (
                <th className="py-2 px-1 font-bold text-center">{kindyToggle.label}</th>
              )}
              <th className="py-2 px-1 font-bold text-right">CCS</th>
              <th className="py-2 px-1 font-bold text-right">{fundingLabel}</th>
              <th className="py-2 pl-1 font-bold text-right">Gap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {days.map((day, i) => {
              const week = i < 5 ? 1 : 2
              const dayName = WEEKDAYS[i % 5]
              const result = results?.[i]

              return (
                <tr
                  key={i}
                  className={clsx(
                    i === 5 && 'border-t-4 border-slate-100',
                    !day.booked && 'opacity-40',
                  )}
                >
                  <td className="py-2 pr-2">
                    <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={day.booked}
                        onChange={(e) => updateDay(i, { booked: e.target.checked })}
                        className="rounded border-slate-300 text-accent-500 focus:ring-accent-400"
                      />
                      <span className="text-slate-400 text-xs">W{week}</span>
                      <span className="text-slate-900 font-medium">{dayName}</span>
                    </label>
                  </td>
                  <td className="py-2 px-1">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-xs text-slate-400 pointer-events-none">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={day.booked ? day.sessionFee : ''}
                        onChange={(e) => updateDay(i, { sessionFee: e.target.value.replace(/[^0-9.]/g, '') })}
                        disabled={!day.booked}
                        className="w-[5.5rem] rounded-lg border border-slate-200 py-1.5 pl-6 pr-2 text-sm tabular-nums disabled:bg-slate-50"
                      />
                    </div>
                  </td>
                  <td className="py-2 px-1">
                    <select
                      value={day.sessionStart}
                      onChange={(e) => updateDay(i, { sessionStart: Number(e.target.value) })}
                      disabled={!day.booked}
                      className="rounded-lg border border-slate-200 py-1.5 px-2 text-sm disabled:bg-slate-50"
                    >
                      {START_TIMES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-1">
                    <select
                      value={day.sessionEnd}
                      onChange={(e) => updateDay(i, { sessionEnd: Number(e.target.value) })}
                      disabled={!day.booked}
                      className="rounded-lg border border-slate-200 py-1.5 px-2 text-sm disabled:bg-slate-50"
                    >
                      {END_TIMES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  {kindyToggle && (
                    <td className="py-2 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={day.hasKindy}
                        onChange={(e) => updateDay(i, { hasKindy: e.target.checked })}
                        disabled={!day.booked}
                        className="rounded border-slate-300 text-accent-500 focus:ring-accent-400"
                      />
                    </td>
                  )}
                  <td className="py-2 px-1 text-right tabular-nums text-slate-700">
                    {day.booked && result ? fmt(result.ccsEntitlement) : '\u2014'}
                  </td>
                  <td className="py-2 px-1 text-right tabular-nums text-accent-500 font-semibold">
                    {day.booked && result ? fmt(result.kindyFunding) : '\u2014'}
                  </td>
                  <td className="py-2 pl-1 text-right tabular-nums font-bold">
                    {day.booked && result ? fmt(result.gapFee) : '\u2014'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {[1, 2].map((week) => (
          <div key={week}>
            <p className="text-xs font-bold text-slate-500 mb-2 mt-4 first:mt-0">Week {week}</p>
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
                    'w-full rounded-xl border-2 p-3 text-left transition-colors mb-1.5',
                    day.booked
                      ? 'border-slate-200 bg-white hover:border-accent-300'
                      : 'border-transparent bg-slate-100/50',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={clsx('text-sm font-bold', day.booked ? 'text-slate-900' : 'text-slate-400')}>
                        {dayName}
                      </span>
                      {day.booked && day.hasKindy && kindyToggle && (
                        <span className="rounded bg-accent-100 px-1.5 py-0.5 text-[10px] font-bold text-accent-700">
                          {kindyToggle.label}
                        </span>
                      )}
                    </div>
                    {day.booked && result ? (
                      <span className="text-sm font-bold tabular-nums">{fmt(result.gapFee)}</span>
                    ) : !day.booked ? (
                      <span className="text-xs text-slate-400">Not booked</span>
                    ) : null}
                  </div>
                  {day.booked && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      ${day.sessionFee} &middot; {fmtTime(day.sessionStart)}&ndash;{fmtTime(day.sessionEnd)}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Day edit modal */}
      {editingDay !== null && (
        <DayEditModal
          day={days[editingDay]}
          dayLabel={`Week ${editingDay < 5 ? 1 : 2} ${WEEKDAYS[editingDay % 5]}`}
          kindyToggle={kindyToggle}
          onChange={(patch) => updateDay(editingDay, patch)}
          onClose={() => setEditingDay(null)}
        />
      )}
    </>
  )
}

function DayEditModal({
  day,
  dayLabel,
  kindyToggle,
  onChange,
  onClose,
}: {
  day: DayConfig
  dayLabel: string
  kindyToggle?: FortnightlyGridProps['kindyToggle']
  onChange: (patch: Partial<DayConfig>) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">{dayLabel}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={day.booked}
              onChange={(e) => onChange({ booked: e.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-accent-500 focus:ring-accent-400"
            />
            <span className="text-sm font-medium text-slate-900">Attending this day</span>
          </label>

          {day.booked && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700">Session fee</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-400 pointer-events-none">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={day.sessionFee}
                    onChange={(e) => onChange({ sessionFee: e.target.value.replace(/[^0-9.]/g, '') })}
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-8 pr-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Start</label>
                  <select
                    value={day.sessionStart}
                    onChange={(e) => onChange({ sessionStart: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm"
                  >
                    {START_TIMES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">End</label>
                  <select
                    value={day.sessionEnd}
                    onChange={(e) => onChange({ sessionEnd: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm"
                  >
                    {END_TIMES.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {kindyToggle && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={day.hasKindy}
                    onChange={(e) => onChange({ hasKindy: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-300 text-accent-500 focus:ring-accent-400"
                  />
                  <span className="text-sm font-medium text-slate-900">{kindyToggle.label} day</span>
                </label>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-gradient-to-b from-accent-400 to-accent-600 py-3 text-sm font-bold text-white shadow-md"
        >
          Done
        </button>
      </div>
    </div>
  )
}
