import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUniformSessions, daysAreUniform } from './useUniformSessions'
import type { DayConfig } from '../components/FortnightlyGrid'

function day(overrides: Partial<DayConfig> = {}): DayConfig {
  return { booked: true, sessionFee: '150.00', sessionStart: 6, sessionEnd: 18, hasKindy: false, ...overrides }
}

describe('daysAreUniform', () => {
  it('treats zero or one booked day as uniform', () => {
    expect(daysAreUniform([])).toBe(true)
    expect(daysAreUniform([day({ booked: false })])).toBe(true)
    expect(daysAreUniform([day()])).toBe(true)
  })

  it('is true when all booked days share fee and times', () => {
    expect(daysAreUniform([day(), day(), day({ booked: false, sessionFee: '999' })])).toBe(true)
  })

  it('is false when a booked day differs in fee or times', () => {
    expect(daysAreUniform([day(), day({ sessionFee: '200.00' })])).toBe(false)
    expect(daysAreUniform([day(), day({ sessionStart: 8 })])).toBe(false)
    expect(daysAreUniform([day(), day({ sessionEnd: 16 })])).toBe(false)
  })
})

describe('useUniformSessions', () => {
  function setup() {
    let days = [day(), day(), day({ booked: false })]
    const setDays = vi.fn((updater: DayConfig[] | ((d: DayConfig[]) => DayConfig[])) => {
      days = typeof updater === 'function' ? updater(days) : updater
    })
    const shared = {
      sessionFee: '150.00', setSessionFee: vi.fn(),
      sessionStart: 6, setSessionStart: vi.fn(),
      sessionEnd: 18, setSessionEnd: vi.fn(),
    }
    const view = renderHook(() => useUniformSessions(shared, setDays))
    return { view, setDays, shared, getDays: () => days }
  }

  it('defaults applyToAll to on', () => {
    const { view } = setup()
    expect(view.result.current.applyToAll).toBe(true)
  })

  it('broadcasts fee/times to every day while on', () => {
    const { view, shared, getDays } = setup()
    act(() => view.result.current.setSessionFee('200.00'))
    act(() => view.result.current.setSessionStart(9))
    expect(shared.setSessionFee).toHaveBeenCalledWith('200.00')
    expect(getDays().every((d) => d.sessionFee === '200.00')).toBe(true)
    expect(getDays().every((d) => d.sessionStart === 9)).toBe(true)
  })

  it('stops broadcasting once turned off', () => {
    const { view, shared, getDays } = setup()
    act(() => view.result.current.onApplyToAllChange(false))
    act(() => view.result.current.setSessionFee('300.00'))
    expect(shared.setSessionFee).toHaveBeenCalledWith('300.00')
    expect(getDays().some((d) => d.sessionFee === '300.00')).toBe(false)
  })

  it('syncs all days to the current shared values when turned back on', () => {
    const { view, getDays } = setup()
    act(() => view.result.current.onApplyToAllChange(false))
    act(() => view.result.current.onApplyToAllChange(true))
    expect(getDays().every((d) => d.sessionFee === '150.00' && d.sessionStart === 6 && d.sessionEnd === 18)).toBe(true)
  })
})
