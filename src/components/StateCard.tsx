import { Link } from '@tanstack/react-router'
import clsx from 'clsx'

interface StateCardProps {
  to: string
  state: string
  program: string
  description: string
  className?: string
}

export function StateCard({ to, state, program, description, className }: StateCardProps) {
  return (
    <Link
      to={to}
      className={clsx(
        'group relative block rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-900/5 transition-all',
        'hover:shadow-lg hover:ring-teal-200',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-sm font-bold text-teal-600 ring-1 ring-teal-200">
          {state}
        </span>
        <div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">
            {program}
          </h3>
          <p className="text-sm text-slate-500">{state}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">{description}</p>
      <span className="mt-4 inline-flex items-center text-sm font-medium text-teal-600 group-hover:text-teal-500">
        Calculate costs
        <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </span>
    </Link>
  )
}
