import clsx from 'clsx'

interface ResultRow {
  label: string
  value: string
  highlight?: boolean
  muted?: boolean
}

interface ResultCardProps {
  title: string
  rows: ResultRow[]
  note?: string
  className?: string
}

export function ResultCard({ title, rows, note, className }: ResultCardProps) {
  return (
    <div className={clsx('rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-900/5', className)}>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <dl className="mt-4 divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5">
            <dt className={clsx('text-sm', row.muted ? 'text-slate-400' : 'text-slate-700')}>
              {row.label}
            </dt>
            <dd
              className={clsx(
                'text-sm font-semibold tabular-nums',
                row.highlight ? 'text-teal-600 text-lg' : row.muted ? 'text-slate-400' : 'text-slate-900',
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {note && (
        <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-800">{note}</p>
      )}
    </div>
  )
}
