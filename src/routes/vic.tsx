import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { CalculatorSidebar } from '../components/CalculatorSidebar'
import { CcsDetailsCard } from '../components/CcsDetailsCard'
import { InputField } from '../components/InputField'
import { SelectField } from '../components/SelectField'
import { TimePicker } from '../components/TimePicker'
import { ToggleGroup } from '../components/ToggleGroup'
import { ResultCard } from '../components/ResultCard'
import { CcsCalculatorModal } from '../components/CcsCalculatorModal'
import { FortnightlyGrid, createDefaultDays } from '../components/FortnightlyGrid'
import type { DayConfig, DayResult } from '../components/FortnightlyGrid'
import { calculateVicDaily, calculateVicFortnightlySessions, VIC_FREE_KINDER_WEEKS } from '../calculators/vic'
import { computeWeeklyGaps } from '../calculators/ccsWeekly'
import type { VicCohort } from '../calculators/vic'
import { DEFAULTS } from '../config'

export const Route = createFileRoute('/vic')({
  component: VicCalculator,
})

const AGE_OPTIONS = [
  { value: '15', label: '4yo kinder (15 hrs/wk)' },
  { value: '15-3yo', label: '3yo kinder (15 hrs/wk)' },
  { value: '7.5', label: '3yo kinder (7.5 hrs/wk)' },
  { value: '5', label: '3yo kinder (5 hrs/wk)' },
]

const COHORT_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'priority', label: 'Priority cohort' },
]

const DAYS_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '2', label: '2 days' },
  { value: '3', label: '3 days' },
  { value: '4', label: '4 days' },
  { value: '5', label: '5 days' },
]

function fmt(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })
}

function VicCalculator() {
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // Shared inputs
  const [ccsPercent, setCcsPercent] = useState(DEFAULTS.ccsPercent)
  const [withholding, setWithholding] = useState(DEFAULTS.ccsWithholding)
  const [kinderHours, setKinderHours] = useState('15')
  const [cohort, setCohort] = useState<VicCohort>('standard')

  // Daily inputs
  const [sessionFee, setSessionFee] = useState(DEFAULTS.sessionFee)
  const [sessionStart, setSessionStart] = useState(8)
  const [sessionEnd, setSessionEnd] = useState(18)
  const [daysPerWeek, setDaysPerWeek] = useState('3')

  // Fortnightly inputs
  const [fnCcsHours, setFnCcsHours] = useState(DEFAULTS.ccsHoursPerFortnight)
  const [days, setDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: 8, sessionEnd: 18 },
    ),
  )

  const kinderHoursNum = kinderHours === '15-3yo' ? 15 : Number(kinderHours) || 15

  const dailyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const fee = Number(sessionFee) || 0
    const wh = Number(withholding) || 0
    const dpw = Number(daysPerWeek) || 3

    if (fee <= 0 || sessionEnd <= sessionStart || dpw <= 0) return null

    return calculateVicDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: sessionStart,
      sessionEndHour: sessionEnd,
      cohort,
      kinderHoursPerWeek: kinderHoursNum,
      daysPerWeek: dpw,
    })
  }, [ccsPercent, withholding, sessionFee, sessionStart, sessionEnd, cohort, kinderHoursNum, daysPerWeek])

  const weeklyGaps = useMemo(() => {
    if (!dailyResult) return null
    return computeWeeklyGaps({
      sessionFee: Number(sessionFee) || 0,
      sessionHours: sessionEnd - sessionStart,
      daysPerWeek: Number(daysPerWeek) || 3,
      ccsHoursPerFortnight: Number(fnCcsHours) || 72,
      fullDailyCcs: dailyResult.ccsEntitlement,
      dailyStateFunding: dailyResult.dailyOffset,
    })
  }, [dailyResult, sessionFee, sessionStart, sessionEnd, daysPerWeek, fnCcsHours])

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const wh = Number(withholding) || 0
    const ccsHours = Number(fnCcsHours) || 36

    const sessions = days.map((d) => ({
      booked: d.booked,
      sessionFee: d.booked ? (Number(d.sessionFee) || 0) : 0,
      sessionStartHour: d.booked ? d.sessionStart : 0,
      sessionEndHour: d.booked ? d.sessionEnd : 0,
    }))

    if (!days.some((d) => d.booked && (Number(d.sessionFee) || 0) > 0)) return null

    return calculateVicFortnightlySessions({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      fortnightlyCcsHours: ccsHours,
      cohort,
      kinderHoursPerWeek: kinderHoursNum,
      sessions,
    })
  }, [ccsPercent, withholding, fnCcsHours, cohort, kinderHoursNum, days])

  const dayResults: DayResult[] | null = fortnightlyResult
    ? fortnightlyResult.sessions.map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: s.freeKinder,
        gapFee: s.gapFee,
      }))
    : null

  return (
    <>
      <CcsCalculatorModal
        open={ccsModalOpen}
        onClose={() => setCcsModalOpen(false)}
        onApply={(pct) => setCcsPercent(String(pct))}
      />

      <Container className="py-10">
        <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-10 xl:grid-cols-[360px_1fr]">
          {/* Sidebar panel */}
          <aside className="relative mb-8 lg:mb-0">
            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto rounded-2xl sidebar-gradient p-6 lg:p-8">
              <CalculatorSidebar
                schemeTag="VIC"
                schemeName="Free Kinder"
                description="Victoria's Free Kinder program provides an annual fee offset for 3 and 4-year-olds in long day care kindergarten programs, reducing your gap fee."
                keyFacts={[
                  { label: 'Standard Offset', value: `$2,101/yr` },
                  { label: 'Priority Cohort', value: `$2,693/yr` },
                  { label: 'Program Weeks', value: `${VIC_FREE_KINDER_WEEKS}/yr` },
                ]}
                guidance={[
                  {
                    title: 'Your CCS Percentage',
                    description: 'Find this in your myGov account under Centrelink. It ranges from 0% to 90% based on family income, or up to 95% for second and subsequent children in care.',
                  },
                  {
                    title: 'Session Fees',
                    description: 'The daily fee your centre charges before any subsidies. Check your invoice or ask your centre.',
                  },
                  {
                    title: 'Priority Cohort',
                    description: 'Eligible if your child is Aboriginal/Torres Strait Islander, from a refugee or asylum seeker background, has had contact with Child Protection, or received Early Start Kindergarten.',
                  },
                  {
                    title: 'Kinder Hours',
                    description: 'Most LDC centres deliver 15 hours/week for both 3yo and 4yo kinder (2 days of 7.5 hrs). Some 3yo programs may offer fewer hours.',
                  },
                ]}
              >
                <ToggleGroup
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'fortnightly', label: 'Fortnightly' },
                  ]}
                  value={mode}
                  onChange={setMode}
                />
              </CalculatorSidebar>
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 space-y-6">
            <CcsDetailsCard
              ccsPercent={ccsPercent}
              onCcsPercentChange={setCcsPercent}
              withholding={withholding}
              onWithholdingChange={setWithholding}
              ccsHours={fnCcsHours}
              onCcsHoursChange={setFnCcsHours}
              onOpenCcsModal={() => setCcsModalOpen(true)}
            />

            {mode === 'daily' ? (
              <>
                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Session Details</h2>
                  <div className="mt-5 space-y-4">
                    <InputField
                      label="Daily session fee"
                      value={sessionFee}
                      onChange={(e) => setSessionFee(e.target.value)}
                      prefix="$"
                      format="currency"
                      min={0}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <TimePicker
                        label="Session start"
                        value={sessionStart}
                        onChange={setSessionStart}
                        min={5}
                        max={12}
                      />
                      <TimePicker
                        label="Session end"
                        value={sessionEnd}
                        onChange={setSessionEnd}
                        min={12}
                        max={21}
                      />
                    </div>
                    <SelectField
                      label="Days per week"
                      options={DAYS_OPTIONS}
                      value={daysPerWeek}
                      onChange={(e) => setDaysPerWeek(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Free Kinder Details</h2>
                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="Kinder program"
                        options={AGE_OPTIONS}
                        value={kinderHours}
                        onChange={(e) => setKinderHours(e.target.value)}
                      />
                      <SelectField
                        label="Cohort"
                        hint="See sidebar for eligibility"
                        options={COHORT_OPTIONS}
                        value={cohort}
                        onChange={(e) => setCohort(e.target.value as VicCohort)}
                      />
                    </div>
                  </div>
                </div>

                {dailyResult && (
                  <ResultCard
                    title="Daily Cost Estimate"
                    rows={[
                      { label: 'Session Fee', value: fmt(Number(sessionFee)) },
                      { label: `CCS Entitlement (${ccsPercent}%)`, value: `- ${fmt(dailyResult.ccsEntitlement)}` },
                      { label: 'Gap Before Free Kinder', value: fmt(dailyResult.gapBeforeFreeKinder), muted: true },
                      { label: 'Free Kinder Offset', value: `- ${fmt(dailyResult.dailyOffset)}` },
                      ...(weeklyGaps
                        ? [
                            { label: 'Week 1 Daily Gap', value: fmt(weeklyGaps.week1Gap), highlight: true },
                            { label: 'Week 2 Daily Gap', value: fmt(weeklyGaps.week2Gap), highlight: true },
                          ]
                        : [
                            { label: 'Your Estimated Gap Fee', value: fmt(dailyResult.estimatedGapFee), highlight: true },
                          ]
                      ),
                    ]}
                    note={weeklyGaps
                      ? `Your ${fnCcsHours} CCS hours don't cover all ${((sessionEnd - sessionStart) * Number(daysPerWeek) * 2).toFixed(0)} session hours in the fortnight. Week 2 has reduced CCS coverage.`
                      : `Based on ${fmt(dailyResult.annualOffset)}/yr offset across ${VIC_FREE_KINDER_WEEKS} weeks and ${daysPerWeek} days/week (${fmt(dailyResult.weeklyOffset)}/week).`
                    }
                  />
                )}
              </>
            ) : (
              <>
                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Fortnightly Settings</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <SelectField
                      label="Kinder program"
                      options={AGE_OPTIONS}
                      value={kinderHours}
                      onChange={(e) => setKinderHours(e.target.value)}
                    />
                    <SelectField
                      label="Cohort"
                      options={COHORT_OPTIONS}
                      value={cohort}
                      onChange={(e) => setCohort(e.target.value as VicCohort)}
                    />
                  </div>
                </div>

                <FortnightlyGrid
                  days={days}
                  onChange={setDays}
                  results={dayResults}
                  fundingLabel="Free Kinder"
                  fmt={fmt}
                />

                {fortnightlyResult && (
                  <ResultCard
                    title="Fortnightly Total"
                    rows={[
                      { label: 'Total Session Fees', value: fmt(fortnightlyResult.totalSessionFees) },
                      { label: 'Total CCS Entitlement', value: `- ${fmt(fortnightlyResult.totalCcsEntitlement)}` },
                      { label: 'Total Free Kinder Offset', value: `- ${fmt(fortnightlyResult.totalFreeKinder)}` },
                      { label: 'Your Estimated Gap', value: fmt(fortnightlyResult.totalGapFee), highlight: true },
                    ]}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </Container>
    </>
  )
}
