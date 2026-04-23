import type { PlanEntry } from './types'

export function formatEntryLabel(entry: PlanEntry, position: number): string {
  const name = entry.childName.trim()
  const service = entry.serviceName.trim()
  const displayName = name || `Child ${position}`
  return service ? `${displayName} at ${service}` : displayName
}
