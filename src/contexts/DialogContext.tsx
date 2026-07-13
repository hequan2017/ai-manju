import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Button, Input, Label, Modal } from '@/components/ui'
import { useI18n } from '@/contexts/I18nContext'

export interface ConfirmDialogOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

export interface PromptDialogOptions {
  title: string
  description?: string
  defaultValue?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
}

interface DialogContextValue {
  confirmDialog: (options: ConfirmDialogOptions) => Promise<boolean>
  promptDialog: (options: PromptDialogOptions) => Promise<string | null>
}

type DialogRequest =
  | { id: number; type: 'confirm'; options: ConfirmDialogOptions }
  | { id: number; type: 'prompt'; options: PromptDialogOptions; value: string }

type DialogResolver =
  | { type: 'confirm'; resolve: (value: boolean) => void }
  | { type: 'prompt'; resolve: (value: string | null) => void }

const DialogContext = createContext<DialogContextValue | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const inputId = useId()
  const [request, setRequest] = useState<DialogRequest | null>(null)
  const resolverRef = useRef<DialogResolver | null>(null)
  const generationRef = useRef(0)

  const cancelPending = useCallback(() => {
    const resolver = resolverRef.current
    resolverRef.current = null
    if (resolver?.type === 'confirm') resolver.resolve(false)
    if (resolver?.type === 'prompt') resolver.resolve(null)
  }, [])

  const confirmDialog = useCallback(
    (options: ConfirmDialogOptions) =>
      new Promise<boolean>((resolve) => {
        cancelPending()
        resolverRef.current = { type: 'confirm', resolve }
        setRequest({ id: ++generationRef.current, type: 'confirm', options })
      }),
    [cancelPending],
  )

  const promptDialog = useCallback(
    (options: PromptDialogOptions) =>
      new Promise<string | null>((resolve) => {
        cancelPending()
        resolverRef.current = { type: 'prompt', resolve }
        setRequest({
          id: ++generationRef.current,
          type: 'prompt',
          options,
          value: options.defaultValue ?? '',
        })
      }),
    [cancelPending],
  )

  const handleCancel = useCallback(() => {
    setRequest(null)
    cancelPending()
  }, [cancelPending])

  const handleConfirm = useCallback(() => {
    const resolver = resolverRef.current
    resolverRef.current = null
    setRequest(null)

    if (request?.type === 'confirm' && resolver?.type === 'confirm') {
      resolver.resolve(true)
    }
    if (request?.type === 'prompt' && resolver?.type === 'prompt') {
      resolver.resolve(request.value)
    }
  }, [request])

  useEffect(() => cancelPending, [cancelPending])

  const value = useMemo<DialogContextValue>(
    () => ({ confirmDialog, promptDialog }),
    [confirmDialog, promptDialog],
  )

  const options = request?.options

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal
        key={request?.id ?? 0}
        open={request !== null}
        onClose={handleCancel}
        title={options?.title}
        size="sm"
        footer={
          request && (
            <>
              <Button variant="ghost" onClick={handleCancel}>
                {options?.cancelLabel ?? t('common.cancel')}
              </Button>
              <Button
                variant={
                  request.type === 'confirm' && request.options.tone === 'danger'
                    ? 'danger'
                    : 'primary'
                }
                onClick={handleConfirm}
              >
                {options?.confirmLabel ?? t('common.confirm')}
              </Button>
            </>
          )
        }
      >
        {request?.options.description && (
          <p className="text-sm text-text-muted">{request.options.description}</p>
        )}
        {request?.type === 'prompt' && (
          <div className={request.options.description ? 'mt-4' : undefined}>
            <Label className="sr-only" htmlFor={inputId}>
              {request.options.title}
            </Label>
            <Input
              id={inputId}
              autoFocus
              value={request.value}
              placeholder={request.options.placeholder}
              onChange={(event) =>
                setRequest((current) =>
                  current?.type === 'prompt'
                    ? { ...current, value: event.target.value }
                    : current,
                )
              }
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                handleConfirm()
              }}
            />
          </div>
        )}
      </Modal>
    </DialogContext.Provider>
  )
}

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext)
  if (!context) throw new Error('useDialog 必须在 DialogProvider 内使用')
  return context
}
