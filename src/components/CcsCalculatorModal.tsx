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
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-900/5">
        <h2 className="text-lg font-semibold text-slate-900">Estimate your CCS %</h2>
        <p className="mt-1 text-sm text-slate-600">
          Based on FY2026 Child Care Subsidy rates
        </p>

        <div className="mt-5 space-y-4">
          <InputField
            label="Family adjusted taxable income"
            hint="Combined annual income"
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="e.g. 120000"
            suffix="$/yr"
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
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            This is the 2nd+ child under 6 (Higher CCS)
          </label>
        </div>

        {incomeValue > 0 && (
          <div className="mt-5 rounded-xl bg-teal-50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-teal-700">Your estimated CCS</span>
              <span className="text-2xl font-bold text-teal-600">
                {result.applicablePercent}%
              </span>
            </div>
            {isSecondChild && result.higherPercent > result.standardPercent && (
              <p className="mt-1 text-xs text-teal-600">
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
