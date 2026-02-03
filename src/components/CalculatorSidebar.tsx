import { Link } from '@tanstack/react-router'

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
  children?: React.ReactNode
}

export function CalculatorSidebar({
  schemeTag,
  schemeName,
  description,
  keyFacts,
  guidance,
  children,
}: CalculatorSidebarProps) {
  return (
    <>
      <Link
        to="/"
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors"
      >
        <svg
          className="mr-1 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        All calculators
      </Link>

      <h1 className="mt-4 text-xl font-bold text-slate-900">
        <span className="mr-2 inline-flex translate-y-[-1px] items-center rounded-md bg-teal-600 px-2 py-0.5 align-middle text-xs font-semibold text-white">
          {schemeTag}
        </span>
        {schemeName}
      </h1>

      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>

      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Key Facts
        </h3>
        <dl className="mt-3 space-y-2">
          {keyFacts.map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-2">
              <dt className="text-sm text-slate-600">{fact.label}</dt>
              <dd className="text-sm font-semibold text-slate-900">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <details className="group mt-6 [&[open]]:mt-6" open>
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-slate-400 lg:pointer-events-none lg:select-text">
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
              <h4 className="text-sm font-medium text-slate-900">{item.title}</h4>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </details>

      {children && (
        <div className="mt-6 border-t border-slate-200 pt-6">{children}</div>
      )}
    </>
  )
}
