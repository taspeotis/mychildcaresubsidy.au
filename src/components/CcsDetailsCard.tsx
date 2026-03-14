import { useState } from 'react'
import clsx from 'clsx'
import type { ColorScheme } from '../types'
import { InputField } from './InputField'
import { ToggleGroup } from './ToggleGroup'

interface CcsDetailsCardProps {
  ccsPercent: string
  onCcsPercentChange: (value: string) => void
  withholding: string
  onWithholdingChange: (value: string) => void
  ccsHours: string
  onCcsHoursChange: (value: string) => void
  onOpenCcsModal: () => void
  debtRecovery?: string
  onDebtRecoveryChange?: (value: string) => void
  debtRecoveryMode?: 'percent' | 'amount'
  onDebtRecoveryModeChange?: (v: 'percent' | 'amount') => void
  colorScheme?: ColorScheme
  hideCcsHours?: boolean
}

export function CcsDetailsCard({
  ccsPercent,
  onCcsPercentChange,
  withholding,
  onWithholdingChange,
  ccsHours,
  onCcsHoursChange,
  onOpenCcsModal,
  debtRecovery,
  onDebtRecoveryChange,
  debtRecoveryMode: debtMode = 'percent',
  onDebtRecoveryModeChange,
  colorScheme = 'accent',
  hideCcsHours,
}: CcsDetailsCardProps) {
  const [debtEnabled, setDebtEnabled] = useState(() => Number(debtRecovery?.replace(/,/g, '') ?? '0') > 0)

  function handleDebtToggle(checked: boolean) {
    setDebtEnabled(checked)
    if (checked && onDebtRecoveryChange) {
      // Default to 20% — store as-is, caller interprets based on mode
      onDebtRecoveryChange(debtMode === 'percent' ? '20.00' : '0.00')
    } else if (!checked && onDebtRecoveryChange) {
      onDebtRecoveryChange('0.00')
    }
  }

  function handleModeSwitch(mode: string) {
    onDebtRecoveryModeChange?.(mode as 'percent' | 'amount')
    if (onDebtRecoveryChange) {
      onDebtRecoveryChange(mode === 'percent' ? '20.00' : '0.00')
    }
  }

  return (
    <div className="rounded-2xl card-glass p-8">
      <h2 className="text-lg font-bold text-slate-900">CCS Details</h2>
      <div className="mt-5 space-y-4">
        <div>
          <InputField
            label="CCS Percentage"
            value={ccsPercent}
            onChange={(e) => onCcsPercentChange(e.target.value)}
            suffix="%"
            format="percent"
            min={0}
            max={95}
            colorScheme={colorScheme}
          />
          <button
            type="button"
            onClick={onOpenCcsModal}
            className={`mt-1.5 text-xs font-bold ${colorScheme === 'brand' ? 'text-brand-600 hover:text-brand-500' : 'text-accent-500 hover:text-accent-400'}`}
          >
            Don't know your CCS %? Calculate it
          </button>
        </div>
        {hideCcsHours ? (
          <InputField
            label="CCS Withholding"
            value={withholding}
            onChange={(e) => onWithholdingChange(e.target.value)}
            hint="Usually 5%"
            format="integer"
            suffix="%"
            min={0}
            max={100}
            colorScheme={colorScheme}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="CCS Withholding"
                value={withholding}
                onChange={(e) => onWithholdingChange(e.target.value)}
                hint="Usually 5%"
                format="integer"
                suffix="%"
                min={0}
                max={100}
                colorScheme={colorScheme}
              />
              <div className="flex flex-col">
                <span className="block text-sm font-bold text-slate-700">
                  CCS Hours / Fortnight
                </span>
                <p className="text-xs text-slate-500 mt-0.5">Based on activity test</p>
                <div className="mt-auto pt-1.5">
                  <ToggleGroup
                    options={[
                      { value: '72', label: '72 hrs' },
                      { value: '100', label: '100 hrs' },
                    ]}
                    value={ccsHours}
                    onChange={onCcsHoursChange}
                    variant="light"
                    colorScheme={colorScheme}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              All families get 72 hrs/fortnight. 100 hrs if both parents do 48+ hrs of recognised activity per fortnight.
            </p>
          </>
        )}

        {onDebtRecoveryChange && (
          <details className="group">
            <summary className={`cursor-pointer select-none text-xs font-bold ${colorScheme === 'brand' ? 'text-brand-600 hover:text-brand-500' : 'text-accent-500 hover:text-accent-400'}`}>
              Centrelink Debt Recovery
              <svg className="ml-1 inline h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                If Centrelink is recovering a debt from your CCS, they typically deduct 20% of your entitlement.
                This reduces what's paid to your service but doesn't change your entitlement or state funding.
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={debtEnabled}
                  aria-label="Apply debt recovery"
                  onClick={() => handleDebtToggle(!debtEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${debtEnabled ? (colorScheme === 'brand' ? 'bg-brand-600 focus:ring-brand-500' : 'bg-accent-500 focus:ring-accent-500') : 'bg-slate-200 focus:ring-slate-400'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${debtEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm font-bold text-slate-700">Apply Debt Recovery</span>
              </label>
              {debtEnabled && (
                <div className="space-y-3">
                  <div className="flex rounded-lg bg-slate-100 p-1 w-fit">
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('percent')}
                      className={clsx(
                        'rounded-md px-3 py-1 text-xs font-bold transition-colors',
                        debtMode === 'percent'
                          ? clsx('text-white shadow-sm', colorScheme === 'brand' ? 'bg-brand-600' : 'bg-accent-500')
                          : 'text-slate-500 hover:text-slate-700',
                      )}
                    >
                      % of CCS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('amount')}
                      className={clsx(
                        'rounded-md px-3 py-1 text-xs font-bold transition-colors',
                        debtMode === 'amount'
                          ? clsx('text-white shadow-sm', colorScheme === 'brand' ? 'bg-brand-600' : 'bg-accent-500')
                          : 'text-slate-500 hover:text-slate-700',
                      )}
                    >
                      $ / Fortnight
                    </button>
                  </div>
                  <InputField
                    label={debtMode === 'percent' ? 'Recovery Rate' : 'Recovery Amount'}
                    value={debtRecovery ?? ''}
                    onChange={(e) => onDebtRecoveryChange(e.target.value)}
                    prefix={debtMode === 'amount' ? '$' : undefined}
                    suffix={debtMode === 'percent' ? '%' : '/fn'}
                    format={debtMode === 'percent' ? 'percent' : 'currency'}
                    min={0}
                    colorScheme={colorScheme}
                    className="max-w-48"
                  />
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
