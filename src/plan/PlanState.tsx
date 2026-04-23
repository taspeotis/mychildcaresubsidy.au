import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PlanEntry, PlanEntryInput } from './types'

const STORAGE_KEY = 'mccs.plan.v1'
const SCHEMA_VERSION = 1

interface PlanContextValue {
  entries: PlanEntry[]
  addEntry: (input: PlanEntryInput) => PlanEntry
  updateEntry: (id: string, input: PlanEntryInput) => void
  deleteEntry: (id: string) => void
  clearAll: () => void
  editingId: string | null
  editingEntry: PlanEntry | null
  startEditing: (id: string) => void
  cancelEditing: () => void
}

const PlanContext = createContext<PlanContextValue | null>(null)

function loadEntries(): PlanEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { version?: number; entries?: PlanEntry[] }
    if (parsed?.version !== SCHEMA_VERSION) return []
    if (!Array.isArray(parsed.entries)) return []
    return parsed.entries
  } catch {
    return []
  }
}

function saveEntries(entries: PlanEntry[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, entries }))
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

export function PlanProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<PlanEntry[]>(loadEntries)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  const addEntry = useCallback((input: PlanEntryInput): PlanEntry => {
    const entry = { ...input, id: newId(), createdAt: Date.now() } as PlanEntry
    setEntries((prev) => [...prev, entry])
    return entry
  }, [])

  const updateEntry = useCallback((id: string, input: PlanEntryInput) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? ({ ...input, id: e.id, createdAt: e.createdAt } as PlanEntry) : e)),
    )
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setEditingId((current) => (current === id ? null : current))
  }, [])

  const clearAll = useCallback(() => {
    setEntries([])
    setEditingId(null)
  }, [])

  const startEditing = useCallback((id: string) => {
    setEditingId(id)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
  }, [])

  const editingEntry = useMemo(
    () => (editingId ? entries.find((e) => e.id === editingId) ?? null : null),
    [editingId, entries],
  )

  const value = useMemo<PlanContextValue>(
    () => ({
      entries,
      addEntry,
      updateEntry,
      deleteEntry,
      clearAll,
      editingId,
      editingEntry,
      startEditing,
      cancelEditing,
    }),
    [entries, addEntry, updateEntry, deleteEntry, clearAll, editingId, editingEntry, startEditing, cancelEditing],
  )

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlan() {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan must be used within PlanProvider')
  return ctx
}

export const __TEST__ = { STORAGE_KEY, SCHEMA_VERSION }
