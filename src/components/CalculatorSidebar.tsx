import { Link } from '@tanstack/react-router'
import type { ColorScheme } from '../types'

interface KeyFact {
  label: string
  value: string
}

interface GuidanceItem {
  title: string
  description: string
}

interface CalculatorSidebarProps {
  schemeTag: string
  schemeName: string
  description: string
  keyFacts: KeyFact[]
  guidance: GuidanceItem[]
  colorScheme?: ColorScheme
  children?: React.ReactNode
}

export function CalculatorSidebar({
  schemeTag,
  schemeName,
  description,
  keyFacts,
  guidance,
  colorScheme = 'accent',
  children,
}: CalculatorSidebarProps) {
  return (
    <>
      <Link
        to="/"
        className={`inline-flex items-center text-sm font-medium text-white/60 transition-colors ${colorScheme === 'brand' ? 'hover:text-brand-400' : 'hover:text-accent-400'}`}
      >
        <svg
          className="mr-1.5 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        All Calculators
      </Link>

      <div className="mt-4 flex items-center gap-2.5">
        <span className={`flex shrink-0 items-center justify-center font-bold text-white bg-gradient-to-br ${colorScheme === 'brand' ? 'h-14 w-14 rounded-2xl text-sm shadow-lg from-brand-500 to-brand-700' : 'h-11 w-11 rounded-xl text-xs shadow-md from-accent-400 to-accent-600'}`}>
          {schemeTag}
        </span>
        <h1 className="text-2xl font-bold leading-tight text-white">{schemeName}</h1>
      </div>

      <p className="mt-3 text-sm text-white/70 leading-relaxed">{description}</p>

      {children && (
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wide text-white/50 mb-3">
            Calculate
          </h3>
          {children}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-xs font-bold uppercase tracking-wide text-white/50">
          Key Facts
        </h3>
        <dl className="mt-3 space-y-2">
          {keyFacts.map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-2">
              <dt className="text-sm text-white/70">{fact.label}</dt>
              <dd className="text-sm font-bold text-white">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <details className="group mt-6 [&[open]]:mt-6" open>
        <summary className="cursor-pointer select-none text-xs font-bold uppercase tracking-wide text-white/50 lg:pointer-events-none lg:select-text">
          Calculator Guide
          <svg
            className="ml-1 inline h-3 w-3 transition-transform group-open:rotate-90 lg:hidden"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </summary>
        <div className="mt-3 space-y-3">
          {guidance.map((item) => (
            <div key={item.title}>
              <h4 className="text-sm font-medium text-white">{item.title}</h4>
              <p className="mt-0.5 text-xs text-white/60 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </details>

    </>
  )
}
