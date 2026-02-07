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
import { calculateActDaily, calculateActFortnightly, getActKindyHoursPerWeek } from '../calculators/act'
import { computeWeeklyGaps } from '../calculators/ccsWeekly'
import { DEFAULTS } from '../config'
import type { FortnightlySession } from '../types'

export const Route = createFileRoute('/act')({
  component: ActCalculator,
})

const PRESCHOOL_OPTIONS = [
  { value: '7.5', label: '7.5 hours' },
  { value: '6', label: '6 hours' },
]

const DAYS_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '2', label: '2 days' },
  { value: '3', label: '3 days' },
  { value: '4', label: '4 days' },
  { value: '5', label: '5 days' },
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// Default preschool pattern: Wed each week
const DEFAULT_PRESCHOOL = [
  false, false, true, false, false,
  false, false, true, false, false,
]

function fmt(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })
}

function ActCalculator() {
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // Shared inputs
  const [ccsPercent, setCcsPercent] = useState(DEFAULTS.ccsPercent)
  const [withholding, setWithholding] = useState(DEFAULTS.ccsWithholding)

  // Daily inputs
  const [sessionFee, setSessionFee] = useState(DEFAULTS.sessionFee)
  const [sessionStart, setSessionStart] = useState(8)
  const [sessionEnd, setSessionEnd] = useState(18)
  const [daysPerWeek, setDaysPerWeek] = useState('3')
  const [preschoolHours, setPreschoolHours] = useState('6')
  const [preschoolStart, setPreschoolStart] = useState(8.5)

  // Fortnightly inputs
  const [fnCcsHours, setFnCcsHours] = useState(DEFAULTS.ccsHoursPerFortnight)
  const [fnPreschoolHours, setFnPreschoolHours] = useState('6')
  const [fnPreschoolStart, setFnPreschoolStart] = useState(8.5)
  const [days, setDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: 8, sessionEnd: 18 },
      DEFAULT_PRESCHOOL,
    ),
  )

  const dailyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const fee = Number(sessionFee) || 0
    const ph = Number(preschoolHours) || 0
    const wh = Number(withholding) || 0

    if (fee <= 0 || sessionEnd <= sessionStart) return null

    return calculateActDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: sessionStart,
      sessionEndHour: sessionEnd,
      kindyProgramHours: ph,
      sessionCoveredByCcs: true,
    })
  }, [ccsPercent, withholding, sessionFee, sessionStart, sessionEnd, preschoolHours])

  const weeklyGaps = useMemo(() => {
    if (!dailyResult) return null
    return computeWeeklyGaps({
      sessionFee: Number(sessionFee) || 0,
      sessionHours: sessionEnd - sessionStart,
      daysPerWeek: Number(daysPerWeek) || 3,
      ccsHoursPerFortnight: Number(fnCcsHours) || 72,
      fullDailyCcs: dailyResult.ccsEntitlement,
      dailyStateFunding: dailyResult.kindyFundingAmount,
    })
  }, [dailyResult, sessionFee, sessionStart, sessionEnd, daysPerWeek, fnCcsHours])

  const fnProgramWeeks = Math.round(300 / (Number(fnPreschoolHours) || 6))

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const wh = Number(withholding) || 0
    const ccsHours = Number(fnCcsHours) || 36
    const ph = Number(fnPreschoolHours) || 6

    const sessions: FortnightlySession[] = days.map((d, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const day = WEEKDAYS[i % 5]
      const fee = d.booked ? (Number(d.sessionFee) || 0) : 0
      const start = d.booked ? d.sessionStart : 0
      const end = d.booked ? d.sessionEnd : 0
      const hasPreschool = d.booked && d.hasKindy
      const ps = hasPreschool ? fnPreschoolStart : null
      const pe = hasPreschool ? fnPreschoolStart + ph : null

      return { week, day, sessionFee: fee, sessionStartHour: start, sessionEndHour: end, kindyProgramStartHour: ps, kindyProgramEndHour: pe }
    })

    if (!days.some((d) => d.booked && (Number(d.sessionFee) || 0) > 0)) return null

    return calculateActFortnightly(
      {
        ccsPercent: ccs,
        ccsWithholdingPercent: wh,
        fortnightlyCcsHours: ccsHours,
        sessions,
      },
      fnProgramWeeks,
    )
  }, [ccsPercent, withholding, fnCcsHours, fnPreschoolHours, fnPreschoolStart, fnProgramWeeks, days])

  const dayResults: DayResult[] | null = fortnightlyResult
    ? fortnightlyResult.sessions.map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: s.kindyFundingAmount,
        gapFee: s.estimatedGapFee,
      }))
    : null

  const kindyHoursPerWeek = getActKindyHoursPerWeek(fnProgramWeeks)

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
                schemeTag="ACT"
                schemeName="Free 3-Year-Old Preschool"
                description="The ACT provides 300 hours per year of funded preschool for 3-year-olds enrolled in approved long day care centres. Funding covers one preschool day per week, with hours varying by program length."
                keyFacts={[
                  { label: 'Annual Hours Funded', value: '300 hours' },
                  { label: 'Days per Week', value: '1 day' },
                  { label: 'Program Length', value: '6\u20137.5 hrs/day' },
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
                    title: 'CCS Hours per Fortnight',
                    description: 'The number of subsidised hours you are approved for each fortnight. Check your Centrelink CCS assessment.',
                  },
                  {
                    title: 'Preschool Day Selection',
                    description: 'Pick which day each week your child attends the preschool program. Only one day per week is funded.',
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
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="Preschool program hours"
                        hint="Hours per day"
                        options={PRESCHOOL_OPTIONS}
                        value={preschoolHours}
                        onChange={(e) => setPreschoolHours(e.target.value)}
                      />
                      <TimePicker
                        label="Preschool start time"
                        hint="When the program starts"
                        value={preschoolStart}
                        onChange={setPreschoolStart}
                        min={7}
                        max={12}
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
                      { label: 'Gap Before Preschool Funding', value: fmt(dailyResult.gapBeforeKindy), muted: true },
                      { label: 'Preschool Funding', value: `- ${fmt(dailyResult.kindyFundingAmount)}` },
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
                      : 'Assumes 1 preschool day per week. The preschool program hours are fully funded. You only pay for the care hours outside the program, minus CCS.'
                    }
                  />
                )}
              </>
            ) : (
              <>
                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Fortnightly Settings</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
                    <SelectField
                      label="Preschool hours/day"
                      hint={`${fnProgramWeeks} weeks/yr, ${kindyHoursPerWeek.toFixed(1)} hrs/wk`}
                      options={PRESCHOOL_OPTIONS}
                      value={fnPreschoolHours}
                      onChange={(e) => setFnPreschoolHours(e.target.value)}
                    />
                    <TimePicker
                      label="Preschool start"
                      value={fnPreschoolStart}
                      onChange={setFnPreschoolStart}
                      min={7}
                      max={12}
                    />
                  </div>
                </div>

                <FortnightlyGrid
                  days={days}
                  onChange={setDays}
                  results={dayResults}
                  kindyToggle={{ label: 'Preschool', maxPerWeek: 1 }}
                  fundingLabel="Preschool"
                  fmt={fmt}
                />

                {fortnightlyResult && (
                  <ResultCard
                    title="Fortnightly Total"
                    rows={[
                      { label: 'Total Session Fees', value: fmt(fortnightlyResult.totalSessionFees) },
                      { label: 'Total CCS Entitlement', value: `- ${fmt(fortnightlyResult.totalCcsEntitlement)}` },
                      { label: 'Total Preschool Funding', value: `- ${fmt(fortnightlyResult.totalKindyFunding)}` },
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
