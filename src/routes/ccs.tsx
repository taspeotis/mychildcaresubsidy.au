import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { CalculatorSidebar } from '../components/CalculatorSidebar'
import { CcsDetailsCard } from '../components/CcsDetailsCard'
import { SessionDetailsCard } from '../components/SessionDetailsCard'
import { SelectField } from '../components/SelectField'
import { ToggleGroup } from '../components/ToggleGroup'
import { ResultCard } from '../components/ResultCard'
import { CcsCalculatorModal } from '../components/CcsCalculatorModal'
import { FortnightlyGrid, createDefaultDays } from '../components/FortnightlyGrid'
import type { DayConfig, DayResult } from '../components/FortnightlyGrid'
import { calculateCcsDaily, calculateCcsFortnightly, getHourlyRateCap } from '../calculators/ccsCalculator'
import type { CareType } from '../calculators/ccsCalculator'
import { CCS_HOURLY_RATE_CAP, CCS_HOURLY_RATE_CAP_SCHOOL_AGE, FDC_HOURLY_RATE_CAP } from '../calculators/ccs'
import { DEFAULTS, fmt } from '../config'
import { useSharedCalculatorState } from '../context/SharedCalculatorState'

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

function CcsCalculator() {
  const shared = useSharedCalculatorState()
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // CCS-specific inputs
  const [careType, setCareType] = useState<CareType>('centre-based')
  const [schoolAge, setSchoolAge] = useState(false)

  // Fortnightly inputs
  const [days, setDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: DEFAULTS.sessionStartHour, sessionEnd: DEFAULTS.sessionEndHour },
    ),
  )

  // Force school age when OSHC is selected
  const effectiveSchoolAge = careType === 'oshc' ? true : schoolAge
  const hourlyRateCap = getHourlyRateCap(careType, effectiveSchoolAge)

  const dailyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const fee = Number(shared.sessionFee) || 0
    const wh = Number(shared.withholding) || 0

    if (fee <= 0 || shared.sessionEnd <= shared.sessionStart) return null

    return calculateCcsDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: shared.sessionStart,
      sessionEndHour: shared.sessionEnd,
      careType,
      schoolAge: effectiveSchoolAge,
    })
  }, [shared.ccsPercent, shared.withholding, shared.sessionFee, shared.sessionStart, shared.sessionEnd, careType, effectiveSchoolAge])

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const wh = Number(shared.withholding) || 0
    const ccsHours = Number(shared.ccsHours) || 72

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
  }, [shared.ccsPercent, shared.withholding, shared.ccsHours, careType, effectiveSchoolAge, days])

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
        onApply={(pct) => shared.setCcsPercent(String(pct))}
        colorScheme="brand"
      />

      <Container className="py-10">
        <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-10 xl:grid-cols-[360px_1fr]">
          {/* Sidebar panel */}
          <aside className="relative mb-8 lg:mb-0">
            <div className="lg:sticky lg:top-20 lg:self-start rounded-2xl sidebar-gradient p-6 lg:p-8">
              <CalculatorSidebar
                schemeTag="CCS"
                colorScheme="brand"
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
                    title: '3 Day Guarantee',
                    description: 'From January 2026, all CCS-eligible families receive at least 72 subsidised hours per fortnight (3 days/week). Families where both parents do more than 48 hours of recognised activity get 100 hours.',
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
                  colorScheme="brand"
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
              colorScheme="brand"
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
                  colorScheme="brand"
                />

                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Care Type</h2>
                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="Type of care"
                        options={CARE_TYPE_OPTIONS}
                        value={careType}
                        onChange={(e) => setCareType(e.target.value as CareType)}
                        colorScheme="brand"
                      />
                      <SelectField
                        label="Child's age"
                        hint={careType === 'oshc' ? 'OSHC is for school-age children' : undefined}
                        options={CHILD_AGE_OPTIONS}
                        value={effectiveSchoolAge ? 'school' : 'below'}
                        onChange={(e) => setSchoolAge(e.target.value === 'school')}
                        disabled={careType === 'oshc'}
                        colorScheme="brand"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Hourly rate cap: {fmt(hourlyRateCap)}/hr
                    </p>
                  </div>
                </div>

                {dailyResult && (() => {
                  const fee = Number(shared.sessionFee)
                  const hrs = dailyResult.sessionHours
                  const hrly = dailyResult.hourlySessionFee
                  const cap = dailyResult.hourlyRateCap
                  const ccsRate = dailyResult.ccsHourlyRate
                  const gross = dailyResult.ccsAmount
                  const wh = dailyResult.ccsWithholding
                  const net = dailyResult.ccsEntitlement
                  const whPct = Number(shared.withholding) || 0

                  return (
                    <ResultCard
                      colorScheme="brand"
                      title="Daily Cost Estimate"
                      detailedToggle
                      rows={[
                        { label: 'Session Fee', value: fmt(fee), type: 'debit' as const },
                        { label: 'Session Length', value: `${hrs} hours`, detailOnly: true },
                        { label: 'Hourly Rate', value: `${fmt(hrly)}/hr`, detail: `${fmt(fee)} ÷ ${hrs} hrs`, detailOnly: true },
                        { label: 'Hourly Rate Cap', value: `${fmt(cap)}/hr`, detail: hrly > cap ? `Your rate ${fmt(hrly)}/hr exceeds the cap` : `Your rate is within the cap`, detailOnly: true },
                        { label: 'CCS Rate', value: `${fmt(ccsRate)}/hr`, detail: `lesser of ${fmt(hrly)} and ${fmt(cap)} × ${shared.ccsPercent}%`, detailOnly: true },
                        { label: 'CCS Amount', value: fmt(gross), detail: `${fmt(ccsRate)}/hr × ${hrs} hrs`, type: 'credit' as const },
                        { label: 'Withholding', value: fmt(wh), detail: `${fmt(gross)} × ${whPct}%`, type: 'debit' as const },
                        { label: 'CCS Entitlement', value: fmt(net), detail: `${fmt(gross)} – ${fmt(wh)}`, type: 'credit' as const },
                        { label: 'Your Estimated Gap Fee', value: fmt(dailyResult.estimatedGapFee), highlight: true, detail: `${fmt(fee)} – ${fmt(net)}` },
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
                      label="Type of care"
                      options={CARE_TYPE_OPTIONS}
                      value={careType}
                      onChange={(e) => setCareType(e.target.value as CareType)}
                      colorScheme="brand"
                    />
                    <SelectField
                      label="Child's age"
                      options={CHILD_AGE_OPTIONS}
                      value={effectiveSchoolAge ? 'school' : 'below'}
                      onChange={(e) => setSchoolAge(e.target.value === 'school')}
                      disabled={careType === 'oshc'}
                      colorScheme="brand"
                    />
                  </div>
                </div>

                <FortnightlyGrid
                  days={days}
                  onChange={setDays}
                  results={dayResults}
                  fundingLabel="CCS"
                  fmt={fmt}
                  colorScheme="brand"
                />

                {fortnightlyResult && (
                  <ResultCard
                    colorScheme="brand"
                    title="Fortnightly Total"
                    rows={[
                      { label: 'Total Session Fees', value: fmt(fortnightlyResult.totalSessionFees), type: 'debit' as const },
                      { label: 'Total CCS Entitlement', value: fmt(fortnightlyResult.totalCcsEntitlement), type: 'credit' as const },
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
