import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { DEFAULTS } from '../config'

interface SharedCalculatorState {
  ccsPercent: string
  setCcsPercent: (v: string) => void
  withholding: string
  setWithholding: (v: string) => void
  ccsHours: string
  setCcsHours: (v: string) => void
  sessionFee: string
  setSessionFee: (v: string) => void
  sessionStart: number
  setSessionStart: (v: number) => void
  sessionEnd: number
  setSessionEnd: (v: number) => void
  daysPerWeek: string
  setDaysPerWeek: (v: string) => void
  debtRecovery: string
  setDebtRecovery: (v: string) => void
  debtRecoveryMode: 'percent' | 'amount'
  setDebtRecoveryMode: (v: 'percent' | 'amount') => void
  childName: string
  setChildName: (v: string) => void
  serviceName: string
  setServiceName: (v: string) => void
  /** Resets session + days + child name to defaults. Preserves household fields (CCS %, withholding, debt) and service name. */
  resetExceptHousehold: () => void
}

const SharedCalcContext = createContext<SharedCalculatorState | null>(null)

const DEFAULT_DAYS_PER_WEEK = '3'
const DEFAULT_DEBT_RECOVERY = '0.00'
const DEFAULT_DEBT_RECOVERY_MODE: 'percent' | 'amount' = 'percent'

export function SharedCalculatorProvider({ children }: { children: ReactNode }) {
  const [ccsPercent, setCcsPercent] = useState(DEFAULTS.ccsPercent)
  const [withholding, setWithholding] = useState(DEFAULTS.ccsWithholding)
  const [ccsHours, setCcsHours] = useState(DEFAULTS.ccsHoursPerFortnight)
  const [sessionFee, setSessionFee] = useState(DEFAULTS.sessionFee)
  const [sessionStart, setSessionStart] = useState(DEFAULTS.sessionStartHour)
  const [sessionEnd, setSessionEnd] = useState(DEFAULTS.sessionEndHour)
  const [daysPerWeek, setDaysPerWeek] = useState(DEFAULT_DAYS_PER_WEEK)
  const [debtRecovery, setDebtRecovery] = useState(DEFAULT_DEBT_RECOVERY)
  const [debtRecoveryMode, setDebtRecoveryMode] = useState<'percent' | 'amount'>(DEFAULT_DEBT_RECOVERY_MODE)
  const [childName, setChildName] = useState('')
  const [serviceName, setServiceName] = useState('')

  const resetExceptHousehold = useCallback(() => {
    setCcsHours(DEFAULTS.ccsHoursPerFortnight)
    setSessionFee(DEFAULTS.sessionFee)
    setSessionStart(DEFAULTS.sessionStartHour)
    setSessionEnd(DEFAULTS.sessionEndHour)
    setDaysPerWeek(DEFAULT_DAYS_PER_WEEK)
    setChildName('')
    // ccsPercent, withholding, debtRecovery, debtRecoveryMode, serviceName intentionally preserved
  }, [])

  return (
    <SharedCalcContext.Provider value={{
      ccsPercent, setCcsPercent,
      withholding, setWithholding,
      ccsHours, setCcsHours,
      sessionFee, setSessionFee,
      sessionStart, setSessionStart,
      sessionEnd, setSessionEnd,
      daysPerWeek, setDaysPerWeek,
      debtRecovery, setDebtRecovery,
      debtRecoveryMode, setDebtRecoveryMode,
      childName, setChildName,
      serviceName, setServiceName,
      resetExceptHousehold,
    }}>
      {children}
    </SharedCalcContext.Provider>
  )
}

export function useSharedCalculatorState() {
  const ctx = useContext(SharedCalcContext)
  if (!ctx) throw new Error('useSharedCalculatorState must be used within SharedCalculatorProvider')
  return ctx
}
