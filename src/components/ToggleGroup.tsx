import clsx from 'clsx'

interface ToggleGroupProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ToggleGroup({ options, value, onChange, className }: ToggleGroupProps) {
  return (
    <div className={clsx('inline-flex rounded-xl bg-white/10 p-1.5', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={clsx(
            'rounded-lg px-5 py-2 text-sm font-bold transition-all',
            value === option.value
              ? 'bg-accent-500 text-white shadow-md'
              : 'text-white/60 hover:text-white',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
