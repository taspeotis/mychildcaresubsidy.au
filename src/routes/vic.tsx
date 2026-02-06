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
import { calculateVicDaily, calculateVicFortnightly, VIC_FREE_KINDER_WEEKS } from '../calculators/vic'
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
  const [sessionFee, setSessionFee] = useState(DEFAULTS.sessionFee)
  const [sessionStart, setSessionStart] = useState(8)
  const [sessionEnd, setSessionEnd] = useState(18)
  const [kinderHours, setKinderHours] = useState('15')
  const [cohort, setCohort] = useState<VicCohort>('standard')
  const [daysPerWeek, setDaysPerWeek] = useState('3')

  // Fortnightly inputs
  const [fnCcsHours, setFnCcsHours] = useState('36')
  const [fnSessionFee, setFnSessionFee] = useState(DEFAULTS.sessionFee)
  const [fnSessionStart, setFnSessionStart] = useState(8)
  const [fnSessionEnd, setFnSessionEnd] = useState(18)

  const kinderHoursNum = kinderHours === '15-3yo' ? 15 : Number(kinderHours) || 15

  const dailyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const fee = Number(sessionFee) || 0
    const wh = Number(withholding) || 0
    const days = Number(daysPerWeek) || 3

    if (fee <= 0 || sessionEnd <= sessionStart || days <= 0) return null

    return calculateVicDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: sessionStart,
      sessionEndHour: sessionEnd,
      cohort,
      kinderHoursPerWeek: kinderHoursNum,
      daysPerWeek: days,
    })
  }, [ccsPercent, withholding, sessionFee, sessionStart, sessionEnd, cohort, kinderHoursNum, daysPerWeek])

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const wh = Number(withholding) || 0
    const ccsHours = Number(fnCcsHours) || 36
    const fee = Number(fnSessionFee) || 0
    const days = Number(daysPerWeek) || 3

    if (fee <= 0 || fnSessionEnd <= fnSessionStart || days <= 0) return null

    return calculateVicFortnightly({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      fortnightlyCcsHours: ccsHours,
      sessionFee: fee,
      sessionStartHour: fnSessionStart,
      sessionEndHour: fnSessionEnd,
      cohort,
      kinderHoursPerWeek: kinderHoursNum,
      daysPerWeek: days,
    })
  }, [ccsPercent, withholding, fnCcsHours, fnSessionFee, fnSessionStart, fnSessionEnd, cohort, kinderHoursNum, daysPerWeek])

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
                description="Victoria's Free Kinder program provides an annual fee offset for 3 and 4-year-olds in long day care kindergarten programs. The offset is applied weekly after the Child Care Subsidy, reducing your gap fee."
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
            {mode === 'daily' ? (
              <>
                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">CCS Details</h2>
                  <div className="mt-5 space-y-4">
                    <div>
                      <InputField
                        label="CCS percentage"
                        value={ccsPercent}
                        onChange={(e) => setCcsPercent(e.target.value)}
                        suffix="%"
                        format="percent"
                        min={0}
                        max={95}
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
                      value={withholding}
                      onChange={(e) => setWithholding(e.target.value)}
                      suffix="%"
                      hint="Usually 5%"
                      format="integer"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>

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
                      { label: 'Your Estimated Gap Fee', value: fmt(dailyResult.estimatedGapFee), highlight: true },
                    ]}
                    note={`Based on ${fmt(dailyResult.annualOffset)}/yr offset across ${VIC_FREE_KINDER_WEEKS} weeks and ${daysPerWeek} days/week (${fmt(dailyResult.weeklyOffset)}/week).`}
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
                      value={fnSessionFee}
                      onChange={(e) => setFnSessionFee(e.target.value)}
                      prefix="$"
                      format="currency"
                      min={0}
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
                  <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <SelectField
                      label="Days per week"
                      options={DAYS_OPTIONS}
                      value={daysPerWeek}
                      onChange={(e) => setDaysPerWeek(e.target.value)}
                    />
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

                {fortnightlyResult && (
                  <div className="rounded-2xl card-glass p-6 overflow-x-auto">
                    <table className="w-full min-w-[20rem] text-sm">
                      <thead>
                        <tr className="text-left text-slate-700">
                          <th className="py-2.5 pr-3 font-bold">Day</th>
                          <th className="py-2.5 px-2 font-bold text-right">Fee</th>
                          <th className="py-2.5 px-2 font-bold text-right">CCS</th>
                          <th className="py-2.5 px-2 font-bold text-right">Free Kinder</th>
                          <th className="py-2.5 pl-2 font-bold text-right">Gap</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fortnightlyResult.dailyBreakdown.map((d) => (
                          <tr key={d.day} className={d.day === Number(daysPerWeek) + 1 ? 'border-t-4 border-slate-100' : ''}>
                            <td className="py-2.5 pr-3 text-slate-900">
                              <span className="text-slate-500">W{d.day <= Number(daysPerWeek) ? 1 : 2}</span> Day {d.day <= Number(daysPerWeek) ? d.day : d.day - Number(daysPerWeek)}
                            </td>
                            <td className="py-2.5 px-2 text-right tabular-nums text-slate-900">{fmt(d.sessionFee)}</td>
                            <td className="py-2.5 px-2 text-right tabular-nums text-slate-700">{fmt(d.ccsEntitlement)}</td>
                            <td className="py-2.5 px-2 text-right tabular-nums text-accent-500 font-semibold">{fmt(d.freeKinder)}</td>
                            <td className="py-2.5 pl-2 text-right tabular-nums font-bold">{fmt(d.gapFee)}</td>
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
