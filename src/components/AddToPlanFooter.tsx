import clsx from 'clsx'
import type { ColorScheme } from '../types'
import { InputField } from './InputField'
import { Button } from './Button'
import { useSharedCalculatorState } from '../context/SharedCalculatorState'

interface AddToPlanFooterProps {
  colorScheme?: ColorScheme
  onSubmit: () => void
  onCancel?: () => void
  isEditing?: boolean
  editingLabel?: string
  disabled?: boolean
  hasEntries: boolean
}

export function AddToPlanFooter({
  colorScheme = 'accent',
  onSubmit,
  onCancel,
  isEditing = false,
  editingLabel,
  disabled = false,
  hasEntries,
}: AddToPlanFooterProps) {
  const { childName, setChildName, serviceName, setServiceName } = useSharedCalculatorState()
  const isBrand = colorScheme === 'brand'

  return (
    <div
      className={clsx(
        'rounded-2xl card-glass p-6 sm:p-8 border-t-[3px]',
        isBrand ? 'border-t-brand-600' : 'border-t-accent-500',
      )}
    >
      {isEditing ? (
        <div
          className={clsx(
            'mb-5 rounded-xl px-4 py-3 text-sm font-bold',
            isBrand ? 'bg-brand-50 text-brand-800' : 'bg-accent-50 text-accent-800',
          )}
        >
          Editing: {editingLabel || 'this entry'}
        </div>
      ) : (
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            {hasEntries ? 'Add another estimate to your plan.' : "Plan your family's child care costs"}
          </h2>
          {!hasEntries && (
            <p className="mt-2 text-sm text-slate-600">
              Add estimates for each of your children to see what care costs your household.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputField
          label="Child's name"
          hint="Optional"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          placeholder="e.g. Olivia"
          maxLength={60}
          colorScheme={colorScheme}
        />
        <InputField
          label="Service name"
          hint="Optional"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          placeholder="e.g. Little Acorns"
          maxLength={80}
          colorScheme={colorScheme}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {isEditing && onCancel && (
          <Button
            variant="outline"
            color={isBrand ? 'brand' : 'accent'}
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        )}
        <Button
          color={isBrand ? 'brand' : 'accent'}
          onClick={onSubmit}
          disabled={disabled}
          className={clsx('w-full sm:w-auto', disabled && 'cursor-not-allowed opacity-50')}
        >
          {isEditing ? 'Save Changes' : 'Add To Plan'}
        </Button>
      </div>
    </div>
  )
}
