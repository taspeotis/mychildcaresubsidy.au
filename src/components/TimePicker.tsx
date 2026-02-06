import clsx from 'clsx'

interface TimePickerProps {
  label: string
  hint?: string
  value: number
  onChange: (hour: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  id?: string
}

function formatTime(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`
}

function generateTimeOptions(min: number, max: number, step: number): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = []
  for (let t = min; t <= max; t += step) {
    options.push({ value: t, label: formatTime(t) })
  }
  return options
}

export function TimePicker({ label, hint, value, onChange, min = 5, max = 21, step = 0.5, className, id }: TimePickerProps) {
  const pickerId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const options = generateTimeOptions(min, max, step)

  return (
    <div className={clsx('space-y-1.5', className)}>
      <label htmlFor={pickerId} className="block text-sm font-bold text-slate-900">
        {label}
      </label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="relative">
        <select
          id={pickerId}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={clsx(
            'block w-full appearance-none rounded-xl border-2 border-slate-200 bg-white py-3 pr-10 pl-4 text-sm text-slate-900 shadow-sm transition-colors',
            'focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none',
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg className="h-5 w-5 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor">
            <path d="M5.75 10.75L8 13L10.25 10.75" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.25 5.25L8 3L5.75 5.25" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  )
}
