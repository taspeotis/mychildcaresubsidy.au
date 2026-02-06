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
        'group relative block rounded-2xl card-glass card-lift p-8',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 text-sm font-bold text-white shadow-md">
          {state}
        </span>
        <div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-accent-500 transition-colors">
            {program}
          </h3>
          <p className="text-sm text-slate-500">{state}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-700">{description}</p>
      <span className="mt-5 inline-flex items-center text-sm font-bold text-accent-500 group-hover:text-accent-400">
        Calculate costs
        <svg className="ml-1.5 h-5 w-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </span>
    </Link>
  )
}
