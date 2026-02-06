import { createFileRoute } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { StateCard } from '../components/StateCard'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-700 to-brand-600" />
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
              What will kindy{' '}
              <span className="text-accent-400">actually</span> cost you?
            </h1>
            <p className="mt-5 text-lg text-white/80">
              Australian families can access free or subsidised kindergarten programs.
              Between the federal Child Care Subsidy and your state's kindy funding,
              the out-of-pocket costs might be less than you think.
            </p>
            <p className="mt-3 text-base text-white/70">
              Select your state below to get a personalised estimate.
            </p>
          </div>
        </Container>
      </div>

      <Container className="-mt-2 sm:mt-0">
        <div className="grid gap-5 sm:grid-cols-2">
          <StateCard
            to="/qld"
            state="QLD"
            program="Free Kindy"
            description="15 hours per week of funded kindergarten in long day care. Covers two 7.5-hour sessions or a 6-hour split across the fortnight."
          />
          <StateCard
            to="/act"
            state="ACT"
            program="3-Year-Old Preschool"
            description="Funded preschool for 3-year-olds. 6 to 7.5 hours on one day per week at participating long day care services."
          />
        </div>

        <div className="mt-12 rounded-2xl bg-white p-8 shadow-md ring-2 ring-white/25">
          <h2 className="text-xl font-bold text-slate-900">How does it work?</h2>
          <div className="mt-5 grid gap-8 md:grid-cols-3">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500 text-sm font-bold text-white shadow-sm">
                1
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">Child Care Subsidy</h3>
              <p className="mt-1 text-sm text-slate-600">
                The federal government subsidises your childcare fees based on your family income, up to 90% for lower incomes.
              </p>
            </div>
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500 text-sm font-bold text-white shadow-sm">
                2
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">State kindy funding</h3>
              <p className="mt-1 text-sm text-slate-600">
                Your state or territory provides additional funding to cover the kindergarten program hours, making them free for families.
              </p>
            </div>
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500 text-sm font-bold text-white shadow-sm">
                3
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900">Your gap fee</h3>
              <p className="mt-1 text-sm text-slate-600">
                You only pay for the hours of care outside the kindy program, minus your CCS entitlement. This calculator shows you that gap.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </>
  )
}
