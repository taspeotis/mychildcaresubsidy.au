import { calculateCcsDaily, calculateCcsFortnightly } from '../calculators/ccsCalculator'
import { calculateActDaily, calculateActFortnightly } from '../calculators/act'
import { calculateNswDaily, calculateNswFortnightlySessions } from '../calculators/nsw'
import { calculateQldDaily, calculateQldFortnightly } from '../calculators/qld'
import { calculateVicDaily, calculateVicFortnightlySessions } from '../calculators/vic'
import { computeDebtRecovery, WEEKDAYS } from '../config'
import type { DayConfig } from '../components/FortnightlyGrid'
import type { FortnightlySession } from '../types'
import type { Estimate, EstimateResult, SharedSnapshot } from './types'

const num = (s: string) => Number(s) || 0

function simpleSessions(days: DayConfig[]) {
  return days.map((d) => ({
    booked: d.booked,
    sessionFee: d.booked ? (Number(d.sessionFee) || 0) : 0,
    sessionStartHour: d.booked ? d.sessionStart : 0,
    sessionEndHour: d.booked ? d.sessionEnd : 0,
  }))
}

function programSessions(days: DayConfig[], programStart: number, programHours: number): FortnightlySession[] {
  return days.map((d, i) => {
    const week = (i < 5 ? 1 : 2) as 1 | 2
    const day = WEEKDAYS[i % 5]
    const fee = d.booked ? (Number(d.sessionFee) || 0) : 0
    const start = d.booked ? d.sessionStart : 0
    const end = d.booked ? d.sessionEnd : 0
    const hasProgram = d.booked && d.hasKindy
    const ps = hasProgram ? programStart : null
    const pe = hasProgram ? programStart + programHours : null
    return { week, day, sessionFee: fee, sessionStartHour: start, sessionEndHour: end, kindyProgramStartHour: ps, kindyProgramEndHour: pe }
  })
}

function fortnightFromWeekly(weeklyDays: DayConfig[]): DayConfig[] {
  return [...weeklyDays, ...weeklyDays]
}

function daysForMode<T extends { weeklyDays: DayConfig[]; days: DayConfig[] }>(local: T, mode: 'daily' | 'weekly' | 'fortnightly'): DayConfig[] {
  if (mode === 'fortnightly') return local.days
  return fortnightFromWeekly(local.weeklyDays)
}

function bookedCount(days: DayConfig[]): number {
  return days.reduce((n, d) => (d.booked && num(d.sessionFee) > 0 ? n + 1 : n), 0)
}

function applyDailyDebt(shared: SharedSnapshot, ccsEntitlement: number, stateFunding: number, sessionFee: number) {
  const daysPerWeek = num(shared.daysPerWeek) || 1
  const debt = computeDebtRecovery({
    ccsEntitlement,
    debtRecoveryRaw: shared.debtRecovery,
    debtRecoveryMode: shared.debtRecoveryMode,
    bookedDaysPerFortnight: daysPerWeek * 2,
  })
  const gap = Math.max(0, Math.round((sessionFee - debt.ccsPaidToService - stateFunding) * 100) / 100)
  return { debtPerDay: debt.debtPerDay, gap }
}

function applyFortnightDebt(shared: SharedSnapshot, ccsEntitlement: number, stateFunding: number, totalFees: number, fortnightBookedDays: number) {
  const debt = computeDebtRecovery({
    ccsEntitlement,
    debtRecoveryRaw: shared.debtRecovery,
    debtRecoveryMode: shared.debtRecoveryMode,
    bookedDaysPerFortnight: fortnightBookedDays,
  })
  const gap = Math.max(0, Math.round((totalFees - debt.ccsPaidToService - stateFunding) * 100) / 100)
  return { debtPerDay: debt.debtPerDay, gap }
}

export function calculateEstimate(estimate: Estimate): EstimateResult | null {
  const { shared, mode } = estimate
  const ccs = num(shared.ccsPercent)
  const wh = num(shared.withholding)
  const ccsHours = num(shared.ccsHours) || 72

  if (mode === 'daily') {
    const fee = num(shared.sessionFee)
    if (fee <= 0 || shared.sessionEnd <= shared.sessionStart) return null

    switch (estimate.scheme) {
      case 'ccs': {
        const r = calculateCcsDaily({
          ccsPercent: ccs,
          ccsWithholdingPercent: wh,
          sessionFee: fee,
          sessionStartHour: shared.sessionStart,
          sessionEndHour: shared.sessionEnd,
          careType: estimate.local.careType,
          schoolAge: estimate.local.careType === 'oshc' ? true : estimate.local.schoolAge,
        })
        if (!r) return null
        const debt = applyDailyDebt(shared, r.ccsEntitlement, 0, fee)
        return { sessionFees: fee, ccsEntitlement: r.ccsEntitlement, stateFunding: 0, debtRecovery: debt.debtPerDay, gap: debt.gap }
      }
      case 'act': {
        const r = calculateActDaily({
          ccsPercent: ccs,
          ccsWithholdingPercent: wh,
          sessionFee: fee,
          sessionStartHour: shared.sessionStart,
          sessionEndHour: shared.sessionEnd,
          kindyProgramHours: num(estimate.local.preschoolHours),
        })
        const debt = applyDailyDebt(shared, r.ccsEntitlement, r.kindyFundingAmount, fee)
        return { sessionFees: fee, ccsEntitlement: r.ccsEntitlement, stateFunding: r.kindyFundingAmount, debtRecovery: debt.debtPerDay, gap: debt.gap }
      }
      case 'nsw': {
        const weeks = num(estimate.local.serviceWeeks) || 50
        const dpw = num(shared.daysPerWeek) || 3
        const r = calculateNswDaily({
          ccsPercent: ccs,
          ccsWithholdingPercent: wh,
          sessionFee: fee,
          sessionStartHour: shared.sessionStart,
          sessionEndHour: shared.sessionEnd,
          ageGroup: estimate.local.ageGroup,
          feeReliefTier: estimate.local.feeReliefTier,
          serviceWeeks: weeks,
          daysPerWeek: dpw,
        })
        const debt = applyDailyDebt(shared, r.ccsEntitlement, r.dailyFeeRelief, fee)
        return { sessionFees: fee, ccsEntitlement: r.ccsEntitlement, stateFunding: r.dailyFeeRelief, debtRecovery: debt.debtPerDay, gap: debt.gap }
      }
      case 'qld': {
        const r = calculateQldDaily({
          ccsPercent: ccs,
          ccsWithholdingPercent: wh,
          sessionFee: fee,
          sessionStartHour: shared.sessionStart,
          sessionEndHour: shared.sessionEnd,
          kindyProgramHours: num(estimate.local.kindyHours),
        })
        const debt = applyDailyDebt(shared, r.ccsEntitlement, r.kindyFundingAmount, fee)
        return { sessionFees: fee, ccsEntitlement: r.ccsEntitlement, stateFunding: r.kindyFundingAmount, debtRecovery: debt.debtPerDay, gap: debt.gap }
      }
      case 'vic': {
        const dpw = num(shared.daysPerWeek) || 3
        const khrs = estimate.local.kinderHours === '15-3yo' ? 15 : num(estimate.local.kinderHours) || 15
        const r = calculateVicDaily({
          ccsPercent: ccs,
          ccsWithholdingPercent: wh,
          sessionFee: fee,
          sessionStartHour: shared.sessionStart,
          sessionEndHour: shared.sessionEnd,
          cohort: estimate.local.cohort,
          kinderHoursPerWeek: khrs,
          daysPerWeek: dpw,
        })
        const debt = applyDailyDebt(shared, r.ccsEntitlement, r.dailyOffset, fee)
        return { sessionFees: fee, ccsEntitlement: r.ccsEntitlement, stateFunding: r.dailyOffset, debtRecovery: debt.debtPerDay, gap: debt.gap }
      }
    }
  }

  // weekly or fortnightly: always calculate a full fortnight
  switch (estimate.scheme) {
    case 'ccs': {
      const days = daysForMode(estimate.local, mode)
      const sessions = simpleSessions(days)
      if (!sessions.some((s) => s.booked && s.sessionFee > 0)) return null
      const r = calculateCcsFortnightly({
        ccsPercent: ccs,
        ccsWithholdingPercent: wh,
        fortnightlyCcsHours: ccsHours,
        careType: estimate.local.careType,
        schoolAge: estimate.local.careType === 'oshc' ? true : estimate.local.schoolAge,
        sessions,
      })
      if (!r) return null
      const booked = sessions.filter((s) => s.booked && s.sessionFee > 0).length
      const debt = applyFortnightDebt(shared, r.totalCcsEntitlement, 0, r.totalSessionFees, booked)
      return { sessionFees: r.totalSessionFees, ccsEntitlement: r.totalCcsEntitlement, stateFunding: 0, debtRecovery: debt.debtPerDay, gap: debt.gap }
    }
    case 'act': {
      const days = daysForMode(estimate.local, mode)
      const ph = num(estimate.local.fnPreschoolHours) || 6
      const sessions = programSessions(days, estimate.local.fnPreschoolStart, ph)
      if (!days.some((d) => d.booked && num(d.sessionFee) > 0)) return null
      const programWeeks = Math.round(300 / ph)
      const r = calculateActFortnightly(
        { ccsPercent: ccs, ccsWithholdingPercent: wh, fortnightlyCcsHours: ccsHours, sessions },
        programWeeks,
      )
      const debt = applyFortnightDebt(shared, r.totalCcsEntitlement, r.totalKindyFunding, r.totalSessionFees, bookedCount(days))
      return { sessionFees: r.totalSessionFees, ccsEntitlement: r.totalCcsEntitlement, stateFunding: r.totalKindyFunding, debtRecovery: debt.debtPerDay, gap: debt.gap }
    }
    case 'nsw': {
      const days = daysForMode(estimate.local, mode)
      const sessions = simpleSessions(days)
      const weeks = num(estimate.local.serviceWeeks) || 50
      if (!sessions.some((s) => s.booked && s.sessionFee > 0)) return null
      const r = calculateNswFortnightlySessions({
        ccsPercent: ccs,
        ccsWithholdingPercent: wh,
        fortnightlyCcsHours: ccsHours,
        ageGroup: estimate.local.ageGroup,
        feeReliefTier: estimate.local.feeReliefTier,
        serviceWeeks: weeks,
        sessions,
      })
      if (!r) return null
      const debt = applyFortnightDebt(shared, r.totalCcsEntitlement, r.totalFeeRelief, r.totalSessionFees, bookedCount(days))
      return { sessionFees: r.totalSessionFees, ccsEntitlement: r.totalCcsEntitlement, stateFunding: r.totalFeeRelief, debtRecovery: debt.debtPerDay, gap: debt.gap }
    }
    case 'qld': {
      const days = daysForMode(estimate.local, mode)
      const kh = num(estimate.local.fnKindyHours) || 7.5
      const sessions = programSessions(days, estimate.local.fnKindyStart, kh)
      if (!days.some((d) => d.booked && num(d.sessionFee) > 0)) return null
      const r = calculateQldFortnightly({ ccsPercent: ccs, ccsWithholdingPercent: wh, fortnightlyCcsHours: ccsHours, sessions })
      const debt = applyFortnightDebt(shared, r.totalCcsEntitlement, r.totalKindyFunding, r.totalSessionFees, bookedCount(days))
      return { sessionFees: r.totalSessionFees, ccsEntitlement: r.totalCcsEntitlement, stateFunding: r.totalKindyFunding, debtRecovery: debt.debtPerDay, gap: debt.gap }
    }
    case 'vic': {
      const days = daysForMode(estimate.local, mode)
      const sessions = simpleSessions(days)
      const khrs = estimate.local.kinderHours === '15-3yo' ? 15 : num(estimate.local.kinderHours) || 15
      if (!sessions.some((s) => s.booked && s.sessionFee > 0)) return null
      const r = calculateVicFortnightlySessions({
        ccsPercent: ccs,
        ccsWithholdingPercent: wh,
        fortnightlyCcsHours: ccsHours,
        cohort: estimate.local.cohort,
        kinderHoursPerWeek: khrs,
        sessions,
      })
      if (!r) return null
      const debt = applyFortnightDebt(shared, r.totalCcsEntitlement, r.totalFreeKinder, r.totalSessionFees, bookedCount(days))
      return { sessionFees: r.totalSessionFees, ccsEntitlement: r.totalCcsEntitlement, stateFunding: r.totalFreeKinder, debtRecovery: debt.debtPerDay, gap: debt.gap }
    }
  }
}
