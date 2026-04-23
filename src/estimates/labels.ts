import type { Estimate } from './types'

export function formatEstimateLabel(estimate: Estimate, position: number): string {
  const name = estimate.childName.trim()
  const service = estimate.serviceName.trim()
  const displayName = name || `Child ${position}`
  return service ? `${displayName} at ${service}` : displayName
}
