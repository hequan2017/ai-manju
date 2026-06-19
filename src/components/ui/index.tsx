/**
 * 通用 UI 组件库
 * —— 基于 design tokens 的工业风基础组件，统一交互与视觉语言。
 */
import { clsx } from 'clsx'
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Loader2 } from 'lucide-react'

// ---------------------------------------------------------------- Button

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover shadow-sm',
  secondary: 'bg-surface-2 text-text hover:bg-surface-hover border border-border',
  outline: 'border border-border-strong text-text hover:bg-surface-2',
  ghost: 'text-text-muted hover:bg-surface-2 hover:text-text',
  danger: 'bg-danger text-white hover:opacity-90 shadow-sm',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9 justify-center',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        'disabled:opacity-50 disabled:pointer-events-none',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
})

// ---------------------------------------------------------------- Card

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-border bg-surface shadow-sm',
        className,
      )}
      {...rest}
    />
  )
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('px-5 py-4 border-b border-border', className)} {...rest} />
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-5', className)} {...rest} />
}

// ---------------------------------------------------------------- Badge

type BadgeTone = 'default' | 'accent' | 'success' | 'warning' | 'danger'

const badgeTones: Record<BadgeTone, string> = {
  default: 'bg-surface-2 text-text-muted border-border',
  accent: 'bg-accent-soft text-accent border-transparent',
  success: 'bg-success/10 text-success border-transparent',
  warning: 'bg-warning/10 text-warning border-transparent',
  danger: 'bg-danger/10 text-danger border-transparent',
}

export function Badge({
  tone = 'default',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------- Input / Textarea / Select / Label

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(
          'h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-text',
          'placeholder:text-text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30',
          'disabled:opacity-50',
          className,
        )}
        {...rest}
      />
    )
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text',
        'placeholder:text-text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30',
        'disabled:opacity-50 resize-y',
        className,
      )}
      {...rest}
    />
  )
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={clsx(
          'h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-text',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    )
  },
)

export function Label({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <label className={clsx('block text-xs font-medium text-text-muted mb-1.5', className)}>
      {children}
    </label>
  )
}

// ---------------------------------------------------------------- Spinner & EmptyState

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('h-5 w-5 animate-spin text-accent', className)} />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
      {icon && <div className="text-text-subtle">{icon}</div>}
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        {description && <p className="mt-1 text-xs text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ---------------------------------------------------------------- 复合组件 re-export

export { Modal, type ModalProps } from './Modal'
export { IconButton, type IconButtonProps } from './IconButton'
