import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import type { ColorScheme } from '../types'

interface ToggleGroupProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  variant?: 'dark' | 'light'
  colorScheme?: ColorScheme
  className?: string
}

export function ToggleGroup({ options, value, onChange, variant = 'dark', colorScheme = 'accent', className }: ToggleGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  const [pill, setPill] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const active = container.querySelector<HTMLButtonElement>('[data-active="true"]')
    if (!active) return
    const left = active.offsetLeft
    const width = active.offsetWidth
    if (!mounted.current) {
      const el = pillRef.current
      if (el) {
        el.style.transition = 'none'
        void el.offsetLeft
      }
      setPill({ left, width })
      requestAnimationFrame(() => {
        if (el) el.style.transition = ''
      })
      mounted.current = true
    } else {
      setPill({ left, width })
    }
  }, [value])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      const active = container.querySelector<HTMLButtonElement>('[data-active="true"]')
      if (!active) return
      const el = pillRef.current
      if (el) {
        el.style.transition = 'none'
        void el.offsetLeft
      }
      setPill({ left: active.offsetLeft, width: active.offsetWidth })
      requestAnimationFrame(() => {
        if (el) el.style.transition = ''
      })
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={clsx(
      'relative flex rounded-xl p-1.5',
      variant === 'dark' ? 'bg-white/10' : 'bg-slate-100',
      className,
    )}>
      <div
        ref={pillRef}
        className={clsx(
          'absolute top-1.5 h-[calc(100%-12px)] rounded-lg bg-gradient-to-b shadow-md transition-all duration-300 ease-out',
          colorScheme === 'brand' ? 'from-brand-500 to-brand-700' : 'from-accent-400 to-accent-600',
        )}
        style={{ left: pill.left, width: pill.width }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-active={value === option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'relative z-10 flex-1 rounded-lg px-5 py-2 text-center text-sm font-bold transition-colors duration-200',
            value === option.value
              ? 'text-white'
              : variant === 'dark'
                ? 'text-white/60 hover:text-white'
                : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
