import { useState } from 'react'
import { estimateCcs } from '../calculators/ccs'
import { InputField } from './InputField'
import { Button } from './Button'

interface CcsCalculatorModalProps {
  open: boolean
  onClose: () => void
  onApply: (ccsPercent: number) => void
}

export function CcsCalculatorModal({ open, onClose, onApply }: CcsCalculatorModalProps) {
  const [income, setIncome] = useState('')
  const [numChildren, setNumChildren] = useState('1')
  const [isSecondChild, setIsSecondChild] = useState(false)

  if (!open) return null

  const incomeValue = Number(income) || 0
  const result = estimateCcs({
    income: incomeValue,
    numberOfChildren: Number(numChildren) || 1,
    isFirstChildUnder6: true,
    useHigherCcs: isSecondChild,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-brand-950/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl card-glass p-8">
        <h2 className="text-xl font-bold text-slate-900">Estimate Your CCS %</h2>
        <p className="mt-1 text-sm text-slate-600">
          Based on FY2026 Child Care Subsidy rates
        </p>

        <div className="mt-5 space-y-4">
          <InputField
            label="Family adjusted taxable income"
            hint="Combined annual income"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="e.g. 120,000"
            prefix="$"
            suffix="/yr"
            format="integer"
          />

          <InputField
            label="Number of children in care"
            type="number"
            min="1"
            max="10"
            value={numChildren}
            onChange={(e) => setNumChildren(e.target.value)}
          />

          <label className="flex items-center gap-2 text-sm text-slate-900">
            <input
              type="checkbox"
              checked={isSecondChild}
              onChange={(e) => setIsSecondChild(e.target.checked)}
              className="rounded border-slate-300 text-accent-500 focus:ring-accent-500"
            />
            This is the 2nd+ child under 6 (Higher CCS)
          </label>
        </div>

        {incomeValue > 0 && (
          <div className="mt-5 rounded-xl bg-gradient-to-br from-accent-50 to-accent-100/50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-accent-700">Your estimated CCS</span>
              <span className="text-2xl font-bold text-accent-500">
                {result.applicablePercent}%
              </span>
            </div>
            {isSecondChild && result.higherPercent > result.standardPercent && (
              <p className="mt-1 text-xs text-accent-600">
                Higher CCS applied ({result.standardPercent}% standard)
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Button
            variant="outline"
            color="slate"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onApply(result.applicablePercent)
              onClose()
            }}
            className="flex-1"
            disabled={incomeValue <= 0}
          >
            Use {result.applicablePercent}%
          </Button>
        </div>
      </div>
    </div>
  )
}
