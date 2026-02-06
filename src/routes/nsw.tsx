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
import { calculateNswDaily, calculateNswFortnightly } from '../calculators/nsw'
import type { NswAgeGroup, NswFeeReliefTier } from '../calculators/nsw'
import { DEFAULTS } from '../config'

export const Route = createFileRoute('/nsw')({
  component: NswCalculator,
})

const AGE_OPTIONS = [
  { value: '4+', label: '4+ years old' },
  { value: '3', label: '3 years old' },
]

const TIER_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'maximum', label: 'Maximum' },
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

function NswCalculator() {
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // Shared inputs
  const [ccsPercent, setCcsPercent] = useState(DEFAULTS.ccsPercent)
  const [withholding, setWithholding] = useState(DEFAULTS.ccsWithholding)
  const [sessionFee, setSessionFee] = useState(DEFAULTS.sessionFee)
  const [sessionStart, setSessionStart] = useState(8)
  const [sessionEnd, setSessionEnd] = useState(18)
  const [ageGroup, setAgeGroup] = useState<NswAgeGroup>('4+')
  const [feeReliefTier, setFeeReliefTier] = useState<NswFeeReliefTier>('standard')
  const [serviceWeeks, setServiceWeeks] = useState('50')
  const [daysPerWeek, setDaysPerWeek] = useState('3')

  // Fortnightly inputs
  const [fnCcsHours, setFnCcsHours] = useState('36')
  const [fnSessionFee, setFnSessionFee] = useState(DEFAULTS.sessionFee)
  const [fnSessionStart, setFnSessionStart] = useState(8)
  const [fnSessionEnd, setFnSessionEnd] = useState(18)

  const dailyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const fee = Number(sessionFee) || 0
    const wh = Number(withholding) || 0
    const weeks = Number(serviceWeeks) || 50
    const days = Number(daysPerWeek) || 3

    if (fee <= 0 || sessionEnd <= sessionStart || weeks <= 0 || days <= 0) return null

    return calculateNswDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: sessionStart,
      sessionEndHour: sessionEnd,
      ageGroup,
      feeReliefTier,
      serviceWeeks: weeks,
      daysPerWeek: days,
    })
  }, [ccsPercent, withholding, sessionFee, sessionStart, sessionEnd, ageGroup, feeReliefTier, serviceWeeks, daysPerWeek])

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const wh = Number(withholding) || 0
    const ccsHours = Number(fnCcsHours) || 36
    const fee = Number(fnSessionFee) || 0
    const weeks = Number(serviceWeeks) || 50
    const days = Number(daysPerWeek) || 3

    if (fee <= 0 || fnSessionEnd <= fnSessionStart || weeks <= 0 || days <= 0) return null

    return calculateNswFortnightly({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      fortnightlyCcsHours: ccsHours,
      sessionFee: fee,
      sessionStartHour: fnSessionStart,
      sessionEndHour: fnSessionEnd,
      ageGroup,
      feeReliefTier,
      serviceWeeks: weeks,
      daysPerWeek: days,
    })
  }, [ccsPercent, withholding, fnCcsHours, fnSessionFee, fnSessionStart, fnSessionEnd, ageGroup, feeReliefTier, serviceWeeks, daysPerWeek])

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
                schemeTag="NSW"
                schemeName="Start Strong"
                description="The NSW Start Strong program provides annual fee relief for children in long day care preschool programs. Fee relief is applied weekly after the Child Care Subsidy, reducing your gap fee."
                keyFacts={[
                  { label: 'Fee Relief (4+)', value: '$1,783\u2013$2,563/yr' },
                  { label: 'Fee Relief (3yo)', value: '$423\u2013$769/yr' },
                  { label: 'Applied', value: 'Weekly, after CCS' },
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
                    title: 'Fee Relief Tier',
                    description: 'Maximum rate applies if your child is Aboriginal/Torres Strait Islander, from a low-income family, has disability/additional needs, or attends a service in a disadvantaged or regional area.',
                  },
                  {
                    title: 'Service Operating Weeks',
                    description: 'How many weeks per year your centre operates. Most services run 48\u201352 weeks. Check with your centre.',
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
                  <h2 className="text-lg font-bold text-slate-900">Start Strong Details</h2>
                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="Child's age group"
                        options={AGE_OPTIONS}
                        value={ageGroup}
                        onChange={(e) => setAgeGroup(e.target.value as NswAgeGroup)}
                      />
                      <SelectField
                        label="Fee relief tier"
                        hint="See sidebar for eligibility"
                        options={TIER_OPTIONS}
                        value={feeReliefTier}
                        onChange={(e) => setFeeReliefTier(e.target.value as NswFeeReliefTier)}
                      />
                    </div>
                    <InputField
                      label="Service operating weeks"
                      hint="Weeks per year your centre operates"
                      value={serviceWeeks}
                      onChange={(e) => setServiceWeeks(e.target.value)}
                      type="number"
                      min={48}
                      max={52}
                    />
                  </div>
                </div>

                {dailyResult && (
                  <ResultCard
                    title="Daily Cost Estimate"
                    rows={[
                      { label: 'Session Fee', value: fmt(Number(sessionFee)) },
                      { label: `CCS Entitlement (${ccsPercent}%)`, value: `- ${fmt(dailyResult.ccsEntitlement)}` },
                      { label: 'Gap Before Fee Relief', value: fmt(dailyResult.gapBeforeFeeRelief), muted: true },
                      { label: `Start Strong Fee Relief`, value: `- ${fmt(dailyResult.dailyFeeRelief)}` },
                      { label: 'Your Estimated Gap Fee', value: fmt(dailyResult.estimatedGapFee), highlight: true },
                    ]}
                    note={`Based on ${fmt(dailyResult.annualFeeRelief)}/yr fee relief across ${serviceWeeks} weeks and ${daysPerWeek} days/week (${fmt(dailyResult.weeklyFeeRelief)}/week).`}
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
                      label="Child's age group"
                      options={AGE_OPTIONS}
                      value={ageGroup}
                      onChange={(e) => setAgeGroup(e.target.value as NswAgeGroup)}
                    />
                    <SelectField
                      label="Fee relief tier"
                      options={TIER_OPTIONS}
                      value={feeReliefTier}
                      onChange={(e) => setFeeReliefTier(e.target.value as NswFeeReliefTier)}
                    />
                    <InputField
                      label="Service weeks/year"
                      value={serviceWeeks}
                      onChange={(e) => setServiceWeeks(e.target.value)}
                      type="number"
                      min={48}
                      max={52}
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
                          <th className="py-2.5 px-2 font-bold text-right">Start Strong</th>
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
                            <td className="py-2.5 px-2 text-right tabular-nums text-accent-500 font-semibold">{fmt(d.feeRelief)}</td>
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
                      { label: 'Total Start Strong Fee Relief', value: `- ${fmt(fortnightlyResult.totalFeeRelief)}` },
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
