import { useEffect, useRef } from 'react'

/**
 * Accessibility plumbing for a modal dialog:
 * - moves keyboard focus into the dialog when it opens
 * - traps Tab/Shift+Tab within the dialog
 * - closes on Escape
 * - restores focus to the previously-focused element when it closes
 *
 * The hook assumes the component is only mounted while the dialog is open
 * (conditionally rendered by the parent), so the effect runs once per open.
 * Attach the returned ref to the element with `role="dialog"` and give that
 * element `tabIndex={-1}` so it can receive focus as a fallback.
 */
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = ref.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusables = () =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null)
        : []

    // Move focus into the dialog (first focusable control, else the dialog itself).
    ;(focusables()[0] ?? dialog)?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialog) return
      const els = focusables()
      if (els.length === 0) {
        e.preventDefault()
        dialog.focus()
        return
      }
      const first = els[0]
      const last = els[els.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.()
    }
  }, [])

  return ref
}
