import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Container } from '../components/Container'
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

      <Container className="pt-8">
        <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-teal-600 transition-colors">
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">QLD Free Kindy</h1>
            <p className="mt-1 text-sm text-slate-600">
              Estimate your out-of-pocket childcare costs with Queensland's Free Kindy program
            </p>
          </div>
          <ToggleGroup
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'fortnightly', label: 'Fortnightly' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </div>

        {mode === 'daily' ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
                <h2 className="text-base font-semibold text-slate-900">CCS Details</h2>
                <div className="mt-4 space-y-4">
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
                      className="mt-1 text-xs font-medium text-teal-600 hover:text-teal-500"
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

              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
                <h2 className="text-base font-semibold text-slate-900">Session Details</h2>
                <div className="mt-4 space-y-4">
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
            </div>

            <div>
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
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
                  <h2 className="text-base font-semibold text-slate-900">Fortnightly Setup</h2>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
                  <h2 className="text-base font-semibold text-slate-900">Kindy Days</h2>
                  <p className="mt-1 text-xs text-slate-500">Select which days have a kindy program (max 15 hrs/week)</p>
                  <div className="mt-4 space-y-3">
                    {[1, 2].map((week) => (
                      <div key={week}>
                        <p className="text-xs font-medium text-slate-500 mb-1.5">Week {week}</p>
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
                                className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                                  checked
                                    ? 'border-teal-300 bg-teal-50 text-teal-700'
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
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
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-700">
                          <th className="py-2 pr-3 font-medium">Day</th>
                          <th className="py-2 px-2 font-medium text-right">Fee</th>
                          <th className="py-2 px-2 font-medium text-right">CCS</th>
                          <th className="py-2 px-2 font-medium text-right">Kindy</th>
                          <th className="py-2 pl-2 font-medium text-right">Gap</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fortnightlyResult.sessions.map((s, i) => (
                          <tr key={i} className={s.week === 2 && s.day === 'Mon' ? 'border-t-4 border-slate-100' : ''}>
                            <td className="py-2 pr-3 text-slate-900">
                              <span className="text-slate-500">W{s.week}</span> {s.day}
                            </td>
                            <td className="py-2 px-2 text-right tabular-nums text-slate-900">{fmt(Number(fnSessionFee))}</td>
                            <td className="py-2 px-2 text-right tabular-nums text-slate-700">{fmt(s.ccsEntitlement)}</td>
                            <td className="py-2 px-2 text-right tabular-nums text-teal-600">{fmt(s.kindyFundingAmount)}</td>
                            <td className="py-2 pl-2 text-right tabular-nums font-semibold">{fmt(s.estimatedGapFee)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
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
              </div>
            </div>
          </div>
        )}
      </Container>
    </>
  )
}
