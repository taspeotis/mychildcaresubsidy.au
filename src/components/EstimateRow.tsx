import clsx from 'clsx'
import { fmt } from '../config'
import type { Estimate, EstimateResult } from '../estimates/types'
import { SCHEME_META } from '../estimates/types'

interface EstimateRowProps {
  estimate: Estimate
  result: EstimateResult | null
  label: string
  onEdit: () => void
  onDelete: () => void
}

const MODE_NOUN: Record<string, string> = {
  daily: 'Day',
  weekly: 'Fortnight',
  fortnightly: 'Fortnight',
}

export function EstimateRow({ estimate, result, label, onEdit, onDelete }: EstimateRowProps) {
  const meta = SCHEME_META[estimate.scheme]
  const period = MODE_NOUN[estimate.mode]
  const isCcs = estimate.scheme === 'ccs'

  return (
    <div className="rounded-2xl card-glass p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                isCcs ? 'bg-brand-100 text-brand-700' : 'bg-accent-100 text-accent-700',
              )}
            >
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
            className="rounded-lg bg-gradient-to-b from-blue-500 to-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:from-blue-400 hover:to-blue-600"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Remove ${label}`}
            className="rounded-lg bg-gradient-to-b from-red-500 to-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:from-red-400 hover:to-red-600"
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
          This estimate is missing inputs. Click Edit to review and save it.
        </p>
      )}
    </div>
  )
}
