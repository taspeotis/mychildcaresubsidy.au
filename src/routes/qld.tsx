import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { CalculatorSidebar } from '../components/CalculatorSidebar'
import { InputField } from '../components/InputField'
import { SelectField } from '../components/SelectField'
import { TimePicker } from '../components/TimePicker'
import { ToggleGroup } from '../components/ToggleGroup'
import { ResultCard } from '../components/ResultCard'
import { CcsCalculatorModal } from '../components/CcsCalculatorModal'
import { calculateQldDaily, calculateQldFortnightly, QLD_KINDY_HOURS_PER_WEEK } from '../calculators/qld'
import type { FortnightlySession } from '../types'

export const Route = createFileRoute('/qld')({
  component: QldCalculator,
})

const KINDY_PROGRAM_OPTIONS = [
  { value: '7.5', label: '7.5 hours' },
  { value: '6', label: '6 hours' },
  { value: '5', label: '5 hours' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function fmt(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })
}

function QldCalculator() {
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // Daily inputs
  const [ccsPercent, setCcsPercent] = useState('85')
  const [withholding, setWithholding] = useState('5')
  const [sessionFee, setSessionFee] = useState('134')
  const [sessionStart, setSessionStart] = useState(6.5)
  const [sessionEnd, setSessionEnd] = useState(18.5)
  const [kindyHours, setKindyHours] = useState('7.5')
  const [kindyStart, setKindyStart] = useState(8)

  // Fortnightly inputs
  const [fnCcsHours, setFnCcsHours] = useState('100')
  const [fnSessionFee, setFnSessionFee] = useState('134')
  const [fnSessionStart, setFnSessionStart] = useState(6.5)
  const [fnSessionEnd, setFnSessionEnd] = useState(18.5)
  const [fnKindyHours, setFnKindyHours] = useState('7.5')
  const [fnKindyStart, setFnKindyStart] = useState(8)
  const [fnKindyDays, setFnKindyDays] = useState<Record<string, boolean>>({
    'w1-Mon': true,
    'w1-Tue': true,
    'w2-Mon': true,
    'w2-Tue': true,
  })

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
    const fee = Number(fnSessionFee) || 0
    const kh = Number(fnKindyHours) || 7.5

    if (fee <= 0 || fnSessionEnd <= fnSessionStart) return null

    const sessions: FortnightlySession[] = []
    for (const week of [1, 2] as const) {
      for (const day of DAYS) {
        const key = `w${week}-${day}`
        const hasKindy = fnKindyDays[key] ?? false
        const ks = hasKindy ? fnKindyStart : null
        const ke = hasKindy ? fnKindyStart + kh : null

        sessions.push({
          week,
          day,
          sessionFee: fee,
          sessionStartHour: fnSessionStart,
          sessionEndHour: fnSessionEnd,
          kindyProgramStartHour: ks,
          kindyProgramEndHour: ke,
        })
      }
    }

    return calculateQldFortnightly({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      fortnightlyCcsHours: ccsHours,
      sessions,
    })
  }, [ccsPercent, withholding, fnCcsHours, fnSessionFee, fnSessionStart, fnSessionEnd, fnKindyHours, fnKindyStart, fnKindyDays])

  const kindyNote =
    kindyHours === '7.5'
      ? 'Assumes 2 kindy days per week (15 hrs/week)'
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
            description="Queensland's Free Kindy program provides 15 hours per week of funded kindergarten in approved long day care centres. The program covers two 7.5-hour sessions or can be split across multiple days."
            keyFacts={[
              { label: 'Weekly hours funded', value: '15 hours' },
              { label: 'Fortnight total', value: '30 hours' },
              { label: 'Typical arrangement', value: '2 days/week' },
            ]}
            guidance={[
              {
                title: 'Your CCS percentage',
                description: 'Find this in your myGov account under Centrelink. It ranges from 0% to 90% based on family income.',
              },
              {
                title: 'Session fees',
                description: 'The daily fee your centre charges before any subsidies. Check your invoice or ask your centre.',
              },
              {
                title: 'Session times',
                description: 'The hours you drop off and pick up (e.g. 6:30 AM to 6:30 PM).',
              },
              {
                title: 'Kindy program hours',
                description: 'How many hours per day the funded kindy program runs at your centre. Common options are 7.5 or 6 hours.',
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
          {mode === 'daily' ? (
            <>
              <div className="rounded-2xl card-glass p-8">
                <h2 className="text-lg font-bold text-slate-900">CCS Details</h2>
                <div className="mt-5 space-y-4">
                  <div>
                    <InputField
                      label="CCS percentage"
                      type="number"
                      min="0"
                      max="95"
                      value={ccsPercent}
                      onChange={(e) => setCcsPercent(e.target.value)}
                      suffix="%"
                    />
                    <button
                      type="button"
                      onClick={() => setCcsModalOpen(true)}
                      className="mt-1.5 text-xs font-bold text-accent-500 hover:text-accent-400"
                    >
                      Don't know your CCS %? Calculate it
                    </button>
                  </div>
                  <InputField
                    label="CCS withholding"
                    type="number"
                    min="0"
                    max="10"
                    value={withholding}
                    onChange={(e) => setWithholding(e.target.value)}
                    suffix="%"
                    hint="Usually 5%"
                  />
                </div>
              </div>

              <div className="rounded-2xl card-glass p-8">
                <h2 className="text-lg font-bold text-slate-900">Session Details</h2>
                <div className="mt-5 space-y-4">
                  <InputField
                    label="Daily session fee"
                    type="number"
                    min="0"
                    value={sessionFee}
                    onChange={(e) => setSessionFee(e.target.value)}
                    suffix="$"
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
                    { label: 'Session fee', value: fmt(Number(sessionFee)) },
                    { label: `CCS entitlement (${ccsPercent}%)`, value: `- ${fmt(dailyResult.ccsEntitlement)}` },
                    { label: 'Gap before kindy funding', value: fmt(dailyResult.gapBeforeKindy), muted: true },
                    { label: 'Free Kindy funding', value: `- ${fmt(dailyResult.kindyFundingAmount)}` },
                    { label: 'Your estimated gap fee', value: fmt(dailyResult.estimatedGapFee), highlight: true },
                  ]}
                  note={kindyNote}
                />
              )}
            </>
          ) : (
            <>
              <div className="rounded-2xl card-glass p-8">
                <h2 className="text-lg font-bold text-slate-900">Fortnightly Setup</h2>
                <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <InputField
                    label="CCS hours/fortnight"
                    type="number"
                    value={fnCcsHours}
                    onChange={(e) => setFnCcsHours(e.target.value)}
                  />
                  <InputField
                    label="Daily session fee"
                    type="number"
                    value={fnSessionFee}
                    onChange={(e) => setFnSessionFee(e.target.value)}
                    suffix="$"
                  />
                  <TimePicker
                    label="Session start"
                    value={fnSessionStart}
                    onChange={setFnSessionStart}
                    min={5}
                    max={12}
                  />
                  <TimePicker
                    label="Session end"
                    value={fnSessionEnd}
                    onChange={setFnSessionEnd}
                    min={12}
                    max={21}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <SelectField
                    label="Kindy program hours per day"
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

              <div className="rounded-2xl card-glass p-8">
                <h2 className="text-lg font-bold text-slate-900">Kindy Days</h2>
                <p className="mt-1 text-xs text-slate-500">Select which days have a kindy program (max 15 hrs/week)</p>
                <div className="mt-5 space-y-3">
                  {[1, 2].map((week) => (
                    <div key={week}>
                      <p className="text-xs font-bold text-slate-500 mb-2">Week {week}</p>
                      <div className="flex gap-2">
                        {DAYS.map((day) => {
                          const key = `w${week}-${day}`
                          const checked = fnKindyDays[key] ?? false
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() =>
                                setFnKindyDays((prev) => ({
                                  ...prev,
                                  [key]: !prev[key],
                                }))
                              }
                              className={`flex-1 rounded-xl border-2 py-3.5 text-sm font-bold transition-colors ${
                                checked
                                  ? 'border-accent-400 bg-accent-50 text-accent-700'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-accent-300'
                              }`}
                            >
                              {day}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {fortnightlyResult && (
                <div className="rounded-2xl card-glass p-6 overflow-x-auto">
                  <table className="w-full min-w-[20rem] text-sm">
                    <thead>
                      <tr className="text-left text-slate-700">
                        <th className="py-2.5 pr-3 font-bold">Day</th>
                        <th className="py-2.5 px-2 font-bold text-right">Fee</th>
                        <th className="py-2.5 px-2 font-bold text-right">CCS</th>
                        <th className="py-2.5 px-2 font-bold text-right">Kindy</th>
                        <th className="py-2.5 pl-2 font-bold text-right">Gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fortnightlyResult.sessions.map((s, i) => (
                        <tr key={i} className={s.week === 2 && s.day === 'Mon' ? 'border-t-4 border-slate-100' : ''}>
                          <td className="py-2.5 pr-3 text-slate-900">
                            <span className="text-slate-500">W{s.week}</span> {s.day}
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-slate-900">{fmt(Number(fnSessionFee))}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-slate-700">{fmt(s.ccsEntitlement)}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-accent-500 font-semibold">{fmt(s.kindyFundingAmount)}</td>
                          <td className="py-2.5 pl-2 text-right tabular-nums font-bold">{fmt(s.estimatedGapFee)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {fortnightlyResult && (
                <ResultCard
                  title="Fortnightly Total"
                  rows={[
                    { label: 'Total session fees', value: fmt(fortnightlyResult.totalSessionFees) },
                    { label: 'Total CCS entitlement', value: `- ${fmt(fortnightlyResult.totalCcsEntitlement)}` },
                    { label: 'Total Free Kindy funding', value: `- ${fmt(fortnightlyResult.totalKindyFunding)}` },
                    { label: 'Your estimated gap', value: fmt(fortnightlyResult.totalGapFee), highlight: true },
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
