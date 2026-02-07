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
import { calculateCcsDaily, calculateCcsFortnightly, getHourlyRateCap } from '../calculators/ccsCalculator'
import type { CareType } from '../calculators/ccsCalculator'
import { computeWeeklyGaps } from '../calculators/ccsWeekly'
import { CCS_HOURLY_RATE_CAP, CCS_HOURLY_RATE_CAP_SCHOOL_AGE, FDC_HOURLY_RATE_CAP } from '../calculators/ccs'
import { DEFAULTS } from '../config'

export const Route = createFileRoute('/ccs')({
  component: CcsCalculator,
})

const CARE_TYPE_OPTIONS = [
  { value: 'centre-based', label: 'Centre-based day care' },
  { value: 'family-day-care', label: 'Family day care' },
  { value: 'oshc', label: 'Outside school hours care' },
]

const CHILD_AGE_OPTIONS = [
  { value: 'below', label: 'Below school age' },
  { value: 'school', label: 'School age' },
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

function CcsCalculator() {
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // Shared inputs
  const [ccsPercent, setCcsPercent] = useState(DEFAULTS.ccsPercent)
  const [withholding, setWithholding] = useState(DEFAULTS.ccsWithholding)
  const [careType, setCareType] = useState<CareType>('centre-based')
  const [schoolAge, setSchoolAge] = useState(false)

  // Daily inputs
  const [sessionFee, setSessionFee] = useState(DEFAULTS.sessionFee)
  const [sessionStart, setSessionStart] = useState(8)
  const [sessionEnd, setSessionEnd] = useState(18)
  const [daysPerWeek, setDaysPerWeek] = useState('3')

  // Fortnightly inputs
  const [fnCcsHours, setFnCcsHours] = useState(DEFAULTS.ccsHoursPerFortnight)
  const [days, setDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: 8, sessionEnd: 18 },
    ),
  )

  // Force school age when OSHC is selected
  const effectiveSchoolAge = careType === 'oshc' ? true : schoolAge
  const hourlyRateCap = getHourlyRateCap(careType, effectiveSchoolAge)

  const dailyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const fee = Number(sessionFee) || 0
    const wh = Number(withholding) || 0

    if (fee <= 0 || sessionEnd <= sessionStart) return null

    return calculateCcsDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: sessionStart,
      sessionEndHour: sessionEnd,
      careType,
      schoolAge: effectiveSchoolAge,
    })
  }, [ccsPercent, withholding, sessionFee, sessionStart, sessionEnd, careType, effectiveSchoolAge])

  const weeklyGaps = useMemo(() => {
    if (!dailyResult) return null
    return computeWeeklyGaps({
      sessionFee: Number(sessionFee) || 0,
      sessionHours: sessionEnd - sessionStart,
      daysPerWeek: Number(daysPerWeek) || 3,
      ccsHoursPerFortnight: Number(fnCcsHours) || 72,
      fullDailyCcs: dailyResult.ccsEntitlement,
      dailyStateFunding: 0,
    })
  }, [dailyResult, sessionFee, sessionStart, sessionEnd, daysPerWeek, fnCcsHours])

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(ccsPercent) || 0
    const wh = Number(withholding) || 0
    const ccsHours = Number(fnCcsHours) || 72

    const sessions = days.map((d) => ({
      booked: d.booked,
      sessionFee: d.booked ? (Number(d.sessionFee) || 0) : 0,
      sessionStartHour: d.booked ? d.sessionStart : 0,
      sessionEndHour: d.booked ? d.sessionEnd : 0,
    }))

    return calculateCcsFortnightly({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      fortnightlyCcsHours: ccsHours,
      careType,
      schoolAge: effectiveSchoolAge,
      sessions,
    })
  }, [ccsPercent, withholding, fnCcsHours, careType, effectiveSchoolAge, days])

  const dayResults: DayResult[] | null = fortnightlyResult
    ? fortnightlyResult.sessions.map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: 0,
        gapFee: s.gapFee,
      }))
    : null

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
                schemeTag="CCS"
                schemeName="Child Care Subsidy"
                description="The federal Child Care Subsidy reduces your child care fees based on family income. It applies to centre-based day care, family day care, and outside school hours care (OSHC)."
                keyFacts={[
                  { label: 'Max Subsidy', value: 'Up to 90%' },
                  { label: 'Rate Cap (LDC)', value: `$${CCS_HOURLY_RATE_CAP}/hr` },
                  { label: 'Rate Cap (School)', value: `$${CCS_HOURLY_RATE_CAP_SCHOOL_AGE}/hr` },
                  { label: 'Rate Cap (FDC)', value: `$${FDC_HOURLY_RATE_CAP}/hr` },
                ]}
                guidance={[
                  {
                    title: 'Your CCS Percentage',
                    description: 'Find this in your myGov account under Centrelink. It ranges from 0% to 90% based on family income, or up to 95% for second and subsequent children in care.',
                  },
                  {
                    title: 'Hourly Rate Cap',
                    description: 'CCS is calculated on the lesser of your actual hourly fee or the hourly rate cap. The cap varies by care type and whether your child is school age.',
                  },
                  {
                    title: 'Activity Test',
                    description: 'From January 2026, all CCS-eligible families receive at least 72 subsidised hours per fortnight. Families where both parents do more than 48 hours of activity get 100 hours.',
                  },
                  {
                    title: 'Withholding',
                    description: 'The government withholds a portion of your CCS (default 5%) as a buffer against overpayments. This is reconciled at the end of the financial year.',
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
                  </div>
                </div>

                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Care Type</h2>
                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="Type of care"
                        options={CARE_TYPE_OPTIONS}
                        value={careType}
                        onChange={(e) => setCareType(e.target.value as CareType)}
                      />
                      <SelectField
                        label="Child's age"
                        hint={careType === 'oshc' ? 'OSHC is for school-age children' : undefined}
                        options={CHILD_AGE_OPTIONS}
                        value={effectiveSchoolAge ? 'school' : 'below'}
                        onChange={(e) => setSchoolAge(e.target.value === 'school')}
                        disabled={careType === 'oshc'}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Hourly rate cap: {fmt(hourlyRateCap)}/hr
                    </p>
                  </div>
                </div>

                {dailyResult && (
                  <ResultCard
                    title="Daily Cost Estimate"
                    rows={[
                      { label: 'Session Fee', value: fmt(Number(sessionFee)) },
                      { label: `CCS Entitlement (${ccsPercent}%)`, value: `- ${fmt(dailyResult.ccsEntitlement)}` },
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
                      : `Based on ${fmt(hourlyRateCap)}/hr rate cap. ${dailyResult.hourlySessionFee > hourlyRateCap ? 'Your hourly fee exceeds the cap, so CCS is calculated on the capped rate.' : 'Your hourly fee is within the rate cap.'}`
                    }
                  />
                )}
              </>
            ) : (
              <>
                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Fortnightly Settings</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <SelectField
                      label="Type of care"
                      options={CARE_TYPE_OPTIONS}
                      value={careType}
                      onChange={(e) => setCareType(e.target.value as CareType)}
                    />
                    <SelectField
                      label="Child's age"
                      options={CHILD_AGE_OPTIONS}
                      value={effectiveSchoolAge ? 'school' : 'below'}
                      onChange={(e) => setSchoolAge(e.target.value === 'school')}
                      disabled={careType === 'oshc'}
                    />
                  </div>
                </div>

                <FortnightlyGrid
                  days={days}
                  onChange={setDays}
                  results={dayResults}
                  fundingLabel="CCS"
                  fmt={fmt}
                />

                {fortnightlyResult && (
                  <ResultCard
                    title="Fortnightly Total"
                    rows={[
                      { label: 'Total Session Fees', value: fmt(fortnightlyResult.totalSessionFees) },
                      { label: 'Total CCS Entitlement', value: `- ${fmt(fortnightlyResult.totalCcsEntitlement)}` },
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
