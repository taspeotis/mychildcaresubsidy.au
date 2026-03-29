import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { CalculatorSidebar } from '../components/CalculatorSidebar'
import { StickyPanel } from '../components/StickyPanel'
import { CcsDetailsCard } from '../components/CcsDetailsCard'
import { SessionDetailsCard } from '../components/SessionDetailsCard'
import { SelectField } from '../components/SelectField'
import { ToggleGroup } from '../components/ToggleGroup'
import { ResultCard } from '../components/ResultCard'
import { CcsCalculatorModal } from '../components/CcsCalculatorModal'
import { FortnightlyGrid, createDefaultDays } from '../components/FortnightlyGrid'
import type { DayConfig, DayResult } from '../components/FortnightlyGrid'
import { calculateVicDaily, calculateVicFortnightlySessions, VIC_FREE_KINDER_WEEKS, VIC_FREE_KINDER_OFFSET } from '../calculators/vic'
import { CCS_HOURLY_RATE_CAP } from '../calculators/ccs'
import type { VicCohort } from '../calculators/vic'
import { DEFAULTS, fmt, DAYS_OPTIONS, computeDebtRecovery } from '../config'
import { useSharedCalculatorState } from '../context/SharedCalculatorState'

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

function VicCalculator() {
  const shared = useSharedCalculatorState()
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // VIC-specific inputs
  const [kinderHours, setKinderHours] = useState('15')
  const [cohort, setCohort] = useState<VicCohort>('standard')

  // Weekly inputs (1 week)
  const [weeklyDays, setWeeklyDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: DEFAULTS.sessionStartHour, sessionEnd: DEFAULTS.sessionEndHour },
      undefined,
      1,
    ),
  )

  // Fortnightly inputs (2 weeks)
  const [days, setDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: DEFAULTS.sessionStartHour, sessionEnd: DEFAULTS.sessionEndHour },
    ),
  )

  const kinderHoursNum = kinderHours === '15-3yo' ? 15 : Number(kinderHours) || 15

  const dailyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const fee = Number(shared.sessionFee) || 0
    const wh = Number(shared.withholding) || 0
    const dpw = Number(shared.daysPerWeek) || 3

    if (fee <= 0 || shared.sessionEnd <= shared.sessionStart || dpw <= 0) return null

    return calculateVicDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: shared.sessionStart,
      sessionEndHour: shared.sessionEnd,
      cohort,
      kinderHoursPerWeek: kinderHoursNum,
      daysPerWeek: dpw,
    })
  }, [shared.ccsPercent, shared.withholding, shared.sessionFee, shared.sessionStart, shared.sessionEnd, cohort, kinderHoursNum, shared.daysPerWeek])

  // Weekly: duplicate week 1 into a fortnight and calculate
  const weeklyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const wh = Number(shared.withholding) || 0
    const ccsHours = Number(shared.ccsHours) || 72

    const fortnightDays = [...weeklyDays, ...weeklyDays]
    const sessions = fortnightDays.map((d) => ({
      booked: d.booked,
      sessionFee: d.booked ? (Number(d.sessionFee) || 0) : 0,
      sessionStartHour: d.booked ? d.sessionStart : 0,
      sessionEndHour: d.booked ? d.sessionEnd : 0,
    }))

    if (!weeklyDays.some((d) => d.booked && (Number(d.sessionFee) || 0) > 0)) return null

    return calculateVicFortnightlySessions({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      fortnightlyCcsHours: ccsHours,
      cohort,
      kinderHoursPerWeek: kinderHoursNum,
      sessions,
    })
  }, [shared.ccsPercent, shared.withholding, shared.ccsHours, cohort, kinderHoursNum, weeklyDays])

  const weeklyDayResults: DayResult[] | null = weeklyResult
    ? weeklyResult.sessions.slice(0, 5).map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: s.freeKinder,
        gapFee: s.gapFee,
      }))
    : null

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

    if (!days.some((d) => d.booked && (Number(d.sessionFee) || 0) > 0)) return null

    return calculateVicFortnightlySessions({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      fortnightlyCcsHours: ccsHours,
      cohort,
      kinderHoursPerWeek: kinderHoursNum,
      sessions,
    })
  }, [shared.ccsPercent, shared.withholding, shared.ccsHours, cohort, kinderHoursNum, days])

  const dayResults: DayResult[] | null = fortnightlyResult
    ? fortnightlyResult.sessions.map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: s.freeKinder,
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
            <StickyPanel className="rounded-2xl sidebar-gradient p-6 lg:p-8">
              <CalculatorSidebar
                schemeTag="VIC"
                schemeName="Free Kinder"
                description="Victoria's Free Kinder program provides an annual fee offset for 3 and 4-year-olds in long day care kindergarten programs, reducing your gap fee."
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
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'fortnightly', label: 'Fortnightly' },
                  ]}
                  value={mode}
                  onChange={setMode}
                />
              </CalculatorSidebar>
            </StickyPanel>
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
              debtRecovery={shared.debtRecovery}
              onDebtRecoveryChange={shared.setDebtRecovery}
              debtRecoveryMode={shared.debtRecoveryMode}
              onDebtRecoveryModeChange={shared.setDebtRecoveryMode}
            />

            {mode === 'daily' && (
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
                  <h2 className="text-lg font-bold text-slate-900">Free Kinder Details</h2>
                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="Kinder Program"
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
                    <SelectField
                      label="Days Per Week"
                      hint="For offset pro-rating"
                      options={DAYS_OPTIONS}
                      value={shared.daysPerWeek}
                      onChange={(e) => shared.setDaysPerWeek(e.target.value)}
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
                  const ccsRate = Math.round(Math.min(hrly, cap) * (ccsPct / 100) * 100) / 100
                  const net = dailyResult.ccsEntitlement
                  const dpw = Number(shared.daysPerWeek) || 3
                  const khrs = kinderHoursNum
                  const baseOffset = VIC_FREE_KINDER_OFFSET[cohort]

                  const debt = computeDebtRecovery({
                    ccsEntitlement: net,
                    debtRecoveryRaw: shared.debtRecovery,
                    debtRecoveryMode: shared.debtRecoveryMode,
                    bookedDaysPerFortnight: dpw * 2,
                  })
                  const adjustedGap = Math.max(0, Math.round((fee - debt.ccsPaidToService - dailyResult.dailyOffset) * 100) / 100)

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
                        { label: 'Gap Before Free Kinder', value: fmt(dailyResult.gapBeforeFreeKinder), detail: `${fmt(fee)} – ${fmt(net)}`, muted: true },
                        { label: 'Free Kinder Offset', value: fmt(dailyResult.dailyOffset), detail: `${fmt(baseOffset)}/yr × ${khrs}/15 hrs ÷ ${VIC_FREE_KINDER_WEEKS} weeks ÷ ${dpw} days`, type: 'credit' as const },
                        ...(debt.debtPerDay > 0 ? [
                          { label: 'Debt Recovery', value: fmt(debt.debtPerDay), type: 'debit' as const },
                          { label: 'CCS Paid to Service', value: fmt(debt.ccsPaidToService), type: 'credit' as const },
                          ...(debt.recoveredElsewhere > 0 ? [{ label: 'Recovered Elsewhere', value: fmt(debt.recoveredElsewhere), muted: true }] : []),
                        ] : []),
                        { label: 'Your Estimated Gap Fee', value: fmt(debt.debtPerDay > 0 ? adjustedGap : dailyResult.estimatedGapFee), highlight: true, detail: debt.debtPerDay > 0 ? `${fmt(fee)} – ${fmt(debt.ccsPaidToService)} – ${fmt(dailyResult.dailyOffset)}` : `${fmt(dailyResult.gapBeforeFreeKinder)} – ${fmt(dailyResult.dailyOffset)}` },
                      ]}
                    />
                  )
                })()}
              </>
            )}

            {mode === 'weekly' && (
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
                  <h2 className="text-lg font-bold text-slate-900">Free Kinder Settings</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <SelectField
                      label="Kinder Program"
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

                <FortnightlyGrid
                  days={weeklyDays}
                  onChange={setWeeklyDays}
                  results={weeklyDayResults}
                  fundingLabel="Free Kinder"
                  fmt={fmt}
                  defaults={{ sessionFee: shared.sessionFee, sessionStart: shared.sessionStart, sessionEnd: shared.sessionEnd }}
                />

                {weeklyResult && (() => {
                  const w1 = weeklyResult.sessions.slice(0, 5)
                  const w2 = weeklyResult.sessions.slice(5, 10)
                  const w1Gap = w1.reduce((s, d) => s + d.gapFee, 0)
                  const w2Gap = w2.reduce((s, d) => s + d.gapFee, 0)
                  const w1Fees = weeklyDays.filter(d => d.booked).reduce((s, d) => s + (Number(d.sessionFee) || 0), 0)
                  const w1Ccs = w1.reduce((s, d) => s + d.ccsEntitlement, 0)
                  const w1Kinder = w1.reduce((s, d) => s + d.freeKinder, 0)
                  const weeksMatch = Math.abs(w1Gap - w2Gap) < 0.01

                  const bookedCount = weeklyDays.filter(d => d.booked).length
                  const wkDebt = computeDebtRecovery({
                    ccsEntitlement: weeklyResult.totalCcsEntitlement,
                    debtRecoveryRaw: shared.debtRecovery,
                    debtRecoveryMode: shared.debtRecoveryMode,
                    bookedDaysPerFortnight: bookedCount * 2,
                  })

                  if (weeksMatch) {
                    const wkDebtPerWeek = Math.round(wkDebt.debtPerDay / 2 * 100) / 100
                    const wkCcsPaidPerWeek = Math.round((w1Ccs - wkDebtPerWeek) * 100) / 100
                    const adjustedGap = wkDebt.debtPerDay > 0
                      ? Math.max(0, Math.round((w1Fees - wkCcsPaidPerWeek - w1Kinder) * 100) / 100)
                      : w1Gap

                    return (
                      <ResultCard
                        title="Weekly Cost Estimate"
                        rows={[
                          { label: 'Session Fees', value: fmt(w1Fees), type: 'debit' as const },
                          { label: 'CCS Entitlement', value: fmt(w1Ccs), type: 'credit' as const },
                          { label: 'Free Kinder Offset', value: fmt(w1Kinder), type: 'credit' as const },
                          ...(wkDebtPerWeek > 0 ? [
                            { label: 'Debt Recovery', value: fmt(wkDebtPerWeek), type: 'debit' as const },
                          ] : []),
                          { label: 'Your Estimated Gap', value: `${fmt(adjustedGap)} per week`, highlight: true },
                        ]}
                        note="Both weeks of the fortnight are the same — your weekly cost is predictable."
                      />
                    )
                  }

                  const w2Ccs = w2.reduce((s, d) => s + d.ccsEntitlement, 0)
                  const w2Kinder = w2.reduce((s, d) => s + d.freeKinder, 0)
                  const fnAdjustedGap = wkDebt.debtPerDay > 0
                    ? Math.max(0, Math.round((weeklyResult.totalSessionFees - wkDebt.ccsPaidToService - weeklyResult.totalFreeKinder) * 100) / 100)
                    : weeklyResult.totalGapFee

                  return (
                    <ResultCard
                      title="Weekly Cost Estimate"
                      rows={[
                        { label: 'Weekly Session Fees', value: fmt(w1Fees), type: 'debit' as const },
                        { label: 'Week 1 CCS', value: fmt(w1Ccs), type: 'credit' as const },
                        { label: 'Week 1 Free Kinder', value: fmt(w1Kinder), type: 'credit' as const },
                        { label: 'Week 1 Gap', value: fmt(w1Gap) },
                        { label: 'Week 2 CCS', value: fmt(w2Ccs), type: 'credit' as const },
                        { label: 'Week 2 Free Kinder', value: fmt(w2Kinder), type: 'credit' as const },
                        { label: 'Week 2 Gap', value: fmt(w2Gap) },
                        ...(wkDebt.debtPerDay > 0 ? [
                          { label: 'Debt Recovery', value: fmt(wkDebt.debtPerDay), type: 'debit' as const },
                        ] : []),
                        { label: 'Your Fortnightly Gap', value: fmt(fnAdjustedGap), highlight: true },
                      ]}
                      note={`Your ${shared.ccsHours} CCS hours per fortnight don't fully cover week 2, so costs differ between weeks.`}
                    />
                  )
                })()}
              </>
            )}

            {mode === 'fortnightly' && (
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
                  <h2 className="text-lg font-bold text-slate-900">Fortnightly Settings</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <SelectField
                      label="Kinder Program"
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

                <FortnightlyGrid
                  days={days}
                  onChange={setDays}
                  results={dayResults}
                  fundingLabel="Free Kinder"
                  fmt={fmt}
                  defaults={{ sessionFee: shared.sessionFee, sessionStart: shared.sessionStart, sessionEnd: shared.sessionEnd }}
                />

                {fortnightlyResult && (() => {
                  const fnDebt = computeDebtRecovery({
                    ccsEntitlement: fortnightlyResult.totalCcsEntitlement,
                    debtRecoveryRaw: shared.debtRecovery,
                    debtRecoveryMode: shared.debtRecoveryMode,
                    bookedDaysPerFortnight: days.filter(d => d.booked).length,
                  })
                  const fnAdjustedGap = Math.max(0, Math.round((fortnightlyResult.totalSessionFees - fnDebt.ccsPaidToService - fortnightlyResult.totalFreeKinder) * 100) / 100)

                  return (
                    <ResultCard
                      title="Fortnightly Total"
                      rows={[
                        { label: 'Total Session Fees', value: fmt(fortnightlyResult.totalSessionFees), type: 'debit' as const },
                        { label: 'Total CCS Entitlement', value: fmt(fortnightlyResult.totalCcsEntitlement), type: 'credit' as const },
                        { label: 'Total Free Kinder Offset', value: fmt(fortnightlyResult.totalFreeKinder), type: 'credit' as const },
                        ...(fnDebt.debtPerDay > 0 ? [
                          { label: 'Debt Recovery', value: fmt(fnDebt.debtPerDay), type: 'debit' as const },
                          { label: 'CCS Paid to Service', value: fmt(fnDebt.ccsPaidToService), type: 'credit' as const },
                          ...(fnDebt.recoveredElsewhere > 0 ? [{ label: 'Recovered Elsewhere', value: fmt(fnDebt.recoveredElsewhere), muted: true }] : []),
                        ] : []),
                        { label: 'Your Estimated Gap', value: fmt(fnDebt.debtPerDay > 0 ? fnAdjustedGap : fortnightlyResult.totalGapFee), highlight: true },
                      ]}
                    />
                  )
                })()}
              </>
            )}
          </div>
        </div>
      </Container>
    </>
  )
}
