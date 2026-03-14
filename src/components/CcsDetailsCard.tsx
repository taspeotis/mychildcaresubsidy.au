import { useState } from 'react'
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
  colorScheme = 'accent',
  hideCcsHours,
}: CcsDetailsCardProps) {
  const [debtEnabled, setDebtEnabled] = useState(() => Number(debtRecovery?.replace(/,/g, '') ?? '0') > 0)
  const [debtMode, setDebtMode] = useState<'percent' | 'amount'>('percent')

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
    setDebtMode(mode as 'percent' | 'amount')
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
              <p className="text-xs text-slate-500">
                If Centrelink is recovering a debt from your CCS, they typically deduct 20% of your entitlement.
                This reduces what's paid to your service but doesn't change your entitlement or state funding.
              </p>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={debtEnabled}
                  onChange={(e) => handleDebtToggle(e.target.checked)}
                  className={`rounded border-slate-300 ${colorScheme === 'brand' ? 'text-brand-600 focus:ring-brand-500' : 'text-accent-500 focus:ring-accent-500'}`}
                />
                Apply debt recovery
              </label>
              {debtEnabled && (
                <div className="space-y-3">
                  <ToggleGroup
                    options={[
                      { value: 'percent', label: '% of CCS' },
                      { value: 'amount', label: '$ / Fortnight' },
                    ]}
                    value={debtMode}
                    onChange={handleModeSwitch}
                    variant="light"
                    colorScheme={colorScheme}
                    className="w-52"
                  />
                  <InputField
                    label={debtMode === 'percent' ? 'Recovery Rate' : 'Recovery Amount'}
                    value={debtRecovery ?? ''}
                    onChange={(e) => onDebtRecoveryChange(e.target.value)}
                    prefix={debtMode === 'amount' ? '$' : undefined}
                    suffix={debtMode === 'percent' ? '%' : '/fn'}
                    format={debtMode === 'percent' ? 'percent' : 'currency'}
                    min={0}
                    colorScheme={colorScheme}
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
