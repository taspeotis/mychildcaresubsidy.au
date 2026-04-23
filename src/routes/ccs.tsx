import { useState, useMemo, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
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
import { AddEstimateFooter } from '../components/AddEstimateFooter'
import { calculateCcsDaily, calculateCcsFortnightly, getHourlyRateCap } from '../calculators/ccsCalculator'
import type { CareType } from '../calculators/ccsCalculator'
import { CCS_HOURLY_RATE_CAP, CCS_HOURLY_RATE_CAP_SCHOOL_AGE, FDC_HOURLY_RATE_CAP } from '../calculators/ccs'
import { DEFAULTS, fmt, computeDebtRecovery } from '../config'
import { useSharedCalculatorState } from '../context/SharedCalculatorState'
import { useEstimates } from '../estimates/EstimatesState'
import { formatEstimateLabel } from '../estimates/labels'
import type { EstimateInput, EstimateMode } from '../estimates/types'

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

    return calculateCcsFortnightly({
      ccsPercent: ccs,
      ccsWithholdingPercent: wh,
      fortnightlyCcsHours: ccsHours,
      careType,
      schoolAge: effectiveSchoolAge,
      sessions,
    })
  }, [shared.ccsPercent, shared.withholding, shared.ccsHours, careType, effectiveSchoolAge, weeklyDays])

  const weeklyDayResults: DayResult[] | null = weeklyResult
    ? weeklyResult.sessions.slice(0, 5).map((s) => ({
        ccsEntitlement: s.ccsEntitlement,
        kindyFunding: 0,
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

  // Plan integration
  const { estimates, editingId, editingEstimate, addEstimate, updateEstimate, cancelEditing } = useEstimates()
  const navigate = useNavigate()
  const hydratedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!editingId) { hydratedIdRef.current = null; return }
    const estimate = estimates.find((e) => e.id === editingId)
    if (!estimate) { cancelEditing(); return }
    if (estimate.scheme !== 'ccs') { cancelEditing(); return }
    if (hydratedIdRef.current === editingId) return
    shared.setCcsPercent(estimate.shared.ccsPercent)
    shared.setWithholding(estimate.shared.withholding)
    shared.setCcsHours(estimate.shared.ccsHours)
    shared.setSessionFee(estimate.shared.sessionFee)
    shared.setSessionStart(estimate.shared.sessionStart)
    shared.setSessionEnd(estimate.shared.sessionEnd)
    shared.setDaysPerWeek(estimate.shared.daysPerWeek)
    shared.setDebtRecovery(estimate.shared.debtRecovery)
    shared.setDebtRecoveryMode(estimate.shared.debtRecoveryMode)
    shared.setChildName(estimate.childName)
    shared.setServiceName(estimate.serviceName)
    setCareType(estimate.local.careType)
    setSchoolAge(estimate.local.schoolAge)
    setWeeklyDays(estimate.local.weeklyDays)
    setDays(estimate.local.days)
    setMode(estimate.mode)
    hydratedIdRef.current = editingId
  }, [editingId, estimates, cancelEditing, shared])

  const isEditing = editingEstimate?.scheme === 'ccs'
  const editingPosition = useMemo(() => {
    if (!isEditing || !editingEstimate) return 0
    return estimates.findIndex((e) => e.id === editingEstimate.id) + 1
  }, [estimates, editingEstimate, isEditing])
  const editingLabel = isEditing && editingEstimate ? formatEstimateLabel(editingEstimate, editingPosition) : ''

  const hasValidInput =
    mode === 'daily'
      ? Number(shared.sessionFee) > 0 && shared.sessionEnd > shared.sessionStart
      : mode === 'weekly'
        ? weeklyDays.some((d) => d.booked && Number(d.sessionFee) > 0)
        : days.some((d) => d.booked && Number(d.sessionFee) > 0)

  function handleSubmit() {
    const input: EstimateInput = {
      scheme: 'ccs',
      mode: mode as EstimateMode,
      shared: {
        ccsPercent: shared.ccsPercent,
        withholding: shared.withholding,
        ccsHours: shared.ccsHours,
        sessionFee: shared.sessionFee,
        sessionStart: shared.sessionStart,
        sessionEnd: shared.sessionEnd,
        daysPerWeek: shared.daysPerWeek,
        debtRecovery: shared.debtRecovery,
        debtRecoveryMode: shared.debtRecoveryMode,
      },
      local: { careType, schoolAge, weeklyDays, days },
      childName: shared.childName,
      serviceName: shared.serviceName,
    }
    if (isEditing && editingEstimate) {
      updateEstimate(editingEstimate.id, input)
      cancelEditing()
      navigate({ to: '/estimates' })
      return
    }
    addEstimate(input)
    shared.resetExceptHousehold()
    setCareType('centre-based')
    setSchoolAge(false)
    setWeeklyDays(createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: DEFAULTS.sessionStartHour, sessionEnd: DEFAULTS.sessionEndHour },
      undefined,
      1,
    ))
    setDays(createDefaultDays(
      { sessionFee: DEFAULTS.sessionFee, sessionStart: DEFAULTS.sessionStartHour, sessionEnd: DEFAULTS.sessionEndHour },
    ))
    navigate({ to: '/estimates' })
  }

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
            <StickyPanel className="rounded-2xl sidebar-gradient p-6 lg:p-8">
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
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'fortnightly', label: 'Fortnightly' },
                  ]}
                  value={mode}
                  onChange={setMode}
                  colorScheme="brand"
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
              colorScheme="brand"
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
                  colorScheme="brand"
                />

                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Care Type</h2>
                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="Type of Care"
                        options={CARE_TYPE_OPTIONS}
                        value={careType}
                        onChange={(e) => setCareType(e.target.value as CareType)}
                        colorScheme="brand"
                      />
                      <SelectField
                        label="Child's Age"
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
                  const daysPerWeek = Number(shared.daysPerWeek) || 1
                  const debt = computeDebtRecovery({
                    ccsEntitlement: net,
                    debtRecoveryRaw: shared.debtRecovery,
                    debtRecoveryMode: shared.debtRecoveryMode,
                    bookedDaysPerFortnight: daysPerWeek * 2,
                  })
                  const adjustedGap = Math.max(0, Math.round((fee - debt.ccsPaidToService) * 100) / 100)

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
                        ...(debt.debtPerDay > 0 ? [
                          { label: 'Debt Recovery', value: fmt(debt.debtPerDay), type: 'debit' as const },
                          { label: 'CCS Paid to Service', value: fmt(debt.ccsPaidToService), type: 'credit' as const },
                          ...(debt.recoveredElsewhere > 0 ? [{ label: 'Recovered Elsewhere', value: fmt(debt.recoveredElsewhere), muted: true }] : []),
                        ] : []),
                        { label: 'Your Estimated Gap', value: fmt(debt.debtPerDay > 0 ? adjustedGap : dailyResult.estimatedGapFee), highlight: true, detail: debt.debtPerDay > 0 ? `${fmt(fee)} – ${fmt(debt.ccsPaidToService)}` : `${fmt(fee)} – ${fmt(net)}` },
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
                  colorScheme="brand"
                />

                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Care Type</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <SelectField
                      label="Type of Care"
                      options={CARE_TYPE_OPTIONS}
                      value={careType}
                      onChange={(e) => setCareType(e.target.value as CareType)}
                      colorScheme="brand"
                    />
                    <SelectField
                      label="Child's Age"
                      options={CHILD_AGE_OPTIONS}
                      value={effectiveSchoolAge ? 'school' : 'below'}
                      onChange={(e) => setSchoolAge(e.target.value === 'school')}
                      disabled={careType === 'oshc'}
                      colorScheme="brand"
                    />
                  </div>
                </div>

                <FortnightlyGrid
                  days={weeklyDays}
                  onChange={setWeeklyDays}
                  results={weeklyDayResults}
                  fundingLabel="CCS"
                  fmt={fmt}
                  colorScheme="brand"
                  defaults={{ sessionFee: shared.sessionFee, sessionStart: shared.sessionStart, sessionEnd: shared.sessionEnd }}
                />

                {weeklyResult && (() => {
                  const w1 = weeklyResult.sessions.slice(0, 5)
                  const w2 = weeklyResult.sessions.slice(5, 10)
                  const w1Gap = w1.reduce((s, d) => s + d.gapFee, 0)
                  const w2Gap = w2.reduce((s, d) => s + d.gapFee, 0)
                  const w1Fees = weeklyDays.filter(d => d.booked).reduce((s, d) => s + (Number(d.sessionFee) || 0), 0)
                  const w1Ccs = w1.reduce((s, d) => s + d.ccsEntitlement, 0)
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
                      ? Math.max(0, Math.round((w1Fees - wkCcsPaidPerWeek) * 100) / 100)
                      : w1Gap

                    return (
                      <ResultCard
                        colorScheme="brand"
                        title="Weekly Cost Estimate"
                        rows={[
                          { label: 'Session Fees', value: fmt(w1Fees), type: 'debit' as const },
                          { label: 'CCS Entitlement', value: fmt(w1Ccs), type: 'credit' as const },
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
                  const fnAdjustedGap = wkDebt.debtPerDay > 0
                    ? Math.max(0, Math.round((weeklyResult.totalSessionFees - wkDebt.ccsPaidToService) * 100) / 100)
                    : weeklyResult.totalGapFee

                  return (
                    <ResultCard
                      colorScheme="brand"
                      title="Weekly Cost Estimate"
                      rows={[
                        { label: 'Weekly Session Fees', value: fmt(w1Fees), type: 'debit' as const },
                        { label: 'Week 1 CCS', value: fmt(w1Ccs), type: 'credit' as const },
                        { label: 'Week 1 Gap', value: fmt(w1Gap) },
                        { label: 'Week 2 CCS', value: fmt(w2Ccs), type: 'credit' as const },
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
                  colorScheme="brand"
                />

                <div className="rounded-2xl card-glass p-8">
                  <h2 className="text-lg font-bold text-slate-900">Fortnightly Settings</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <SelectField
                      label="Type of Care"
                      options={CARE_TYPE_OPTIONS}
                      value={careType}
                      onChange={(e) => setCareType(e.target.value as CareType)}
                      colorScheme="brand"
                    />
                    <SelectField
                      label="Child's Age"
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
                  defaults={{ sessionFee: shared.sessionFee, sessionStart: shared.sessionStart, sessionEnd: shared.sessionEnd }}
                />

                {fortnightlyResult && (() => {
                  const fnDebt = computeDebtRecovery({
                    ccsEntitlement: fortnightlyResult.totalCcsEntitlement,
                    debtRecoveryRaw: shared.debtRecovery,
                    debtRecoveryMode: shared.debtRecoveryMode,
                    bookedDaysPerFortnight: days.filter(d => d.booked).length,
                  })
                  const fnAdjustedGap = Math.max(0, Math.round((fortnightlyResult.totalSessionFees - fnDebt.ccsPaidToService) * 100) / 100)

                  return (
                    <ResultCard
                      colorScheme="brand"
                      title="Fortnightly Total"
                      rows={[
                        { label: 'Total Session Fees', value: fmt(fortnightlyResult.totalSessionFees), type: 'debit' as const },
                        { label: 'Total CCS Entitlement', value: fmt(fortnightlyResult.totalCcsEntitlement), type: 'credit' as const },
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

            <AddEstimateFooter
              colorScheme="brand"
              onSubmit={handleSubmit}
              onCancel={isEditing ? () => { cancelEditing(); navigate({ to: "/estimates" }) } : undefined}
              isEditing={isEditing}
              editingLabel={editingLabel}
              disabled={!hasValidInput}
              hasEntries={estimates.length > 0}
            />
          </div>
        </div>
      </Container>
    </>
  )
}
