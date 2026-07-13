/**
 * 模态对话框（基于 createPortal）
 */
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { IconButton } from './IconButton'
import { acquireBodyScrollLock } from './modalLifecycle'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  ariaLabel?: string
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  ariaLabel = '对话框',
}: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    const dialog = dialogRef.current
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!triggerRef.current && !dialog?.contains(activeElement)) {
      triggerRef.current = activeElement
    }
    const trigger = triggerRef.current
    const releaseBodyScrollLock = acquireBodyScrollLock(document.body)

    const preferredFocusable = dialog?.querySelector<HTMLElement>('[autofocus], [data-autofocus]')
    const firstFocusable = preferredFocusable ?? dialog?.querySelector<HTMLElement>(focusableSelector)
    ;(firstFocusable ?? dialog)?.focus()

    return () => {
      releaseBodyScrollLock()
      triggerRef.current = null
      if (trigger?.isConnected) trigger.focus()
    }
  }, [open])

  const handleFocusCapture = (event: FocusEvent<HTMLDivElement>) => {
    if (
      !triggerRef.current &&
      event.relatedTarget instanceof HTMLElement &&
      !event.currentTarget.contains(event.relatedTarget)
    ) {
      triggerRef.current = event.relatedTarget
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCloseRef.current()
      return
    }
    if (event.key !== 'Tab') return

    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    if (focusable.length === 0) {
      event.preventDefault()
      dialog.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!open) return null
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
      onFocusCapture={handleFocusCapture}
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative z-10 w-full ${sizeMap[size]} rounded-2xl border border-border bg-surface shadow-2xl`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 id={titleId} className="text-base font-semibold text-text">{title}</h2>
            <IconButton icon={<X className="h-4 w-4" />} label="关闭" onClick={onClose} />
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
