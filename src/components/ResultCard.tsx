import clsx from 'clsx'
import type { ColorScheme } from '../types'

interface ResultRow {
  label: string
  value: string
  detail?: string
  highlight?: boolean
  muted?: boolean
}

interface ResultCardProps {
  title: string
  rows: ResultRow[]
  note?: string
  colorScheme?: ColorScheme
  className?: string
}

export function ResultCard({ title, rows, note, colorScheme = 'accent', className }: ResultCardProps) {
  const isBrand = colorScheme === 'brand'
  return (
    <div className={clsx('rounded-2xl card-glass p-8 border-t-[3px]', isBrand ? 'border-t-brand-600' : 'border-t-accent-500', className)}>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <dl className="mt-5 divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="py-3">
            <div className="flex items-center justify-between">
              <dt className={clsx('text-sm', row.muted ? 'text-slate-400' : 'text-slate-700')}>
                {row.label}
              </dt>
              <dd
                className={clsx(
                  'text-sm font-bold tabular-nums',
                  row.highlight ? (isBrand ? 'text-brand-600 text-xl' : 'text-accent-500 text-xl') : row.muted ? 'text-slate-400' : 'text-slate-900',
                )}
              >
                {row.value}
              </dd>
            </div>
            {row.detail && (
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
