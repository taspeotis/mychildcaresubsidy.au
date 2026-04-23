import type { CareType } from '../calculators/ccsCalculator'
import type { NswAgeGroup, NswFeeReliefTier } from '../calculators/nsw'
import type { VicCohort } from '../calculators/vic'
import type { DayConfig } from '../components/FortnightlyGrid'

export type EstimateMode = 'daily' | 'weekly' | 'fortnightly'
export type EstimateScheme = 'ccs' | 'act' | 'nsw' | 'qld' | 'vic'

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

interface EstimateBase {
  id: string
  createdAt: number
  childName: string
  serviceName: string
  mode: EstimateMode
  shared: SharedSnapshot
}

export type Estimate =
  | (EstimateBase & { scheme: 'ccs'; local: CcsLocalSnapshot })
  | (EstimateBase & { scheme: 'act'; local: ActLocalSnapshot })
  | (EstimateBase & { scheme: 'nsw'; local: NswLocalSnapshot })
  | (EstimateBase & { scheme: 'qld'; local: QldLocalSnapshot })
  | (EstimateBase & { scheme: 'vic'; local: VicLocalSnapshot })

export type EstimateInput = Omit<Estimate, 'id' | 'createdAt'>

export interface EstimateResult {
  sessionFees: number
  ccsEntitlement: number
  stateFunding: number
  debtRecovery: number
  gap: number
}

export const SCHEME_META: Record<EstimateScheme, { label: string; fundingLabel: string }> = {
  ccs: { label: 'CCS', fundingLabel: '' },
  act: { label: 'ACT', fundingLabel: 'Preschool' },
  nsw: { label: 'NSW', fundingLabel: 'Start Strong' },
  qld: { label: 'QLD', fundingLabel: 'Free Kindy' },
  vic: { label: 'VIC', fundingLabel: 'Free Kinder' },
}
