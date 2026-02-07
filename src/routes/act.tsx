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
import { CCS_HOURLY_RATE_CAP } from '../calculators/ccs'
import { computeWeeklyGaps } from '../calculators/ccsWeekly'
import { DEFAULTS } from '../config'
import { useSharedCalculatorState } from '../context/SharedCalculatorState'
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
  const shared = useSharedCalculatorState()
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // ACT-specific inputs
  const [preschoolHours, setPreschoolHours] = useState('6')
  const [preschoolStart, setPreschoolStart] = useState(8.5)

  // Fortnightly inputs
  const [fnPreschoolHours, setFnPreschoolHours] = useState('6')
  const [fnPreschoolStart, setFnPreschoolStart] = useState(8.5)
  const [days, setDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: DEFAULTS.sessionStartHour, sessionEnd: DEFAULTS.sessionEndHour },
      DEFAULT_PRESCHOOL,
    ),
  )

  const dailyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const fee = Number(shared.sessionFee) || 0
    const ph = Number(preschoolHours) || 0
    const wh = Number(shared.withholding) || 0

    if (fee <= 0 || shared.sessionEnd <= shared.sessionStart) return null

    return calculateActDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: shared.sessionStart,
      sessionEndHour: shared.sessionEnd,
      kindyProgramHours: ph,
      sessionCoveredByCcs: true,
    })
  }, [shared.ccsPercent, shared.withholding, shared.sessionFee, shared.sessionStart, shared.sessionEnd, preschoolHours])

  const weeklyGaps = useMemo(() => {
    if (!dailyResult) return null
    return computeWeeklyGaps({
      sessionFee: Number(shared.sessionFee) || 0,
      sessionHours: shared.sessionEnd - shared.sessionStart,
      daysPerWeek: Number(shared.daysPerWeek) || 3,
      ccsHoursPerFortnight: Number(shared.ccsHours) || 72,
      fullDailyCcs: dailyResult.ccsEntitlement,
      dailyStateFunding: dailyResult.kindyFundingAmount,
    })
  }, [dailyResult, shared.sessionFee, shared.sessionStart, shared.sessionEnd, shared.daysPerWeek, shared.ccsHours])

  const weeklyNonPreschoolGaps = useMemo(() => {
    if (!dailyResult) return null
    return computeWeeklyGaps({
      sessionFee: Number(shared.sessionFee) || 0,
      sessionHours: shared.sessionEnd - shared.sessionStart,
      daysPerWeek: Number(shared.daysPerWeek) || 3,
      ccsHoursPerFortnight: Number(shared.ccsHours) || 72,
      fullDailyCcs: dailyResult.ccsEntitlement,
      dailyStateFunding: 0,
    })
  }, [dailyResult, shared.sessionFee, shared.sessionStart, shared.sessionEnd, shared.daysPerWeek, shared.ccsHours])

  const fnProgramWeeks = Math.round(300 / (Number(fnPreschoolHours) || 6))

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const wh = Number(shared.withholding) || 0
    const ccsHours = Number(shared.ccsHours) || 72
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
  }, [shared.ccsPercent, shared.withholding, shared.ccsHours, fnPreschoolHours, fnPreschoolStart, fnProgramWeeks, days])

  const dayResults: DayResult[] | null = fortnightlyResult
    ? fortnightlyResult.sessions.map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: s.kindyFundingAmount,
        gapFee: s.estimatedGapFee,
      }))
    : null

  const kindyHoursPerWeek = getActKindyHoursPerWeek(fnProgramWeeks)

  const dpw = Number(shared.daysPerWeek) || 3
  const hasNonPreschoolDays = dpw > 1

  const dailyNote = (() => {
    if (!dailyResult) return ''
    const totalHrs = ((shared.sessionEnd - shared.sessionStart) * dpw * 2).toFixed(0)
    const ccsWarning = `Your ${shared.ccsHours} CCS hours don't cover all ${totalHrs} session hours in the fortnight.`
    if (weeklyGaps && hasNonPreschoolDays) return `${ccsWarning} 1 preschool + ${dpw - 1} non-preschool days per week.`
    if (weeklyGaps) return `${ccsWarning} Week 2 has reduced CCS coverage.`
    if (hasNonPreschoolDays) return `1 preschool + ${dpw - 1} non-preschool days per week. Non-preschool days have no preschool funding.`
    return 'Assumes 1 preschool day per week. The preschool program hours are fully funded.'
  })()

  return (
    <>
      <CcsCalculatorModal
        open={ccsModalOpen}
        onClose={() => setCcsModalOpen(false)}
        onApply={(pct) => shared.setCcsPercent(String(pct))}
      />

      <Container className="py-10">
        <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-10 xl:grid-cols-[360px_1fr]">
          {/* Sidebar panel */}
          <aside className="relative mb-8 lg:mb-0">
            <div className="lg:sticky lg:top-20 lg:self-start rounded-2xl sidebar-gradient p-6 lg:p-8">
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
                    title: '3 Day Guarantee',
                    description: 'From January 2026, all families get at least 72 subsidised hours per fortnight (3 days/week). 100 hours if both parents do 48+ hours of activity.',
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
              ccsPercent={shared.ccsPercent}
              onCcsPercentChange={shared.setCcsPercent}
              withholding={shared.withholding}
              onWithholdingChange={shared.setWithholding}
              ccsHours={shared.ccsHours}
              onCcsHoursChange={shared.setCcsHours}
              onOpenCcsModal={() => setCcsModalOpen(true)}
            />

            {mode === 'daily' ? (
              <>
                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Session Details</h2>
                  <div className="mt-5 space-y-4">
                    <InputField
                      label="Daily session fee"
                      value={shared.sessionFee}
                      onChange={(e) => shared.setSessionFee(e.target.value)}
                      prefix="$"
                      format="currency"
                      min={0}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <TimePicker
                        label="Session start"
                        value={shared.sessionStart}
                        onChange={shared.setSessionStart}
                        min={5}
                        max={12}
                      />
                      <TimePicker
                        label="Session end"
                        value={shared.sessionEnd}
                        onChange={shared.setSessionEnd}
                        min={12}
                        max={21}
                      />
                    </div>
                    <SelectField
                      label="Days per week"
                      options={DAYS_OPTIONS}
                      value={shared.daysPerWeek}
                      onChange={(e) => shared.setDaysPerWeek(e.target.value)}
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

                {dailyResult && (() => {
                  const fee = Number(shared.sessionFee)
                  const hrs = dailyResult.sessionHoursDecimal
                  const hrly = dailyResult.hourlySessionFee
                  const cap = CCS_HOURLY_RATE_CAP
                  const ccsPct = Number(shared.ccsPercent) || 0
                  const whPct = Number(shared.withholding) || 0
                  const ccsRate = dailyResult.applicableCcsHourlyRate
                  const net = dailyResult.ccsEntitlement
                  const ph = Number(preschoolHours) || 6
                  const ccsCovHrs = dailyResult.kindyCcsCoveredHours ?? ph
                  const nonCcsCovHrs = dailyResult.kindyNonCcsCoveredHours ?? 0
                  const ccsPerHr = dailyResult.kindyCcsPerHour ?? 0
                  const gapPerHr = Math.max(0, hrly - ccsPerHr)

                  const preschoolDetail = nonCcsCovHrs > 0
                    ? `${ccsCovHrs} CCS hrs × ${fmt(gapPerHr)}/hr + ${nonCcsCovHrs} non-CCS hrs × ${fmt(hrly)}/hr`
                    : `${ccsCovHrs} hrs × (${fmt(hrly)} – ${fmt(ccsPerHr)})/hr gap`

                  return (
                    <ResultCard
                      title="Daily Cost Estimate"
                      detailedToggle
                      rows={[
                        { label: 'Session Fee', value: fmt(fee) },
                        { label: 'Session Length', value: `${hrs} hours`, detailOnly: true },
                        { label: 'Hourly Rate', value: `${fmt(hrly)}/hr`, detail: `${fmt(fee)} ÷ ${hrs} hrs`, detailOnly: true },
                        { label: 'Hourly Rate Cap', value: `${fmt(cap)}/hr`, detail: hrly > cap ? `Your rate ${fmt(hrly)}/hr exceeds the cap` : `Your rate is within the cap`, detailOnly: true },
                        { label: 'CCS Rate', value: `${fmt(ccsRate)}/hr`, detail: `lesser of ${fmt(hrly)} and ${fmt(cap)} × ${ccsPct}%`, detailOnly: true },
                        { label: 'CCS Entitlement', value: `– ${fmt(net)}`, detail: `${fmt(ccsRate)}/hr × ${hrs} hrs, less ${whPct}% withholding` },
                        { label: 'Gap Before Preschool', value: fmt(dailyResult.gapBeforeKindy), detail: `${fmt(fee)} – ${fmt(net)}`, muted: true },
                        { label: 'Preschool Funding', value: `– ${fmt(dailyResult.kindyFundingAmount)}`, detail: preschoolDetail },
                        ...(weeklyGaps
                          ? (hasNonPreschoolDays
                            ? [
                                { label: 'Preschool Day Gap (Wk 1)', value: fmt(weeklyGaps.week1Gap), highlight: true },
                                { label: 'Preschool Day Gap (Wk 2)', value: fmt(weeklyGaps.week2Gap), highlight: true },
                                { label: 'Non-preschool Day (Wk 1)', value: fmt(weeklyNonPreschoolGaps!.week1Gap), highlight: true },
                                { label: 'Non-preschool Day (Wk 2)', value: fmt(weeklyNonPreschoolGaps!.week2Gap), highlight: true },
                              ]
                            : [
                                { label: 'Week 1 Daily Gap', value: fmt(weeklyGaps.week1Gap), highlight: true },
                                { label: 'Week 2 Daily Gap', value: fmt(weeklyGaps.week2Gap), highlight: true, detail: `CCS hours exhausted partway through fortnight` },
                              ]
                          )
                          : (hasNonPreschoolDays
                            ? [
                                { label: 'Preschool Day Gap', value: fmt(dailyResult.estimatedGapFee), highlight: true, detail: `${fmt(dailyResult.gapBeforeKindy)} – ${fmt(dailyResult.kindyFundingAmount)}` },
                                { label: 'Non-preschool Day Gap', value: fmt(dailyResult.gapBeforeKindy), highlight: true, detail: `No preschool funding on non-preschool days` },
                              ]
                            : [
                                { label: 'Your Estimated Gap Fee', value: fmt(dailyResult.estimatedGapFee), highlight: true, detail: `${fmt(dailyResult.gapBeforeKindy)} – ${fmt(dailyResult.kindyFundingAmount)}` },
                              ]
                          )
                        ),
                      ]}
                      note={dailyNote}
                    />
                  )
                })()}
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
