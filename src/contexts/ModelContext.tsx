/**
 * 模型配置 Context
 * —— 全局模型状态加载、不可变更新与自动持久化。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ModelManagerState } from '@/types'
import { loadModelState, persistModelState } from '@/services/modelService'
import type { AdapterContext } from '@/services/adapters'

interface ModelContextValue {
  state: ModelManagerState | null
  ready: boolean
  /** 以不可变方式更新状态并自动持久化 */
  update: (mutator: (s: ModelManagerState) => ModelManagerState) => void
  /** 直接替换状态并持久化 */
  replace: (next: ModelManagerState) => void
}

const ModelContext = createContext<ModelContextValue | null>(null)

export function ModelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModelManagerState | null>(null)

  useEffect(() => {
    loadModelState().then(setState)
  }, [])

  const update = useCallback(
    (mutator: (s: ModelManagerState) => ModelManagerState) => {
      setState((prev) => {
        if (!prev) return prev
        const next = mutator(prev)
        void persistModelState(next)
        return next
      })
    },
    [],
  )

  const replace = useCallback((next: ModelManagerState) => {
    void persistModelState(next)
    setState(next)
  }, [])

  const value = useMemo<ModelContextValue>(
    () => ({ state, ready: state !== null, update, replace }),
    [state, update, replace],
  )

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
}

export function useModel(): ModelContextValue {
  const ctx = useContext(ModelContext)
  if (!ctx) throw new Error('useModel 必须在 ModelProvider 内使用')
  return ctx
}

/** 派生适配器运行上下文（供 AI 业务服务调用） */
export function useAdapterContext(): AdapterContext | null {
  const { state } = useModel()
  if (!state) return null
  return {
    providers: state.providers,
    globalApiKey: state.globalApiKey,
  }
}
