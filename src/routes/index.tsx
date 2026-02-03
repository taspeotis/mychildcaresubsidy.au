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
          <div className="absolute inset-0 bg-gradient-to-b from-teal-50 to-slate-50" />
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.03]"
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

        <Container className="pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              What will kindy{' '}
              <span className="text-teal-600">actually</span> cost you?
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Australian families can access free or subsidised kindergarten programs.
              Between the federal Child Care Subsidy and your state's kindy funding,
              the out-of-pocket costs might be less than you think.
            </p>
            <p className="mt-3 text-base text-slate-600">
              Select your state below to get a personalised estimate.
            </p>
          </div>
        </Container>
      </div>

      <Container className="-mt-2 sm:mt-0">
        <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="mt-12 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
          <h2 className="text-lg font-semibold text-slate-900">How does it work?</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-600">
                1
              </div>
              <h3 className="mt-2 text-sm font-medium text-slate-900">Child Care Subsidy</h3>
              <p className="mt-1 text-sm text-slate-600">
                The federal government subsidises your childcare fees based on your family income, up to 90% for lower incomes.
              </p>
            </div>
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-600">
                2
              </div>
              <h3 className="mt-2 text-sm font-medium text-slate-900">State kindy funding</h3>
              <p className="mt-1 text-sm text-slate-600">
                Your state or territory provides additional funding to cover the kindergarten program hours, making them free for families.
              </p>
            </div>
            <div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-600">
                3
              </div>
              <h3 className="mt-2 text-sm font-medium text-slate-900">Your gap fee</h3>
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
