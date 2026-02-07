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
import { calculateQldDaily, calculateQldFortnightly, QLD_KINDY_HOURS_PER_WEEK } from '../calculators/qld'
import { CCS_HOURLY_RATE_CAP } from '../calculators/ccs'
import { computeWeeklyGaps } from '../calculators/ccsWeekly'
import { DEFAULTS } from '../config'
import { useSharedCalculatorState } from '../context/SharedCalculatorState'
import type { FortnightlySession } from '../types'

export const Route = createFileRoute('/qld')({
  component: QldCalculator,
})

const QLD_KINDY_HOURS_PER_FORTNIGHT = QLD_KINDY_HOURS_PER_WEEK * 2

const DAYS_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '2', label: '2 days' },
  { value: '3', label: '3 days' },
  { value: '4', label: '4 days' },
  { value: '5', label: '5 days' },
]

const KINDY_PROGRAM_OPTIONS = [
  { value: '7.5', label: '7.5 hours' },
  { value: '6', label: '6 hours' },
  { value: '5', label: '5 hours' },
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// Default kindy pattern: W1 Mon+Tue, W2 Mon+Tue
const DEFAULT_KINDY = [
  true, true, false, false, false,
  true, true, false, false, false,
]

function fmt(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })
}

function QldCalculator() {
  const shared = useSharedCalculatorState()
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // QLD-specific inputs
  const [kindyHours, setKindyHours] = useState('7.5')
  const [kindyStart, setKindyStart] = useState(8)

  // Fortnightly inputs
  const [fnKindyHours, setFnKindyHours] = useState('7.5')
  const [fnKindyStart, setFnKindyStart] = useState(8)
  const [days, setDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: DEFAULTS.sessionStartHour, sessionEnd: DEFAULTS.sessionEndHour },
      DEFAULT_KINDY,
    ),
  )

  const dailyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const fee = Number(shared.sessionFee) || 0
    const kh = Number(kindyHours) || 0
    const wh = Number(shared.withholding) || 0

    if (fee <= 0 || shared.sessionEnd <= shared.sessionStart) return null

    return calculateQldDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: shared.sessionStart,
      sessionEndHour: shared.sessionEnd,
      kindyProgramHours: kh,
      sessionCoveredByCcs: true,
    })
  }, [shared.ccsPercent, shared.withholding, shared.sessionFee, shared.sessionStart, shared.sessionEnd, kindyHours])

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

  const weeklyNonKindyGaps = useMemo(() => {
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

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const wh = Number(shared.withholding) || 0
    const ccsHours = Number(shared.ccsHours) || 100
    const kh = Number(fnKindyHours) || 7.5

    const sessions: FortnightlySession[] = days.map((d, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const day = WEEKDAYS[i % 5]
      const fee = d.booked ? (Number(d.sessionFee) || 0) : 0
      const start = d.booked ? d.sessionStart : 0
      const end = d.booked ? d.sessionEnd : 0
      const hasKindy = d.booked && d.hasKindy
      const ks = hasKindy ? fnKindyStart : null
      const ke = hasKindy ? fnKindyStart + kh : null

      return { week, day, sessionFee: fee, sessionStartHour: start, sessionEndHour: end, kindyProgramStartHour: ks, kindyProgramEndHour: ke }
    })

    // Check at least one booked day
    if (!days.some((d) => d.booked && (Number(d.sessionFee) || 0) > 0)) return null

    return calculateQldFortnightly({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      fortnightlyCcsHours: ccsHours,
      sessions,
    })
  }, [shared.ccsPercent, shared.withholding, shared.ccsHours, fnKindyHours, fnKindyStart, days])

  const dayResults: DayResult[] | null = fortnightlyResult
    ? fortnightlyResult.sessions.map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: s.kindyFundingAmount,
        gapFee: s.estimatedGapFee,
      }))
    : null

  const kindyHoursNum = Number(kindyHours) || 7.5
  const dpw = Number(shared.daysPerWeek) || 3
  const kindyDaysPerFortnight = Math.round(QLD_KINDY_HOURS_PER_FORTNIGHT / kindyHoursNum)
  const kindyDaysWk1 = Math.min(Math.floor(kindyDaysPerFortnight / 2), dpw)
  const kindyDaysWk2 = Math.min(kindyDaysPerFortnight - Math.floor(kindyDaysPerFortnight / 2), dpw)
  const hasNonKindyDays = (dpw - kindyDaysWk1) > 0 || (dpw - kindyDaysWk2) > 0

  const dailyNote = (() => {
    if (!dailyResult) return ''
    const totalHrs = ((shared.sessionEnd - shared.sessionStart) * dpw * 2).toFixed(0)
    const ccsWarning = `Your ${shared.ccsHours} CCS hours don't cover all ${totalHrs} session hours in the fortnight.`
    const kindySplit = kindyDaysWk1 === kindyDaysWk2
      ? `${kindyDaysWk1} kindy + ${dpw - kindyDaysWk1} non-kindy days per week`
      : `${kindyDaysWk1} kindy days in week 1, ${kindyDaysWk2} in week 2`
    if (weeklyGaps && hasNonKindyDays) return `${ccsWarning} ${kindySplit}.`
    if (weeklyGaps) return `${ccsWarning} Week 2 has reduced CCS coverage.`
    if (hasNonKindyDays) return `${kindySplit}. Non-kindy days have no Free Kindy funding.`
    return `Based on ${kindyHoursNum} hrs/day kindy program, ${QLD_KINDY_HOURS_PER_WEEK} hrs/week funded.`
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
                schemeTag="QLD"
                schemeName="Free Kindy"
                description="Queensland's Free Kindy program provides 30 hours per fortnight of funded kindergarten in approved long day care centres. Common arrangements are two 7.5-hour days per week, or 2 and 3 day splits with 6-hour sessions across the fortnight."
                keyFacts={[
                  { label: 'Funded Hours', value: '30 hrs/fortnight' },
                  { label: 'Typical Split', value: '2 \u00d7 7.5 hr days/wk' },
                  { label: 'Alternative', value: '2/3 days/wk \u00d7 6 hrs' },
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
                    title: 'Session Times',
                    description: 'The hours you drop off and pick up (e.g. 6:30 AM to 6:30 PM).',
                  },
                  {
                    title: 'Kindy Program Hours',
                    description: 'How many hours per day the funded kindy program runs at your centre. 7.5 hours gives two days per week; 6 hours allows a 2/3 day split across the fortnight.',
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
                        label="Kindy program hours"
                        hint="Hours per day"
                        options={KINDY_PROGRAM_OPTIONS}
                        value={kindyHours}
                        onChange={(e) => setKindyHours(e.target.value)}
                      />
                      <TimePicker
                        label="Kindy start time"
                        hint="When the kindy program starts"
                        value={kindyStart}
                        onChange={setKindyStart}
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
                  const kh = Number(kindyHours) || 7.5
                  const ccsCovHrs = dailyResult.kindyCcsCoveredHours ?? kh
                  const nonCcsCovHrs = dailyResult.kindyNonCcsCoveredHours ?? 0
                  const ccsPerHr = dailyResult.kindyCcsPerHour ?? 0
                  const gapPerHr = Math.max(0, hrly - ccsPerHr)

                  const kindyDetail = nonCcsCovHrs > 0
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
                        { label: 'Gap Before Free Kindy', value: fmt(dailyResult.gapBeforeKindy), detail: `${fmt(fee)} – ${fmt(net)}`, muted: true },
                        { label: 'Free Kindy Funding', value: `– ${fmt(dailyResult.kindyFundingAmount)}`, detail: kindyDetail },
                        ...(weeklyGaps
                          ? (hasNonKindyDays
                            ? [
                                { label: 'Kindy Day Gap (Wk 1)', value: fmt(weeklyGaps.week1Gap), highlight: true },
                                { label: 'Kindy Day Gap (Wk 2)', value: fmt(weeklyGaps.week2Gap), highlight: true },
                                { label: 'Non-kindy Day (Wk 1)', value: fmt(weeklyNonKindyGaps!.week1Gap), highlight: true },
                                { label: 'Non-kindy Day (Wk 2)', value: fmt(weeklyNonKindyGaps!.week2Gap), highlight: true },
                              ]
                            : [
                                { label: 'Week 1 Daily Gap', value: fmt(weeklyGaps.week1Gap), highlight: true },
                                { label: 'Week 2 Daily Gap', value: fmt(weeklyGaps.week2Gap), highlight: true, detail: `CCS hours exhausted partway through fortnight` },
                              ]
                          )
                          : (hasNonKindyDays
                            ? [
                                { label: 'Kindy Day Gap', value: fmt(dailyResult.estimatedGapFee), highlight: true, detail: `${fmt(dailyResult.gapBeforeKindy)} – ${fmt(dailyResult.kindyFundingAmount)}` },
                                { label: 'Non-kindy Day Gap', value: fmt(dailyResult.gapBeforeKindy), highlight: true, detail: `No Free Kindy funding on non-kindy days` },
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
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <SelectField
                      label="Kindy hours/day"
                      options={KINDY_PROGRAM_OPTIONS}
                      value={fnKindyHours}
                      onChange={(e) => setFnKindyHours(e.target.value)}
                    />
                    <TimePicker
                      label="Kindy start time"
                      value={fnKindyStart}
                      onChange={setFnKindyStart}
                      min={7}
                      max={12}
                    />
                  </div>
                </div>

                <FortnightlyGrid
                  days={days}
                  onChange={setDays}
                  results={dayResults}
                  kindyToggle={{ label: 'Kindy' }}
                  fundingLabel="Free Kindy"
                  fmt={fmt}
                />

                {fortnightlyResult && (
                  <ResultCard
                    title="Fortnightly Total"
                    rows={[
                      { label: 'Total Session Fees', value: fmt(fortnightlyResult.totalSessionFees) },
                      { label: 'Total CCS Entitlement', value: `- ${fmt(fortnightlyResult.totalCcsEntitlement)}` },
                      { label: 'Total Free Kindy Funding', value: `- ${fmt(fortnightlyResult.totalKindyFunding)}` },
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
