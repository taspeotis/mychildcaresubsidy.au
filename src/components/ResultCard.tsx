import { useState } from 'react'
import clsx from 'clsx'
import type { ColorScheme } from '../types'

interface ResultRow {
  label: string
  value: string
  detail?: string
  highlight?: boolean
  muted?: boolean
  detailOnly?: boolean
  type?: 'credit' | 'debit'
}

interface ResultCardProps {
  title: string
  rows: ResultRow[]
  note?: string
  colorScheme?: ColorScheme
  className?: string
  detailedToggle?: boolean
}

export function ResultCard({ title, rows, note, colorScheme = 'accent', className, detailedToggle }: ResultCardProps) {
  const [detailed, setDetailed] = useState(false)
  const isBrand = colorScheme === 'brand'
  const visibleRows = detailed ? rows : rows.filter((r) => !r.detailOnly)

  return (
    <div className={clsx('rounded-2xl card-glass p-8 border-t-[3px]', isBrand ? 'border-t-brand-600' : 'border-t-accent-500', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {detailedToggle && (
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setDetailed(false)}
              className={clsx(
                'rounded-md px-3 py-1 text-xs font-bold transition-colors',
                !detailed
                  ? clsx('text-white shadow-sm', isBrand ? 'bg-brand-600' : 'bg-accent-500')
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setDetailed(true)}
              className={clsx(
                'rounded-md px-3 py-1 text-xs font-bold transition-colors',
                detailed
                  ? clsx('text-white shadow-sm', isBrand ? 'bg-brand-600' : 'bg-accent-500')
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              Detailed
            </button>
          </div>
        )}
      </div>
      <dl className="mt-5 divide-y divide-slate-100">
        {visibleRows.map((row) => (
          <div key={row.label} className="py-3">
            <div className="flex items-center justify-between">
              <dt className={clsx('text-sm', row.muted ? 'text-slate-400' : 'text-slate-700')}>
                {row.label}
              </dt>
              <dd
                className={clsx(
                  'text-sm font-bold tabular-nums',
                  row.highlight
                    ? clsx('text-xl', isBrand ? 'text-brand-600' : 'text-accent-500')
                    : row.type === 'credit'
                      ? 'text-green-700'
                      : row.type === 'debit'
                        ? 'text-red-700'
                        : row.muted
                          ? 'text-slate-400'
                          : 'text-slate-900',
                )}
              >
                {row.value}
                {row.type && <span className="sr-only">{row.type === 'credit' ? 'credit' : 'debit'}</span>}
              </dd>
            </div>
            {detailed && row.detail && (
              <p className="mt-0.5 text-xs text-slate-400">{row.detail}</p>
            )}
          </div>
        ))}
      </dl>
      {note && (
        <p className={clsx('mt-5 rounded-xl bg-gradient-to-r px-4 py-3 text-xs', isBrand ? 'from-brand-50 to-brand-100/50 text-brand-800' : 'from-accent-50 to-accent-100/50 text-accent-800')}>{note}</p>
      )}
    </div>
  )
}
