import { useCallback } from 'react'
import clsx from 'clsx'

type InputFormat = 'currency' | 'integer' | 'percent'

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  prefix?: string
  suffix?: string
  error?: string
  format?: InputFormat
}

const NUMERIC_PATTERN: Record<InputFormat, RegExp> = {
  currency: /[^0-9.]/g,
  integer: /[^0-9,]/g,
  percent: /[^0-9.]/g,
}

function formatOnBlur(value: string, fmt: InputFormat, min?: number, max?: number): string {
  const raw = value.replace(/,/g, '')
  let num = parseFloat(raw)
  if (isNaN(num) || raw === '') return value
  if (min != null && num < min) num = min
  if (max != null && num > max) num = max
  switch (fmt) {
    case 'currency':
      return num.toFixed(2)
    case 'integer':
      return Math.round(num).toLocaleString('en-AU')
    case 'percent':
      return num.toFixed(2)
  }
}

export function InputField({ label, hint, prefix, suffix, error, format: fmt, className, id, onBlur, onChange, min, max, ...props }: InputFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const isTextMode = !!fmt
  const numMin = min != null ? Number(min) : undefined
  const numMax = max != null ? Number(max) : undefined

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (fmt) {
      // Strip non-numeric characters; integer format allows commas during typing (reformatted on blur)
      const raw = fmt === 'integer' ? e.target.value : e.target.value.replace(/,/g, '')
      e.target.value = raw.replace(NUMERIC_PATTERN[fmt], '')
    }
    onChange?.(e)
  }, [fmt, onChange])

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (fmt) {
      const formatted = formatOnBlur(e.target.value, fmt, numMin, numMax)
      if (formatted !== e.target.value) {
        e.target.value = formatted
        onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>)
      }
    }
    onBlur?.(e)
  }, [fmt, onChange, onBlur])

  return (
    <div className={clsx('flex flex-col', className)}>
      <label htmlFor={inputId} className="block text-sm font-bold text-slate-900">
        {label}
      </label>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <div className="mt-auto pt-1.5">
      <div className="relative">
        <input
          id={inputId}
          className={clsx(
            'block w-full rounded-xl border-2 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors',
            'placeholder:text-slate-400',
            'focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none',
            error ? 'border-red-300' : 'border-slate-200',
            prefix && 'pl-10',
            suffix && 'pr-14',
          )}
          {...(isTextMode ? { type: 'text', inputMode: fmt === 'integer' ? 'numeric' as const : 'decimal' as const } : { min, max })}
          {...props}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm text-slate-400">
            {prefix}
          </span>
        )}
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-sm text-slate-400">
            {suffix}
          </span>
        )}
      </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
