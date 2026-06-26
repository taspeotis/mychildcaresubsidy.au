import { InputField } from './InputField'
import { TimePicker } from './TimePicker'
import { Toggle } from './Toggle'
import type { ColorScheme } from '../types'

interface SessionDetailsCardProps {
  sessionFee: string
  onSessionFeeChange: (value: string) => void
  sessionStart: number
  onSessionStartChange: (value: number) => void
  sessionEnd: number
  onSessionEndChange: (value: number) => void
  colorScheme?: ColorScheme
  /** When provided, renders an "Apply to All Days" switch below the fields. */
  applyToAll?: boolean
  onApplyToAllChange?: (value: boolean) => void
}

export function SessionDetailsCard({
  sessionFee,
  onSessionFeeChange,
  sessionStart,
  onSessionStartChange,
  sessionEnd,
  onSessionEndChange,
  colorScheme = 'accent',
  applyToAll,
  onApplyToAllChange,
}: SessionDetailsCardProps) {
  return (
    <div className="rounded-2xl card-glass p-8">
      <h2 className="text-lg font-bold text-slate-900">Session Details</h2>
      <div className="mt-5 space-y-4">
        <InputField
          label="Daily Session Fee"
          value={sessionFee}
          onChange={(e) => onSessionFeeChange(e.target.value)}
          prefix="$"
          format="currency"
          min={0}
          colorScheme={colorScheme}
        />
        <div className="grid grid-cols-2 gap-4">
          <TimePicker
            label="Session Start"
            value={sessionStart}
            onChange={onSessionStartChange}
            min={5}
            max={12}
            colorScheme={colorScheme}
          />
          <TimePicker
            label="Session End"
            value={sessionEnd}
            onChange={onSessionEndChange}
            min={12}
            max={21}
            colorScheme={colorScheme}
          />
        </div>
        {onApplyToAllChange && (
          <div>
            <Toggle
              checked={applyToAll ?? false}
              onChange={onApplyToAllChange}
              label="Apply to All Days"
              colorScheme={colorScheme}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Every booked day uses these session details. Turn off to set each day individually.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
