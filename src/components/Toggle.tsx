import clsx from 'clsx'
import type { ColorScheme } from '../types'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  /** Accessible name, if it should differ from the visible label. */
  ariaLabel?: string
  colorScheme?: ColorScheme
  className?: string
}

/**
 * A labelled on/off switch. Scheme-coloured (brand = purple for federal CCS,
 * accent = orange for state/territory schemes). Clicking the label toggles it.
 */
export function Toggle({ checked, onChange, label, ariaLabel, colorScheme = 'accent', className }: ToggleProps) {
  return (
    <label className={clsx('flex items-center gap-3 cursor-pointer', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2',
          checked
            ? colorScheme === 'brand'
              ? 'bg-brand-600 focus:ring-brand-500'
              : 'bg-accent-500 focus:ring-accent-500'
            : 'bg-slate-200 focus:ring-slate-400',
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
      <span className="text-sm font-bold leading-5 text-slate-700">{label}</span>
    </label>
  )
}
