import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { CalculatorSidebar } from '../components/CalculatorSidebar'
import { CcsDetailsCard } from '../components/CcsDetailsCard'
import { SessionDetailsCard } from '../components/SessionDetailsCard'
import { InputField } from '../components/InputField'
import { SelectField } from '../components/SelectField'
import { ToggleGroup } from '../components/ToggleGroup'
import { ResultCard } from '../components/ResultCard'
import { CcsCalculatorModal } from '../components/CcsCalculatorModal'
import { FortnightlyGrid, createDefaultDays } from '../components/FortnightlyGrid'
import type { DayConfig, DayResult } from '../components/FortnightlyGrid'
import { calculateNswDaily, calculateNswFortnightlySessions, NSW_FEE_RELIEF } from '../calculators/nsw'
import { CCS_HOURLY_RATE_CAP } from '../calculators/ccs'
import type { NswAgeGroup, NswFeeReliefTier } from '../calculators/nsw'
import { DEFAULTS, fmt, DAYS_OPTIONS } from '../config'
import { useSharedCalculatorState } from '../context/SharedCalculatorState'

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

function NswCalculator() {
  const shared = useSharedCalculatorState()
  const [mode, setMode] = useState<'daily' | 'fortnightly'>('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // NSW-specific inputs
  const [ageGroup, setAgeGroup] = useState<NswAgeGroup>('4+')
  const [feeReliefTier, setFeeReliefTier] = useState<NswFeeReliefTier>('standard')
  const [serviceWeeks, setServiceWeeks] = useState('50')

  // Fortnightly inputs
  const [days, setDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: DEFAULTS.sessionStartHour, sessionEnd: DEFAULTS.sessionEndHour },
    ),
  )

  const dailyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const fee = Number(shared.sessionFee) || 0
    const wh = Number(shared.withholding) || 0
    const weeks = Number(serviceWeeks) || 50
    const dpw = Number(shared.daysPerWeek) || 3

    if (fee <= 0 || shared.sessionEnd <= shared.sessionStart || weeks <= 0 || dpw <= 0) return null

    return calculateNswDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: shared.sessionStart,
      sessionEndHour: shared.sessionEnd,
      ageGroup,
      feeReliefTier,
      serviceWeeks: weeks,
      daysPerWeek: dpw,
    })
  }, [shared.ccsPercent, shared.withholding, shared.sessionFee, shared.sessionStart, shared.sessionEnd, ageGroup, feeReliefTier, serviceWeeks, shared.daysPerWeek])

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const wh = Number(shared.withholding) || 0
    const ccsHours = Number(shared.ccsHours) || 72
    const weeks = Number(serviceWeeks) || 50

    const sessions = days.map((d) => ({
      booked: d.booked,
      sessionFee: d.booked ? (Number(d.sessionFee) || 0) : 0,
      sessionStartHour: d.booked ? d.sessionStart : 0,
      sessionEndHour: d.booked ? d.sessionEnd : 0,
    }))

    if (!days.some((d) => d.booked && (Number(d.sessionFee) || 0) > 0)) return null

    return calculateNswFortnightlySessions({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      fortnightlyCcsHours: ccsHours,
      ageGroup,
      feeReliefTier,
      serviceWeeks: weeks,
      sessions,
    })
  }, [shared.ccsPercent, shared.withholding, shared.ccsHours, ageGroup, feeReliefTier, serviceWeeks, days])

  const dayResults: DayResult[] | null = fortnightlyResult
    ? fortnightlyResult.sessions.map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: s.feeRelief,
        gapFee: s.gapFee,
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
                schemeTag="NSW"
                schemeName="Start Strong"
                description="The NSW Start Strong program provides annual fee relief for children in long day care preschool programs, reducing your gap fee."
                keyFacts={[
                  { label: 'Fee Relief (4+)', value: '$1,783\u2013$2,563/yr' },
                  { label: 'Fee Relief (3yo)', value: '$423\u2013$769/yr' },
                  { label: 'Applied', value: 'Weekly' },
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
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="Days per week"
                        hint="For fee relief pro-rating"
                        options={DAYS_OPTIONS}
                        value={shared.daysPerWeek}
                        onChange={(e) => shared.setDaysPerWeek(e.target.value)}
                      />
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
                  const annualRelief = NSW_FEE_RELIEF[ageGroup][feeReliefTier]
                  const weeks = Number(serviceWeeks) || 50
                  const dpw = Number(shared.daysPerWeek) || 3

                  return (
                    <ResultCard
                      title="Daily Cost Estimate"
                      detailedToggle
                      rows={[
                        { label: 'Session Fee', value: fmt(fee), type: 'debit' as const },
                        { label: 'Session Length', value: `${hrs} hours`, detailOnly: true },
                        { label: 'Hourly Rate', value: `${fmt(hrly)}/hr`, detail: `${fmt(fee)} ÷ ${hrs} hrs`, detailOnly: true },
                        { label: 'Hourly Rate Cap', value: `${fmt(cap)}/hr`, detail: hrly > cap ? `Your rate ${fmt(hrly)}/hr exceeds the cap` : `Your rate is within the cap`, detailOnly: true },
                        { label: 'CCS Rate', value: `${fmt(ccsRate)}/hr`, detail: `lesser of ${fmt(hrly)} and ${fmt(cap)} × ${ccsPct}%`, detailOnly: true },
                        { label: 'CCS Entitlement', value: fmt(net), detail: `${fmt(ccsRate)}/hr × ${hrs} hrs, less ${whPct}% withholding`, type: 'credit' as const },
                        { label: 'Gap Before Fee Relief', value: fmt(dailyResult.gapBeforeFeeRelief), detail: `${fmt(fee)} – ${fmt(net)}`, muted: true },
                        { label: 'Start Strong Fee Relief', value: fmt(dailyResult.dailyFeeRelief), detail: `${fmt(annualRelief)}/yr ÷ ${weeks} weeks ÷ ${dpw} days`, type: 'credit' as const },
                        { label: 'Your Estimated Gap Fee', value: fmt(dailyResult.estimatedGapFee), highlight: true, detail: `${fmt(dailyResult.gapBeforeFeeRelief)} – ${fmt(dailyResult.dailyFeeRelief)}` },
                      ]}
                    />
                  )
                })()}
              </>
            ) : (
              <>
                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Fortnightly Settings</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
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

                <FortnightlyGrid
                  days={days}
                  onChange={setDays}
                  results={dayResults}
                  fundingLabel="Start Strong"
                  fmt={fmt}
                />

                {fortnightlyResult && (
                  <ResultCard
                    title="Fortnightly Total"
                    rows={[
                      { label: 'Total Session Fees', value: fmt(fortnightlyResult.totalSessionFees), type: 'debit' as const },
                      { label: 'Total CCS Entitlement', value: fmt(fortnightlyResult.totalCcsEntitlement), type: 'credit' as const },
                      { label: 'Total Start Strong Fee Relief', value: fmt(fortnightlyResult.totalFeeRelief), type: 'credit' as const },
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
