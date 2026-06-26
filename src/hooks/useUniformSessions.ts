import { useState, type Dispatch, type SetStateAction } from 'react'
import type { DayConfig } from '../components/FortnightlyGrid'

interface SessionSharedState {
  sessionFee: string
  setSessionFee: (v: string) => void
  sessionStart: number
  setSessionStart: (v: number) => void
  sessionEnd: number
  setSessionEnd: (v: number) => void
}

type DaySetter = Dispatch<SetStateAction<DayConfig[]>>

/** True if every booked day shares the same fee and times (so "Apply to All Days" fits). */
export function daysAreUniform(arr: DayConfig[]): boolean {
  const booked = arr.filter((d) => d.booked)
  if (booked.length <= 1) return true
  const first = booked[0]
  return booked.every(
    (d) => d.sessionFee === first.sessionFee && d.sessionStart === first.sessionStart && d.sessionEnd === first.sessionEnd,
  )
}

/**
 * Drives the "Apply to All Days" behaviour shared by every fortnightly calculator.
 *
 * When `applyToAll` is on, editing the Session Details card writes the fee/times
 * into every day (so the result updates without touching each day individually).
 * The day grids stay the source of truth, so saved estimates remain correct.
 *
 * Pass the route's day-array setters (weekly first, then fortnightly). Returns
 * session setters to wire into `SessionDetailsCard` in place of the shared ones.
 */
export function useUniformSessions(shared: SessionSharedState, ...daySetters: DaySetter[]) {
  const [applyToAll, setApplyToAll] = useState(true)

  // Writes the patch into every day, including unbooked ones. Harmless: unbooked
  // fees never feed the calc, and toggleDay re-seeds a day's fee/times on booking.
  function broadcast(patch: Partial<DayConfig>) {
    for (const set of daySetters) set((days) => days.map((d) => ({ ...d, ...patch })))
  }

  function setSessionFee(v: string) {
    shared.setSessionFee(v)
    if (applyToAll) broadcast({ sessionFee: v })
  }
  function setSessionStart(v: number) {
    shared.setSessionStart(v)
    if (applyToAll) broadcast({ sessionStart: v })
  }
  function setSessionEnd(v: number) {
    shared.setSessionEnd(v)
    if (applyToAll) broadcast({ sessionEnd: v })
  }
  function onApplyToAllChange(v: boolean) {
    setApplyToAll(v)
    if (v) broadcast({ sessionFee: shared.sessionFee, sessionStart: shared.sessionStart, sessionEnd: shared.sessionEnd })
  }

  return { applyToAll, setApplyToAll, setSessionFee, setSessionStart, setSessionEnd, onApplyToAllChange }
}
