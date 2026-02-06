import { useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'

interface ToggleGroupProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ToggleGroup({ options, value, onChange, className }: ToggleGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const active = container.querySelector<HTMLButtonElement>('[data-active="true"]')
    if (!active) return
    setPill({ left: active.offsetLeft, width: active.offsetWidth })
  }, [value])

  return (
    <div ref={containerRef} className={clsx('relative inline-flex rounded-xl bg-white/10 p-1.5', className)}>
      <div
        className="absolute top-1.5 h-[calc(100%-12px)] rounded-lg bg-gradient-to-b from-accent-400 to-accent-600 shadow-md transition-all duration-300 ease-out"
        style={{ left: pill.left, width: pill.width }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-active={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'relative z-10 rounded-lg px-5 py-2 text-sm font-bold transition-colors duration-200',
            value === option.value
              ? 'text-white'
              : 'text-white/60 hover:text-white',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
