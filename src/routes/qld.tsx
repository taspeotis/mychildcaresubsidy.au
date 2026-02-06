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
import { DEFAULTS } from '../config'
import type { FortnightlySession } from '../types'

export const Route = createFileRoute('/qld')({
  component: QldCalculator,
})

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
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // Shared inputs
  const [ccsPercent, setCcsPercent] = useState(DEFAULTS.ccsPercent)
  const [withholding, setWithholding] = useState(DEFAULTS.ccsWithholding)

  // Daily inputs
  const [sessionFee, setSessionFee] = useState(DEFAULTS.sessionFee)
  const [sessionStart, setSessionStart] = useState(6.5)
  const [sessionEnd, setSessionEnd] = useState(18.5)
  const [kindyHours, setKindyHours] = useState('7.5')
  const [kindyStart, setKindyStart] = useState(8)

  // Fortnightly inputs
  const [fnCcsHours, setFnCcsHours] = useState('100')
  const [fnKindyHours, setFnKindyHours] = useState('7.5')
  const [fnKindyStart, setFnKindyStart] = useState(8)
  const [days, setDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: 6.5, sessionEnd: 18.5 },
      DEFAULT_KINDY,
    ),
  )

  const dailyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const fee = Number(sessionFee) || 0
    const kh = Number(kindyHours) || 0
    const wh = Number(withholding) || 0

    if (fee <= 0 || sessionEnd <= sessionStart) return null

    return calculateQldDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: sessionStart,
      sessionEndHour: sessionEnd,
      kindyProgramHours: kh,
      sessionCoveredByCcs: true,
    })
  }, [ccsPercent, withholding, sessionFee, sessionStart, sessionEnd, kindyHours])

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const wh = Number(withholding) || 0
    const ccsHours = Number(fnCcsHours) || 100
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
  }, [ccsPercent, withholding, fnCcsHours, fnKindyHours, fnKindyStart, days])

  const dayResults: DayResult[] | null = fortnightlyResult
    ? fortnightlyResult.sessions.map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: s.kindyFundingAmount,
        gapFee: s.estimatedGapFee,
      }))
    : null

  const kindyNote =
    kindyHours === '7.5'
      ? 'Assumes 2 kindy days per week (30 hrs/fortnight)'
      : kindyHours === '6'
        ? 'Assumes a 3/2 day split across the fortnight (18/12 hrs)'
        : `${kindyHours}hr kindy program, ${QLD_KINDY_HOURS_PER_WEEK} hrs/week total`

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

                {dailyResult && (
                  <ResultCard
                    title="Daily Cost Estimate"
                    rows={[
                      { label: 'Session Fee', value: fmt(Number(sessionFee)) },
                      { label: `CCS Entitlement (${ccsPercent}%)`, value: `- ${fmt(dailyResult.ccsEntitlement)}` },
                      { label: 'Gap Before Kindy Funding', value: fmt(dailyResult.gapBeforeKindy), muted: true },
                      { label: 'Free Kindy Funding', value: `- ${fmt(dailyResult.kindyFundingAmount)}` },
                      { label: 'Your Estimated Gap Fee', value: fmt(dailyResult.estimatedGapFee), highlight: true },
                    ]}
                    note={kindyNote}
                  />
                )}
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
