import type { CareType } from '../calculators/ccsCalculator'
import type { NswAgeGroup, NswFeeReliefTier } from '../calculators/nsw'
import type { VicCohort } from '../calculators/vic'
import type { DayConfig } from '../components/FortnightlyGrid'

export type PlanMode = 'daily' | 'weekly' | 'fortnightly'
export type PlanScheme = 'ccs' | 'act' | 'nsw' | 'qld' | 'vic'

export interface SharedSnapshot {
  ccsPercent: string
  withholding: string
  ccsHours: string
  sessionFee: string
  sessionStart: number
  sessionEnd: number
  daysPerWeek: string
  debtRecovery: string
  debtRecoveryMode: 'percent' | 'amount'
}

export interface CcsLocalSnapshot {
  careType: CareType
  schoolAge: boolean
  weeklyDays: DayConfig[]
  days: DayConfig[]
}

export interface ActLocalSnapshot {
  preschoolHours: string
  preschoolStart: number
  fnPreschoolHours: string
  fnPreschoolStart: number
  weeklyDays: DayConfig[]
  days: DayConfig[]
}

export interface NswLocalSnapshot {
  ageGroup: NswAgeGroup
  feeReliefTier: NswFeeReliefTier
  serviceWeeks: string
  weeklyDays: DayConfig[]
  days: DayConfig[]
}

export interface QldLocalSnapshot {
  kindyHours: string
  kindyStart: number
  fnKindyHours: string
  fnKindyStart: number
  weeklyDays: DayConfig[]
  days: DayConfig[]
}

export interface VicLocalSnapshot {
  kinderHours: string
  cohort: VicCohort
  weeklyDays: DayConfig[]
  days: DayConfig[]
}

interface PlanEntryBase {
  id: string
  createdAt: number
  childName: string
  serviceName: string
  mode: PlanMode
  shared: SharedSnapshot
}

export type PlanEntry =
  | (PlanEntryBase & { scheme: 'ccs'; local: CcsLocalSnapshot })
  | (PlanEntryBase & { scheme: 'act'; local: ActLocalSnapshot })
  | (PlanEntryBase & { scheme: 'nsw'; local: NswLocalSnapshot })
  | (PlanEntryBase & { scheme: 'qld'; local: QldLocalSnapshot })
  | (PlanEntryBase & { scheme: 'vic'; local: VicLocalSnapshot })

export type PlanEntryInput = Omit<PlanEntry, 'id' | 'createdAt'>

export interface PlanEntryResult {
  sessionFees: number
  ccsEntitlement: number
  stateFunding: number
  debtRecovery: number
  gap: number
}

export const SCHEME_META: Record<PlanScheme, { label: string; fundingLabel: string }> = {
  ccs: { label: 'CCS', fundingLabel: '' },
  act: { label: 'ACT', fundingLabel: 'Preschool' },
  nsw: { label: 'NSW', fundingLabel: 'Start Strong' },
  qld: { label: 'QLD', fundingLabel: 'Free Kindy' },
  vic: { label: 'VIC', fundingLabel: 'Free Kinder' },
}
