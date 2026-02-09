import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { CalculatorSidebar } from '../components/CalculatorSidebar'
import { CcsDetailsCard } from '../components/CcsDetailsCard'
import { SessionDetailsCard } from '../components/SessionDetailsCard'
import { SelectField } from '../components/SelectField'
import { TimePicker } from '../components/TimePicker'
import { ToggleGroup } from '../components/ToggleGroup'
import { ResultCard } from '../components/ResultCard'
import { CcsCalculatorModal } from '../components/CcsCalculatorModal'
import { FortnightlyGrid, createDefaultDays } from '../components/FortnightlyGrid'
import type { DayConfig, DayResult } from '../components/FortnightlyGrid'
import { calculateQldDaily, calculateQldFortnightly, QLD_KINDY_HOURS_PER_WEEK } from '../calculators/qld'
import { CCS_HOURLY_RATE_CAP } from '../calculators/ccs'
import { DEFAULTS, fmt, WEEKDAYS } from '../config'
import { useSharedCalculatorState } from '../context/SharedCalculatorState'
import type { FortnightlySession } from '../types'

export const Route = createFileRoute('/qld')({
  component: QldCalculator,
})

const KINDY_PROGRAM_OPTIONS = [
  { value: '7.5', label: '7.5 hours' },
  { value: '6', label: '6 hours' },
  { value: '5', label: '5 hours' },
]

// Default kindy pattern: W1 Mon+Tue, W2 Mon+Tue
const DEFAULT_KINDY = [
  true, true, false, false, false,
  true, true, false, false, false,
]

function QldCalculator() {
  const shared = useSharedCalculatorState()
  const [mode, setMode] = useState<'daily' | 'fortnightly'>('daily')
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
    })
  }, [shared.ccsPercent, shared.withholding, shared.sessionFee, shared.sessionStart, shared.sessionEnd, kindyHours])

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const wh = Number(shared.withholding) || 0
    const ccsHours = Number(shared.ccsHours) || 72
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
              hideCcsHours={mode === 'daily'}
            />

            {mode === 'daily' ? (
              <>
                <SessionDetailsCard
                  sessionFee={shared.sessionFee}
                  onSessionFeeChange={shared.setSessionFee}
                  sessionStart={shared.sessionStart}
                  onSessionStartChange={shared.setSessionStart}
                  sessionEnd={shared.sessionEnd}
                  onSessionEndChange={shared.setSessionEnd}
                />

                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Free Kindy Details</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4">
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
                      note={`Based on a kindy day with ${kh} hrs of funded program. ${QLD_KINDY_HOURS_PER_WEEK} hrs/week funded. Use the fortnightly calculator for non-kindy days or if your CCS hours run short.`}
                      rows={[
                        { label: 'Session Fee', value: fmt(fee), type: 'debit' as const },
                        { label: 'Session Length', value: `${hrs} hours`, detailOnly: true },
                        { label: 'Hourly Rate', value: `${fmt(hrly)}/hr`, detail: `${fmt(fee)} ÷ ${hrs} hrs`, detailOnly: true },
                        { label: 'Hourly Rate Cap', value: `${fmt(cap)}/hr`, detail: hrly > cap ? `Your rate ${fmt(hrly)}/hr exceeds the cap` : `Your rate is within the cap`, detailOnly: true },
                        { label: 'CCS Rate', value: `${fmt(ccsRate)}/hr`, detail: `lesser of ${fmt(hrly)} and ${fmt(cap)} × ${ccsPct}%`, detailOnly: true },
                        { label: 'CCS Entitlement', value: fmt(net), detail: `${fmt(ccsRate)}/hr × ${hrs} hrs, less ${whPct}% withholding`, type: 'credit' as const },
                        { label: 'Gap Before Free Kindy', value: fmt(dailyResult.gapBeforeKindy), detail: `${fmt(fee)} – ${fmt(net)}`, muted: true },
                        { label: 'Free Kindy Funding', value: fmt(dailyResult.kindyFundingAmount), detail: kindyDetail, type: 'credit' as const },
                        { label: 'Your Estimated Gap Fee', value: fmt(dailyResult.estimatedGapFee), highlight: true, detail: `${fmt(dailyResult.gapBeforeKindy)} – ${fmt(dailyResult.kindyFundingAmount)}` },
                      ]}
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
                      { label: 'Total Session Fees', value: fmt(fortnightlyResult.totalSessionFees), type: 'debit' as const },
                      { label: 'Total CCS Entitlement', value: fmt(fortnightlyResult.totalCcsEntitlement), type: 'credit' as const },
                      { label: 'Total Free Kindy Funding', value: fmt(fortnightlyResult.totalKindyFunding), type: 'credit' as const },
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
