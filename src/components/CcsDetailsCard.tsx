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
  colorScheme = 'accent',
  hideCcsHours,
}: CcsDetailsCardProps) {
  return (
    <div className="rounded-2xl card-glass p-8">
      <h2 className="text-lg font-bold text-slate-900">CCS Details</h2>
      <div className="mt-5 space-y-4">
        <div>
          <InputField
            label="CCS percentage"
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
            label="CCS withholding"
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
                label="CCS withholding"
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
                  CCS hours/fortnight
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
      </div>
    </div>
  )
}
