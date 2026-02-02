import { useState, useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { InputField } from '../components/InputField'
import { SelectField } from '../components/SelectField'
import { TimePicker } from '../components/TimePicker'
import { ToggleGroup } from '../components/ToggleGroup'
import { ResultCard } from '../components/ResultCard'
import { CcsCalculatorModal } from '../components/CcsCalculatorModal'
import { calculateActDaily, calculateActFortnightly, getActKindyHoursPerWeek } from '../calculators/act'
import type { FortnightlySession } from '../types'

export const Route = createFileRoute('/act')({
  component: ActCalculator,
})

const PRESCHOOL_OPTIONS = [
  { value: '7.5', label: '7.5 hours' },
  { value: '6', label: '6 hours' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function fmt(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })
}

function ActCalculator() {
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // Daily inputs
  const [ccsPercent, setCcsPercent] = useState('85')
  const [withholding, setWithholding] = useState('5')
  const [sessionFee, setSessionFee] = useState('150')
  const [sessionStart, setSessionStart] = useState(8)
  const [sessionEnd, setSessionEnd] = useState(18)
  const [preschoolHours, setPreschoolHours] = useState('6')
  const [preschoolStart, setPreschoolStart] = useState(8.5)

  // Fortnightly inputs
  const [fnCcsHours, setFnCcsHours] = useState('36')
  const [fnSessionFee, setFnSessionFee] = useState('150')
  const [fnSessionStart, setFnSessionStart] = useState(8)
  const [fnSessionEnd, setFnSessionEnd] = useState(18)
  const [fnPreschoolHours, setFnPreschoolHours] = useState('6')
  const [fnPreschoolStart, setFnPreschoolStart] = useState(8.5)
  const [fnPreschoolDays, setFnPreschoolDays] = useState<Record<string, boolean>>({
    'w1-Wed': true,
    'w2-Wed': true,
  })

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

  const fnProgramWeeks = Math.round(300 / (Number(fnPreschoolHours) || 6))

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const wh = Number(withholding) || 0
    const ccsHours = Number(fnCcsHours) || 36
    const fee = Number(fnSessionFee) || 0
    const ph = Number(fnPreschoolHours) || 6

    if (fee <= 0 || fnSessionEnd <= fnSessionStart) return null

    const sessions: FortnightlySession[] = []
    for (const week of [1, 2] as const) {
      // Only the first selected preschool day per week gets funding
      let fundedThisWeek = false
      for (const day of DAYS) {
        const key = `w${week}-${day}`
        const hasPreschool = (fnPreschoolDays[key] ?? false) && !fundedThisWeek
        if (hasPreschool) fundedThisWeek = true
        const ps = hasPreschool ? fnPreschoolStart : null
        const pe = hasPreschool ? fnPreschoolStart + ph : null

        sessions.push({
          week,
          day,
          sessionFee: fee,
          sessionStartHour: fnSessionStart,
          sessionEndHour: fnSessionEnd,
          kindyProgramStartHour: ps,
          kindyProgramEndHour: pe,
        })
      }
    }

    return calculateActFortnightly(
      {
        ccsPercent: ccs,
        ccsWithholdingPercent: wh,
        fortnightlyCcsHours: ccsHours,
        sessions,
      },
      fnProgramWeeks,
    )
  }, [ccsPercent, withholding, fnCcsHours, fnSessionFee, fnSessionStart, fnSessionEnd, fnPreschoolHours, fnPreschoolStart, fnProgramWeeks, fnPreschoolDays])

  const kindyHoursPerWeek = getActKindyHoursPerWeek(fnProgramWeeks)

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
            <h1 className="text-2xl font-bold text-slate-900">ACT 3-Year-Old Preschool</h1>
            <p className="mt-1 text-sm text-slate-600">
              Estimate your out-of-pocket costs with the ACT's funded preschool program
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
            </div>

            <div>
              {dailyResult && (
                <ResultCard
                  title="Daily Cost Estimate"
                  rows={[
                    { label: 'Session fee', value: fmt(Number(sessionFee)) },
                    { label: `CCS entitlement (${ccsPercent}%)`, value: `- ${fmt(dailyResult.ccsEntitlement)}` },
                    { label: 'Gap before preschool funding', value: fmt(dailyResult.gapBeforeKindy), muted: true },
                    { label: 'Preschool funding', value: `- ${fmt(dailyResult.kindyFundingAmount)}` },
                    { label: 'Your estimated gap fee', value: fmt(dailyResult.estimatedGapFee), highlight: true },
                  ]}
                  note="Assumes 1 preschool day per week. The preschool program hours are fully funded. You only pay for the care hours outside the program, minus CCS."
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
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <SelectField
                      label="Preschool hours"
                      hint={`${fnProgramWeeks} weeks/year, ${kindyHoursPerWeek.toFixed(1)} hrs/week`}
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

                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
                  <h2 className="text-base font-semibold text-slate-900">Preschool Days</h2>
                  <p className="mt-1 text-xs text-slate-500">Select the preschool day for each week (1 day per week)</p>
                  <div className="mt-4 space-y-3">
                    {[1, 2].map((week) => (
                      <div key={week}>
                        <p className="text-xs font-medium text-slate-500 mb-1.5">Week {week}</p>
                        <div className="flex gap-2">
                          {DAYS.map((day) => {
                            const key = `w${week}-${day}`
                            const checked = fnPreschoolDays[key] ?? false
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() =>
                                  setFnPreschoolDays((prev) => {
                                    // Radio-style: clear other days in this week, toggle this one
                                    const next = { ...prev }
                                    for (const d of DAYS) next[`w${week}-${d}`] = false
                                    next[key] = !checked
                                    return next
                                  })
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
                          <th className="py-2 px-2 font-medium text-right">Preschool</th>
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
                      { label: 'Total preschool funding', value: `- ${fmt(fortnightlyResult.totalKindyFunding)}` },
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
