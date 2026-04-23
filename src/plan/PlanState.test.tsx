import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { PlanProvider, usePlan, __TEST__ } from './PlanState'
import type { PlanEntryInput } from './types'

const { STORAGE_KEY, SCHEMA_VERSION } = __TEST__

function wrapper({ children }: { children: React.ReactNode }) {
  return <PlanProvider>{children}</PlanProvider>
}

function sampleInput(overrides: Partial<PlanEntryInput> = {}): PlanEntryInput {
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
  } as PlanEntryInput
}

describe('PlanState', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with no entries', () => {
    const { result } = renderHook(() => usePlan(), { wrapper })
    expect(result.current.entries).toEqual([])
    expect(result.current.editingId).toBeNull()
  })

  it('addEntry appends an entry with generated id and createdAt', () => {
    const { result } = renderHook(() => usePlan(), { wrapper })
    act(() => {
      result.current.addEntry(sampleInput({ childName: 'Olivia' }))
    })
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].id).toBeTruthy()
    expect(result.current.entries[0].createdAt).toBeGreaterThan(0)
    expect(result.current.entries[0].childName).toBe('Olivia')
  })

  it('updateEntry replaces the entry content but preserves id and createdAt', () => {
    const { result } = renderHook(() => usePlan(), { wrapper })
    let id: string = ''
    let originalCreatedAt = 0
    act(() => {
      const entry = result.current.addEntry(sampleInput({ childName: 'Olivia' }))
      id = entry.id
      originalCreatedAt = entry.createdAt
    })
    act(() => {
      result.current.updateEntry(id, sampleInput({ childName: 'Oliver' }))
    })
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].id).toBe(id)
    expect(result.current.entries[0].createdAt).toBe(originalCreatedAt)
    expect(result.current.entries[0].childName).toBe('Oliver')
  })

  it('deleteEntry removes the entry and clears editingId if matching', () => {
    const { result } = renderHook(() => usePlan(), { wrapper })
    let id: string = ''
    act(() => {
      const entry = result.current.addEntry(sampleInput())
      id = entry.id
      result.current.startEditing(id)
    })
    expect(result.current.editingId).toBe(id)
    act(() => {
      result.current.deleteEntry(id)
    })
    expect(result.current.entries).toHaveLength(0)
    expect(result.current.editingId).toBeNull()
  })

  it('clearAll empties entries and cancels editing', () => {
    const { result } = renderHook(() => usePlan(), { wrapper })
    act(() => {
      result.current.addEntry(sampleInput())
      result.current.addEntry(sampleInput())
    })
    act(() => {
      result.current.startEditing(result.current.entries[0].id)
      result.current.clearAll()
    })
    expect(result.current.entries).toEqual([])
    expect(result.current.editingId).toBeNull()
  })

  it('persists entries to localStorage with correct version', () => {
    const { result } = renderHook(() => usePlan(), { wrapper })
    act(() => {
      result.current.addEntry(sampleInput({ childName: 'Olivia' }))
    })
    const raw = window.localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.version).toBe(SCHEMA_VERSION)
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0].childName).toBe('Olivia')
  })

  it('loads entries from localStorage on mount when version matches', () => {
    const existing = { ...sampleInput({ childName: 'Loaded' }), id: 'seed-1', createdAt: 1000 }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, entries: [existing] }),
    )
    const { result } = renderHook(() => usePlan(), { wrapper })
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].id).toBe('seed-1')
    expect(result.current.entries[0].childName).toBe('Loaded')
  })

  it('silently discards entries when localStorage version mismatches', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, entries: [{ id: 'x', childName: 'stale' }] }),
    )
    const { result } = renderHook(() => usePlan(), { wrapper })
    expect(result.current.entries).toEqual([])
  })

  it('silently discards entries when localStorage contains invalid JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not valid json {{{')
    const { result } = renderHook(() => usePlan(), { wrapper })
    expect(result.current.entries).toEqual([])
  })

  it('cancelEditing clears editingId without touching entries', () => {
    const { result } = renderHook(() => usePlan(), { wrapper })
    act(() => {
      const e = result.current.addEntry(sampleInput())
      result.current.startEditing(e.id)
    })
    expect(result.current.editingId).toBeTruthy()
    act(() => {
      result.current.cancelEditing()
    })
    expect(result.current.editingId).toBeNull()
    expect(result.current.entries).toHaveLength(1)
  })

  it('editingEntry returns the entry matching editingId', () => {
    const { result } = renderHook(() => usePlan(), { wrapper })
    let id = ''
    act(() => {
      const e = result.current.addEntry(sampleInput({ childName: 'Target' }))
      id = e.id
      result.current.startEditing(id)
    })
    expect(result.current.editingEntry?.id).toBe(id)
    expect(result.current.editingEntry?.childName).toBe('Target')
  })
})
