import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { EstimatesProvider, useEstimates, __TEST__ } from './EstimatesState'
import type { EstimateInput } from './types'

const { STORAGE_KEY, SCHEMA_VERSION } = __TEST__

function wrapper({ children }: { children: React.ReactNode }) {
  return <EstimatesProvider>{children}</EstimatesProvider>
}

function sampleInput(overrides: Partial<EstimateInput> = {}): EstimateInput {
  return {
    scheme: 'ccs',
    mode: 'fortnightly',
    childName: '',
    serviceName: '',
    shared: {
      ccsPercent: '85.00',
      withholding: '5',
      ccsHours: '72',
      sessionFee: '150.00',
      sessionStart: 6,
      sessionEnd: 18,
      daysPerWeek: '3',
      debtRecovery: '0.00',
      debtRecoveryMode: 'percent',
    },
    local: {
      careType: 'centre-based',
      schoolAge: false,
      weeklyDays: [],
      days: [],
    },
    ...overrides,
  } as EstimateInput
}

describe('EstimatesState', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with no estimates', () => {
    const { result } = renderHook(() => useEstimates(), { wrapper })
    expect(result.current.estimates).toEqual([])
    expect(result.current.editingId).toBeNull()
  })

  it('addEstimate appends an estimate with generated id and createdAt', () => {
    const { result } = renderHook(() => useEstimates(), { wrapper })
    act(() => {
      result.current.addEstimate(sampleInput({ childName: 'Olivia' }))
    })
    expect(result.current.estimates).toHaveLength(1)
    expect(result.current.estimates[0].id).toBeTruthy()
    expect(result.current.estimates[0].createdAt).toBeGreaterThan(0)
    expect(result.current.estimates[0].childName).toBe('Olivia')
  })

  it('updateEstimate replaces the estimate content but preserves id and createdAt', () => {
    const { result } = renderHook(() => useEstimates(), { wrapper })
    let id: string = ''
    let originalCreatedAt = 0
    act(() => {
      const estimate = result.current.addEstimate(sampleInput({ childName: 'Olivia' }))
      id = estimate.id
      originalCreatedAt = estimate.createdAt
    })
    act(() => {
      result.current.updateEstimate(id, sampleInput({ childName: 'Oliver' }))
    })
    expect(result.current.estimates).toHaveLength(1)
    expect(result.current.estimates[0].id).toBe(id)
    expect(result.current.estimates[0].createdAt).toBe(originalCreatedAt)
    expect(result.current.estimates[0].childName).toBe('Oliver')
  })

  it('deleteEstimate removes the estimate and clears editingId if matching', () => {
    const { result } = renderHook(() => useEstimates(), { wrapper })
    let id: string = ''
    act(() => {
      const estimate = result.current.addEstimate(sampleInput())
      id = estimate.id
      result.current.startEditing(id)
    })
    expect(result.current.editingId).toBe(id)
    act(() => {
      result.current.deleteEstimate(id)
    })
    expect(result.current.estimates).toHaveLength(0)
    expect(result.current.editingId).toBeNull()
  })

  it('clearAll empties estimates and cancels editing', () => {
    const { result } = renderHook(() => useEstimates(), { wrapper })
    act(() => {
      result.current.addEstimate(sampleInput())
      result.current.addEstimate(sampleInput())
    })
    act(() => {
      result.current.startEditing(result.current.estimates[0].id)
      result.current.clearAll()
    })
    expect(result.current.estimates).toEqual([])
    expect(result.current.editingId).toBeNull()
  })

  it('persists estimates to localStorage with correct version', () => {
    const { result } = renderHook(() => useEstimates(), { wrapper })
    act(() => {
      result.current.addEstimate(sampleInput({ childName: 'Olivia' }))
    })
    const raw = window.localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.version).toBe(SCHEMA_VERSION)
    expect(parsed.estimates).toHaveLength(1)
    expect(parsed.estimates[0].childName).toBe('Olivia')
  })

  it('loads estimates from localStorage on mount when version matches', () => {
    const existing = { ...sampleInput({ childName: 'Loaded' }), id: 'seed-1', createdAt: 1000 }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, estimates: [existing] }),
    )
    const { result } = renderHook(() => useEstimates(), { wrapper })
    expect(result.current.estimates).toHaveLength(1)
    expect(result.current.estimates[0].id).toBe('seed-1')
    expect(result.current.estimates[0].childName).toBe('Loaded')
  })

  it('silently discards estimates when localStorage version mismatches', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, estimates: [{ id: 'x', childName: 'stale' }] }),
    )
    const { result } = renderHook(() => useEstimates(), { wrapper })
    expect(result.current.estimates).toEqual([])
  })

  it('silently discards estimates when localStorage contains invalid JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not valid json {{{')
    const { result } = renderHook(() => useEstimates(), { wrapper })
    expect(result.current.estimates).toEqual([])
  })

  it('cancelEditing clears editingId without touching estimates', () => {
    const { result } = renderHook(() => useEstimates(), { wrapper })
    act(() => {
      const e = result.current.addEstimate(sampleInput())
      result.current.startEditing(e.id)
    })
    expect(result.current.editingId).toBeTruthy()
    act(() => {
      result.current.cancelEditing()
    })
    expect(result.current.editingId).toBeNull()
    expect(result.current.estimates).toHaveLength(1)
  })

  it('editingEstimate returns the estimate matching editingId', () => {
    const { result } = renderHook(() => useEstimates(), { wrapper })
    let id = ''
    act(() => {
      const e = result.current.addEstimate(sampleInput({ childName: 'Target' }))
      id = e.id
      result.current.startEditing(id)
    })
    expect(result.current.editingEstimate?.id).toBe(id)
    expect(result.current.editingEstimate?.childName).toBe('Target')
  })
})
