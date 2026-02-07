import { createContext, useContext, useState, type ReactNode } from 'react'
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
}

const SharedCalcContext = createContext<SharedCalculatorState | null>(null)

export function SharedCalculatorProvider({ children }: { children: ReactNode }) {
  const [ccsPercent, setCcsPercent] = useState(DEFAULTS.ccsPercent)
  const [withholding, setWithholding] = useState(DEFAULTS.ccsWithholding)
  const [ccsHours, setCcsHours] = useState(DEFAULTS.ccsHoursPerFortnight)
  const [sessionFee, setSessionFee] = useState(DEFAULTS.sessionFee)
  const [sessionStart, setSessionStart] = useState(DEFAULTS.sessionStartHour)
  const [sessionEnd, setSessionEnd] = useState(DEFAULTS.sessionEndHour)
  const [daysPerWeek, setDaysPerWeek] = useState('3')

  return (
    <SharedCalcContext.Provider value={{
      ccsPercent, setCcsPercent,
      withholding, setWithholding,
      ccsHours, setCcsHours,
      sessionFee, setSessionFee,
      sessionStart, setSessionStart,
      sessionEnd, setSessionEnd,
      daysPerWeek, setDaysPerWeek,
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
