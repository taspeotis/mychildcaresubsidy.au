import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Estimate, EstimateInput } from './types'

const STORAGE_KEY = 'mccs.estimates.v1'
const SCHEMA_VERSION = 1

interface EstimatesContextValue {
  estimates: Estimate[]
  addEstimate: (input: EstimateInput) => Estimate
  updateEstimate: (id: string, input: EstimateInput) => void
  deleteEstimate: (id: string) => void
  clearAll: () => void
  editingId: string | null
  editingEstimate: Estimate | null
  startEditing: (id: string) => void
  cancelEditing: () => void
}

const EstimatesContext = createContext<EstimatesContextValue | null>(null)

function loadEstimates(): Estimate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { version?: number; estimates?: Estimate[] }
    if (parsed?.version !== SCHEMA_VERSION) return []
    if (!Array.isArray(parsed.estimates)) return []
    return parsed.estimates
  } catch {
    return []
  }
}

function saveEstimates(estimates: Estimate[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, estimates }))
  } catch {
    // localStorage may be unavailable (private browsing, quota); fall through
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function EstimatesProvider({ children }: { children: ReactNode }) {
  const [estimates, setEstimates] = useState<Estimate[]>(loadEstimates)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    saveEstimates(estimates)
  }, [estimates])

  const addEstimate = useCallback((input: EstimateInput): Estimate => {
    const estimate = { ...input, id: newId(), createdAt: Date.now() } as Estimate
    setEstimates((prev) => [...prev, estimate])
    return estimate
  }, [])

  const updateEstimate = useCallback((id: string, input: EstimateInput) => {
    setEstimates((prev) =>
      prev.map((e) => (e.id === id ? ({ ...input, id: e.id, createdAt: e.createdAt } as Estimate) : e)),
    )
  }, [])

  const deleteEstimate = useCallback((id: string) => {
    setEstimates((prev) => prev.filter((e) => e.id !== id))
    setEditingId((current) => (current === id ? null : current))
  }, [])

  const clearAll = useCallback(() => {
    setEstimates([])
    setEditingId(null)
  }, [])

  const startEditing = useCallback((id: string) => {
    setEditingId(id)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
  }, [])

  const editingEstimate = useMemo(
    () => (editingId ? estimates.find((e) => e.id === editingId) ?? null : null),
    [editingId, estimates],
  )

  const value = useMemo<EstimatesContextValue>(
    () => ({
      estimates,
      addEstimate,
      updateEstimate,
      deleteEstimate,
      clearAll,
      editingId,
      editingEstimate,
      startEditing,
      cancelEditing,
    }),
    [estimates, addEstimate, updateEstimate, deleteEstimate, clearAll, editingId, editingEstimate, startEditing, cancelEditing],
  )

  return <EstimatesContext.Provider value={value}>{children}</EstimatesContext.Provider>
}

export function useEstimates() {
  const ctx = useContext(EstimatesContext)
  if (!ctx) throw new Error('useEstimates must be used within EstimatesProvider')
  return ctx
}

export const __TEST__ = { STORAGE_KEY, SCHEMA_VERSION }
