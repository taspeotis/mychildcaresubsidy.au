export type ColorScheme = 'accent' | 'brand'

export interface DailyInputs {
  ccsPercent: number
  ccsWithholdingPercent: number
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
  kindyProgramHours: number
}

export interface DailyResult {
  sessionHoursDecimal: number
  hourlySessionFee: number
  applicableCcsHourlyRate: number
  applicableCcsHours: number
  ccsAmount: number
  ccsWithholding: number
  ccsEntitlement: number
  gapBeforeKindy: number
  kindyFundingAmount: number
  estimatedGapFee: number
  kindyCcsCoveredHours?: number
  kindyNonCcsCoveredHours?: number
  kindyCcsPerHour?: number
}

export interface FortnightlySession {
  week: 1 | 2
  day: string
  sessionFee: number
  sessionStartHour: number
  sessionEndHour: number
  kindyProgramStartHour: number | null
  kindyProgramEndHour: number | null
}

export interface FortnightlyInputs {
  ccsPercent: number
  ccsWithholdingPercent: number
  fortnightlyCcsHours: number
  sessions: FortnightlySession[]
}

export interface FortnightlySessionResult extends DailyResult {
  week: 1 | 2
  day: string
  remainingCcsHours: number
  remainingKindyHours: number
}

export interface FortnightlyResult {
  sessions: FortnightlySessionResult[]
  totalSessionFees: number
  totalCcsEntitlement: number
  totalKindyFunding: number
  totalGapFee: number
}
