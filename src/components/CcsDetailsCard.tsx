import { InputField } from './InputField'

interface CcsDetailsCardProps {
  ccsPercent: string
  onCcsPercentChange: (value: string) => void
  withholding: string
  onWithholdingChange: (value: string) => void
  ccsHours: string
  onCcsHoursChange: (value: string) => void
  onOpenCcsModal: () => void
}

export function CcsDetailsCard({
  ccsPercent,
  onCcsPercentChange,
  withholding,
  onWithholdingChange,
  ccsHours,
  onCcsHoursChange,
  onOpenCcsModal,
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
          />
          <button
            type="button"
            onClick={onOpenCcsModal}
            className="mt-1.5 text-xs font-bold text-accent-500 hover:text-accent-400"
          >
            Don't know your CCS %? Calculate it
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="CCS withholding"
            value={withholding}
            onChange={(e) => onWithholdingChange(e.target.value)}
            hint="Usually 5%"
            format="integer"
            suffix="%"
            min={0}
            max={100}
          />
          <InputField
            label="CCS hours/fortnight"
            value={ccsHours}
            onChange={(e) => onCcsHoursChange(e.target.value)}
            type="number"
          />
        </div>
      </div>
    </div>
  )
}
