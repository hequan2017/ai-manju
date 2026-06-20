/**
 * 全局告警 Context
 * —— 提供 useAlert().alert(message, tone) 触发右上角短暂提示（自动消失）。
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { uid } from '@/services/utils'

type Tone = 'info' | 'success' | 'warning' | 'danger'

interface AlertItem {
  id: string
  message: string
  tone: Tone
}

interface AlertContextValue {
  alert: (message: string, tone?: Tone) => void
}

const AlertContext = createContext<AlertContextValue | null>(null)

const toneClass: Record<Tone, string> = {
  info: 'bg-surface-2 text-text border-border',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AlertItem[]>([])

  const alert = useCallback((message: string, tone: Tone = 'info') => {
    const id = uid()
    setItems((prev) => [...prev, { id, message, tone }])
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4000)
  }, [])

  // alert 引用稳定：提示增删（items 变化）不会导致 value 指向新对象，避免全量消费者重渲染
  const value = useMemo<AlertContextValue>(() => ({ alert }), [alert])

  return (
    <AlertContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {items.map((i) => (
          <div
            key={i.id}
            className={`rounded-lg border px-4 py-2 text-sm shadow-lg ${toneClass[i.tone]}`}
          >
            {i.message}
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  )
}

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error('useAlert 必须在 AlertProvider 内使用')
  return ctx
}
