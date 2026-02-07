import { InputField } from './InputField'
import { TimePicker } from './TimePicker'
import type { ColorScheme } from '../types'

interface SessionDetailsCardProps {
  sessionFee: string
  onSessionFeeChange: (value: string) => void
  sessionStart: number
  onSessionStartChange: (value: number) => void
  sessionEnd: number
  onSessionEndChange: (value: number) => void
  colorScheme?: ColorScheme
}

export function SessionDetailsCard({
  sessionFee,
  onSessionFeeChange,
  sessionStart,
  onSessionStartChange,
  sessionEnd,
  onSessionEndChange,
  colorScheme = 'accent',
}: SessionDetailsCardProps) {
  return (
    <div className="rounded-2xl card-glass p-8">
      <h2 className="text-lg font-bold text-slate-900">Session Details</h2>
      <div className="mt-5 space-y-4">
        <InputField
          label="Daily session fee"
          value={sessionFee}
          onChange={(e) => onSessionFeeChange(e.target.value)}
          prefix="$"
          format="currency"
          min={0}
          colorScheme={colorScheme}
        />
        <div className="grid grid-cols-2 gap-4">
          <TimePicker
            label="Session start"
            value={sessionStart}
            onChange={onSessionStartChange}
            min={5}
            max={12}
            colorScheme={colorScheme}
          />
          <TimePicker
            label="Session end"
            value={sessionEnd}
            onChange={onSessionEndChange}
            min={12}
            max={21}
            colorScheme={colorScheme}
          />
        </div>
      </div>
    </div>
  )
}
