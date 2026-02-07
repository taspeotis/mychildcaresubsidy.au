import { createFileRoute, Link } from '@tanstack/react-router'
import { Container } from '../components/Container'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const STATE_PROGRAMS = [
  {
    to: '/act',
    state: 'ACT',
    program: 'Free 3-Year-Old Preschool',
    description: 'Funded preschool for 3-year-olds. 6 to 7.5 hours on one day per week at participating long day care services.',
  },
  {
    to: '/nsw',
    state: 'NSW',
    program: 'Start Strong',
    description: 'Annual fee relief for 3 and 4+ year olds in long day care preschool programs.',
  },
  {
    to: '/qld',
    state: 'QLD',
    program: 'Free Kindy',
    description: '30 hours per fortnight of funded kindergarten in long day care. Typically two 7.5-hour days per week, or split across the fortnight.',
  },
  {
    to: '/vic',
    state: 'VIC',
    program: 'Free Kinder',
    description: 'Annual fee offset for 3 and 4-year-olds in long day care kinder programs.',
  },
]

function HomePage() {
  return (
    <>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
          <svg
            className="absolute inset-0 h-full w-full text-white opacity-[0.05]"
            aria-hidden="true"
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40V0h40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <Container className="pt-20 pb-14 sm:pt-28 sm:pb-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              What will <span className="text-accent-400">child care</span> cost you?
            </h1>
            <p className="mt-5 text-lg text-white/80">
              A simple calculator to estimate your out-of-pocket child care costs,
              factoring in the federal Child Care Subsidy and your state or territory's kindy funding.
            </p>
            <p className="mt-3 text-base text-white/70">
              Start with the CCS calculator, or select your state or territory program below.
            </p>
          </div>
        </Container>
      </div>

      <Container className="-mt-2 sm:mt-0 space-y-8">
        {/* Federal CCS Calculator - prominent card */}
        <Link
          to="/ccs"
          className="group block rounded-2xl card-glass p-6 sm:p-8 border-l-4 border-l-accent-500 transition-all hover:shadow-lg"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white shadow-lg">
              CCS
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-accent-500 transition-colors">
                Child Care Subsidy Calculator
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Estimate your federal CCS entitlement for centre-based day care, family day care, or outside school hours care (OSHC). Supports all ages including school-age children.
              </p>
            </div>
            <svg className="h-6 w-6 shrink-0 text-slate-300 transition-all group-hover:text-accent-500 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Link>

        {/* State/territory calculators */}
        <div className="rounded-2xl card-glass p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">State &amp; Territory Programs</h2>
          <p className="mt-1 text-sm text-slate-600">
            These calculators combine your CCS with state or territory kindy and preschool programs.
          </p>
          <div className="mt-4 divide-y divide-slate-100">
            {STATE_PROGRAMS.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0 transition-colors"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 text-xs font-bold text-white shadow-md">
                  {p.state}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-accent-500 transition-colors">
                      {p.program}
                    </h3>
                    <span className="text-xs text-slate-400">{p.state}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{p.description}</p>
                </div>
                <svg className="h-5 w-5 shrink-0 text-slate-300 transition-all group-hover:text-accent-500 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl card-glass p-8">
          <h2 className="text-xl font-bold text-slate-900">How Does It Work?</h2>
          <div className="mt-5 grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 text-sm font-bold text-white shadow-md">
                1
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">Child Care Subsidy</h3>
              <p className="mt-1 text-sm text-slate-600">
                The federal government subsidises your child care fees based on your family income, up to 90% (or 95% for second and subsequent children).
              </p>
            </div>
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 text-sm font-bold text-white shadow-md">
                2
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">State &amp; Territory Funding</h3>
              <p className="mt-1 text-sm text-slate-600">
                Your state or territory may provide additional funding to cover the kindergarten program hours, further reducing your costs.
              </p>
            </div>
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 text-sm font-bold text-white shadow-md">
                3
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">Your Gap Fee</h3>
              <p className="mt-1 text-sm text-slate-600">
                You only pay the remaining amount after CCS and any state or territory funding are applied. These calculators show you that gap.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </>
  )
}
