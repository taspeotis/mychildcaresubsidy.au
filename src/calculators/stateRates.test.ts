import { describe, it, expect } from 'vitest'
import { DEFAULT_STATE_RATE_YEAR, STATE_RATE_YEARS, defaultStateRatesStart, getStateRateYear } from './stateRates'

describe('state rate years', () => {
  it('defaults to the latest year (2027)', () => {
    expect(DEFAULT_STATE_RATE_YEAR).toBe(STATE_RATE_YEARS['2027'])
  })

  it('resolves a ?state= year, or null when unrecognised', () => {
    expect(getStateRateYear(2026)).toBe(STATE_RATE_YEARS['2026'])
    expect(getStateRateYear(2027)).toBe(STATE_RATE_YEARS['2027'])
    expect(getStateRateYear(2019)).toBeNull()
    expect(getStateRateYear(undefined)).toBeNull()
  })

  it('the default rates start on 1 January of their year', () => {
    expect(defaultStateRatesStart()).toEqual(new Date(2027, 0, 1))
  })
})
