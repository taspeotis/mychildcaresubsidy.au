import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { CalculatorSidebar } from '../components/CalculatorSidebar'
import { StickyPanel } from '../components/StickyPanel'
import { CcsDetailsCard } from '../components/CcsDetailsCard'
import { SessionDetailsCard } from '../components/SessionDetailsCard'
import { SelectField } from '../components/SelectField'
import { TimePicker } from '../components/TimePicker'
import { ToggleGroup } from '../components/ToggleGroup'
import { ResultCard } from '../components/ResultCard'
import { CcsCalculatorModal } from '../components/CcsCalculatorModal'
import { FortnightlyGrid, createDefaultDays } from '../components/FortnightlyGrid'
import type { DayConfig, DayResult } from '../components/FortnightlyGrid'
import { calculateActDaily, calculateActFortnightly, getActKindyHoursPerWeek } from '../calculators/act'
import { CCS_HOURLY_RATE_CAP } from '../calculators/ccs'
import { DEFAULTS, fmt, WEEKDAYS, computeDebtRecovery } from '../config'
import { useSharedCalculatorState } from '../context/SharedCalculatorState'
import type { FortnightlySession } from '../types'

export const Route = createFileRoute('/act')({
  component: ActCalculator,
})

const PRESCHOOL_OPTIONS = [
  { value: '7.5', label: '7.5 hours' },
  { value: '6', label: '6 hours' },
]

function ActCalculator() {
  const shared = useSharedCalculatorState()
  const [mode, setMode] = useState('daily')
  const [ccsModalOpen, setCcsModalOpen] = useState(false)

  // ACT-specific inputs
  const [preschoolHours, setPreschoolHours] = useState('6')
  const [preschoolStart, setPreschoolStart] = useState(8.5)

  // Weekly/fortnightly shared inputs
  const [fnPreschoolHours, setFnPreschoolHours] = useState('6')
  const [fnPreschoolStart, setFnPreschoolStart] = useState(8.5)

  // Weekly inputs (1 week) — all days default to preschool; maxPerWeek: 1 gives it to the first booked day
  const [weeklyDays, setWeeklyDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: DEFAULTS.sessionStartHour, sessionEnd: DEFAULTS.sessionEndHour },
      true,
      1,
    ),
  )

  // Fortnightly inputs (2 weeks)
  const [days, setDays] = useState<DayConfig[]>(() =>
    createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: DEFAULTS.sessionStartHour, sessionEnd: DEFAULTS.sessionEndHour },
      true,
    ),
  )

  const dailyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const fee = Number(shared.sessionFee) || 0
    const ph = Number(preschoolHours) || 0
    const wh = Number(shared.withholding) || 0

    if (fee <= 0 || shared.sessionEnd <= shared.sessionStart) return null

    return calculateActDaily({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      sessionFee: fee,
      sessionStartHour: shared.sessionStart,
      sessionEndHour: shared.sessionEnd,
      kindyProgramHours: ph,
    })
  }, [shared.ccsPercent, shared.withholding, shared.sessionFee, shared.sessionStart, shared.sessionEnd, preschoolHours])

  const fnProgramWeeks = Math.round(300 / (Number(fnPreschoolHours) || 6))

  // Weekly: duplicate week 1 into a fortnight and calculate
  const weeklyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const wh = Number(shared.withholding) || 0
    const ccsHours = Number(shared.ccsHours) || 72
    const ph = Number(fnPreschoolHours) || 6

    const fortnightDays = [...weeklyDays, ...weeklyDays]
    const sessions: FortnightlySession[] = fortnightDays.map((d, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const day = WEEKDAYS[i % 5]
      const fee = d.booked ? (Number(d.sessionFee) || 0) : 0
      const start = d.booked ? d.sessionStart : 0
      const end = d.booked ? d.sessionEnd : 0
      const hasPreschool = d.booked && d.hasKindy
      const ps = hasPreschool ? fnPreschoolStart : null
      const pe = hasPreschool ? fnPreschoolStart + ph : null
      return { week, day, sessionFee: fee, sessionStartHour: start, sessionEndHour: end, kindyProgramStartHour: ps, kindyProgramEndHour: pe }
    })

    if (!weeklyDays.some((d) => d.booked && (Number(d.sessionFee) || 0) > 0)) return null

    return calculateActFortnightly(
      { ccsPercent: ccs, ccsWithholdingPercent: wh, fortnightlyCcsHours: ccsHours, sessions },
      fnProgramWeeks,
    )
  }, [shared.ccsPercent, shared.withholding, shared.ccsHours, fnPreschoolHours, fnPreschoolStart, fnProgramWeeks, weeklyDays])

  const weeklyDayResults: DayResult[] | null = weeklyResult
    ? weeklyResult.sessions.slice(0, 5).map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: s.kindyFundingAmount,
        gapFee: s.estimatedGapFee,
      }))
    : null

  const fortnightlyResult = useMemo(() => {
    const ccs = Number(shared.ccsPercent) || 0
    const wh = Number(shared.withholding) || 0
    const ccsHours = Number(shared.ccsHours) || 72
    const ph = Number(fnPreschoolHours) || 6

    const sessions: FortnightlySession[] = days.map((d, i) => {
      const week = (i < 5 ? 1 : 2) as 1 | 2
      const day = WEEKDAYS[i % 5]
      const fee = d.booked ? (Number(d.sessionFee) || 0) : 0
      const start = d.booked ? d.sessionStart : 0
      const end = d.booked ? d.sessionEnd : 0
      const hasPreschool = d.booked && d.hasKindy
      const ps = hasPreschool ? fnPreschoolStart : null
      const pe = hasPreschool ? fnPreschoolStart + ph : null

      return { week, day, sessionFee: fee, sessionStartHour: start, sessionEndHour: end, kindyProgramStartHour: ps, kindyProgramEndHour: pe }
    })

    if (!days.some((d) => d.booked && (Number(d.sessionFee) || 0) > 0)) return null

    return calculateActFortnightly(
      {
        ccsPercent: ccs,
        ccsWithholdingPercent: wh,
        fortnightlyCcsHours: ccsHours,
        sessions,
      },
      fnProgramWeeks,
    )
  }, [shared.ccsPercent, shared.withholding, shared.ccsHours, fnPreschoolHours, fnPreschoolStart, fnProgramWeeks, days])

  const dayResults: DayResult[] | null = fortnightlyResult
    ? fortnightlyResult.sessions.map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: s.kindyFundingAmount,
        gapFee: s.estimatedGapFee,
      }))
    : null

  const kindyHoursPerWeek = getActKindyHoursPerWeek(fnProgramWeeks)

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
                schemeTag="ACT"
                schemeName="Free 3-Year-Old Preschool"
                description="The ACT provides 300 hours per year of funded preschool for 3-year-olds enrolled in approved long day care centres. Funding covers one preschool day per week, with hours varying by program length."
                keyFacts={[
                  { label: 'Annual Hours Funded', value: '300 hours' },
                  { label: 'Days per Week', value: '1 day' },
                  { label: 'Program Length', value: '6\u20137.5 hrs/day' },
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
                    title: '3 Day Guarantee',
                    description: 'From January 2026, all families get at least 72 subsidised hours per fortnight (3 days/week). 100 hours if both parents do 48+ hours of activity.',
                  },
                  {
                    title: 'Preschool Day Selection',
                    description: 'Pick which day each week your child attends the preschool program. Only one day per week is funded.',
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
                  <h2 className="text-lg font-bold text-slate-900">Preschool Details</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <SelectField
                      label="Preschool Program Hours"
                      hint="Hours per day"
                      options={PRESCHOOL_OPTIONS}
                      value={preschoolHours}
                      onChange={(e) => setPreschoolHours(e.target.value)}
                    />
                    <TimePicker
                      label="Preschool Start Time"
                      hint="When the program starts"
                      value={preschoolStart}
                      onChange={setPreschoolStart}
                      min={7}
                      max={12}
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
                  const ccsRate = dailyResult.applicableCcsHourlyRate
                  const net = dailyResult.ccsEntitlement
                  const ph = Number(preschoolHours) || 6
                  const ccsCovHrs = dailyResult.kindyCcsCoveredHours ?? ph
                  const nonCcsCovHrs = dailyResult.kindyNonCcsCoveredHours ?? 0
                  const ccsPerHr = dailyResult.kindyCcsPerHour ?? 0
                  const gapPerHr = Math.max(0, hrly - ccsPerHr)

                  const preschoolDetail = nonCcsCovHrs > 0
                    ? `${ccsCovHrs} CCS hrs × ${fmt(gapPerHr)}/hr + ${nonCcsCovHrs} non-CCS hrs × ${fmt(hrly)}/hr`
                    : `${ccsCovHrs} hrs × (${fmt(hrly)} – ${fmt(ccsPerHr)})/hr gap`

                  const daysPerWeek = Number(shared.daysPerWeek) || 1
                  const debt = computeDebtRecovery({
                    ccsEntitlement: net,
                    debtRecoveryRaw: shared.debtRecovery,
                    debtRecoveryMode: shared.debtRecoveryMode,
                    bookedDaysPerFortnight: daysPerWeek * 2,
                  })
                  const adjustedGap = Math.max(0, Math.round((fee - debt.ccsPaidToService - dailyResult.kindyFundingAmount) * 100) / 100)

                  return (
                    <ResultCard
                      title="Daily Cost Estimate"
                      detailedToggle
                      note={`Based on a preschool day with ${ph} hrs of funded program. Use the fortnightly calculator for non-preschool days or if your CCS hours run short.`}
                      rows={[
                        { label: 'Session Fee', value: fmt(fee), type: 'debit' as const },
                        { label: 'Session Length', value: `${hrs} hours`, detailOnly: true },
                        { label: 'Hourly Rate', value: `${fmt(hrly)}/hr`, detail: `${fmt(fee)} ÷ ${hrs} hrs`, detailOnly: true },
                        { label: 'Hourly Rate Cap', value: `${fmt(cap)}/hr`, detail: hrly > cap ? `Your rate ${fmt(hrly)}/hr exceeds the cap` : `Your rate is within the cap`, detailOnly: true },
                        { label: 'CCS Rate', value: `${fmt(ccsRate)}/hr`, detail: `lesser of ${fmt(hrly)} and ${fmt(cap)} × ${ccsPct}%`, detailOnly: true },
                        { label: 'CCS Entitlement', value: fmt(net), detail: `${fmt(ccsRate)}/hr × ${hrs} hrs, less ${whPct}% withholding`, type: 'credit' as const },
                        { label: 'Gap Before Preschool', value: fmt(dailyResult.gapBeforeKindy), detail: `${fmt(fee)} – ${fmt(net)}`, muted: true },
                        { label: 'Preschool Funding', value: fmt(dailyResult.kindyFundingAmount), detail: preschoolDetail, type: 'credit' as const },
                        ...(debt.debtPerDay > 0 ? [
                          { label: 'Debt Recovery', value: fmt(debt.debtPerDay), type: 'debit' as const },
                          { label: 'CCS Paid to Service', value: fmt(debt.ccsPaidToService), type: 'credit' as const },
                          ...(debt.recoveredElsewhere > 0 ? [{ label: 'Recovered Elsewhere', value: fmt(debt.recoveredElsewhere), muted: true }] : []),
                        ] : []),
                        { label: 'Your Estimated Gap', value: fmt(debt.debtPerDay > 0 ? adjustedGap : dailyResult.estimatedGapFee), highlight: true, detail: debt.debtPerDay > 0 ? `${fmt(fee)} – ${fmt(debt.ccsPaidToService)} – ${fmt(dailyResult.kindyFundingAmount)}` : `${fmt(dailyResult.gapBeforeKindy)} – ${fmt(dailyResult.kindyFundingAmount)}` },
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
                  <h2 className="text-lg font-bold text-slate-900">Preschool Settings</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <SelectField
                      label="Preschool Hours / Day"
                      hint={`${fnProgramWeeks} weeks/yr, ${kindyHoursPerWeek.toFixed(1)} hrs/wk`}
                      options={PRESCHOOL_OPTIONS}
                      value={fnPreschoolHours}
                      onChange={(e) => setFnPreschoolHours(e.target.value)}
                    />
                    <TimePicker
                      label="Preschool Start Time"
                      value={fnPreschoolStart}
                      onChange={setFnPreschoolStart}
                      min={7}
                      max={12}
                    />
                  </div>
                </div>

                <FortnightlyGrid
                  days={weeklyDays}
                  onChange={setWeeklyDays}
                  results={weeklyDayResults}
                  kindyToggle={{ label: 'Preschool' }}
                  fundingLabel="Preschool"
                  fmt={fmt}
                  defaults={{ sessionFee: shared.sessionFee, sessionStart: shared.sessionStart, sessionEnd: shared.sessionEnd }}
                />

                {weeklyResult && (() => {
                  const w1 = weeklyResult.sessions.slice(0, 5)
                  const w2 = weeklyResult.sessions.slice(5, 10)
                  const w1Gap = w1.reduce((s, d) => s + d.estimatedGapFee, 0)
                  const w2Gap = w2.reduce((s, d) => s + d.estimatedGapFee, 0)
                  const w1Fees = weeklyDays.filter(d => d.booked).reduce((s, d) => s + (Number(d.sessionFee) || 0), 0)
                  const w1Ccs = w1.reduce((s, d) => s + d.ccsEntitlement, 0)
                  const w1Kindy = w1.reduce((s, d) => s + d.kindyFundingAmount, 0)
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
                      ? Math.max(0, Math.round((w1Fees - wkCcsPaidPerWeek - w1Kindy) * 100) / 100)
                      : w1Gap

                    return (
                      <ResultCard
                        title="Weekly Cost Estimate"
                        rows={[
                          { label: 'Session Fees', value: fmt(w1Fees), type: 'debit' as const },
                          { label: 'CCS Entitlement', value: fmt(w1Ccs), type: 'credit' as const },
                          { label: 'Preschool Funding', value: fmt(w1Kindy), type: 'credit' as const },
                          ...(wkDebtPerWeek > 0 ? [
                            { label: 'Debt Recovery', value: fmt(wkDebtPerWeek), type: 'debit' as const },
                          ] : []),
                          { label: 'Your Estimated Gap', value: fmt(adjustedGap), highlight: true },
                        ]}
                        note="Both weeks of the fortnight are the same, so your weekly cost is predictable."
                      />
                    )
                  }

                  const w2Ccs = w2.reduce((s, d) => s + d.ccsEntitlement, 0)
                  const w2Kindy = w2.reduce((s, d) => s + d.kindyFundingAmount, 0)
                  const fnAdjustedGap = wkDebt.debtPerDay > 0
                    ? Math.max(0, Math.round((weeklyResult.totalSessionFees - wkDebt.ccsPaidToService - weeklyResult.totalKindyFunding) * 100) / 100)
                    : weeklyResult.totalGapFee

                  return (
                    <ResultCard
                      title="Weekly Cost Estimate"
                      rows={[
                        { label: 'Weekly Session Fees', value: fmt(w1Fees), type: 'debit' as const },
                        { label: 'Week 1 CCS', value: fmt(w1Ccs), type: 'credit' as const },
                        { label: 'Week 1 Preschool Funding', value: fmt(w1Kindy), type: 'credit' as const },
                        { label: 'Week 1 Gap', value: fmt(w1Gap) },
                        { label: 'Week 2 CCS', value: fmt(w2Ccs), type: 'credit' as const },
                        { label: 'Week 2 Preschool Funding', value: fmt(w2Kindy), type: 'credit' as const },
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
                  <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
                    <SelectField
                      label="Preschool Hours / Day"
                      hint={`${fnProgramWeeks} weeks/yr, ${kindyHoursPerWeek.toFixed(1)} hrs/wk`}
                      options={PRESCHOOL_OPTIONS}
                      value={fnPreschoolHours}
                      onChange={(e) => setFnPreschoolHours(e.target.value)}
                    />
                    <TimePicker
                      label="Preschool Start"
                      value={fnPreschoolStart}
                      onChange={setFnPreschoolStart}
                      min={7}
                      max={12}
                    />
                  </div>
                </div>

                <FortnightlyGrid
                  days={days}
                  onChange={setDays}
                  results={dayResults}
                  kindyToggle={{ label: 'Preschool' }}
                  fundingLabel="Preschool"
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
                  const fnAdjustedGap = Math.max(0, Math.round((fortnightlyResult.totalSessionFees - fnDebt.ccsPaidToService - fortnightlyResult.totalKindyFunding) * 100) / 100)

                  return (
                    <ResultCard
                      title="Fortnightly Total"
                      rows={[
                        { label: 'Total Session Fees', value: fmt(fortnightlyResult.totalSessionFees), type: 'debit' as const },
                        { label: 'Total CCS Entitlement', value: fmt(fortnightlyResult.totalCcsEntitlement), type: 'credit' as const },
                        { label: 'Total Preschool Funding', value: fmt(fortnightlyResult.totalKindyFunding), type: 'credit' as const },
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
