import clsx from 'clsx'

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  prefix?: string
  suffix?: string
  error?: string
}

export function InputField({ label, hint, prefix, suffix, error, className, id, ...props }: InputFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
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
          {...props}
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
