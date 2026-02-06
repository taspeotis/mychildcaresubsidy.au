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
    <div className={clsx('rounded-2xl card-glass p-8 border-t-[3px] border-t-accent-500', className)}>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <dl className="mt-5 divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-3">
            <dt className={clsx('text-sm', row.muted ? 'text-slate-400' : 'text-slate-700')}>
              {row.label}
            </dt>
            <dd
              className={clsx(
                'text-sm font-bold tabular-nums',
                row.highlight ? 'text-accent-500 text-xl' : row.muted ? 'text-slate-400' : 'text-slate-900',
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {note && (
        <p className="mt-5 rounded-xl bg-gradient-to-r from-accent-50 to-accent-100/50 px-4 py-3 text-xs text-accent-800">{note}</p>
      )}
    </div>
  )
}
