import { fmt } from '../config'
import type { PlanEntry, PlanEntryResult } from '../plan/types'
import { SCHEME_META } from '../plan/types'

interface PlanEntryRowProps {
  entry: PlanEntry
  result: PlanEntryResult | null
  label: string
  onEdit: () => void
  onDelete: () => void
}

const MODE_NOUN: Record<string, string> = {
  daily: 'Day',
  weekly: 'Fortnight',
  fortnightly: 'Fortnight',
}

export function PlanEntryRow({ entry, result, label, onEdit, onDelete }: PlanEntryRowProps) {
  const meta = SCHEME_META[entry.scheme]
  const period = MODE_NOUN[entry.mode]

  return (
    <div className="rounded-2xl card-glass p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              {meta.label}
            </span>
            <span className="text-xs text-slate-500">Per {period}</span>
          </div>
          <h3 className="mt-1.5 text-base font-bold text-slate-900 break-words">{label}</h3>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Remove ${label} from plan`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Remove
          </button>
        </div>
      </div>

      {result ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-2 gap-y-2 sm:grid-cols-4 sm:gap-x-4">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-slate-400">Session fees</dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">{fmt(result.sessionFees)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-slate-400">CCS</dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-green-700">{fmt(result.ccsEntitlement)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-slate-400">
              {meta.fundingLabel || 'State'}
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-green-700">
              {meta.fundingLabel ? fmt(result.stateFunding) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-slate-400">Gap</dt>
            <dd className="mt-0.5 text-base font-bold tabular-nums text-accent-600">{fmt(result.gap)}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          This entry is missing inputs. Click Edit to review and save it.
        </p>
      )}
    </div>
  )
}
