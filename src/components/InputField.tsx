import clsx from 'clsx'

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  suffix?: string
  error?: string
}

export function InputField({ label, hint, suffix, error, className, id, ...props }: InputFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={clsx('space-y-1', className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-900">
        {label}
      </label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="relative">
        <input
          id={inputId}
          className={clsx(
            'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors',
            'placeholder:text-slate-400',
            'focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none',
            error ? 'border-red-300' : 'border-slate-200',
            suffix && 'pr-12',
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-400">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
