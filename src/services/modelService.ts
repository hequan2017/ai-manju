/**
 * 模型配置管理服务
 * —— 维护供应商列表与当前生效的模型组合。纯函数返回不可变新状态，
 *   配合 React setState 使用；持久化通过 db 层完成。
 */
import type { ModelConfig, ModelManagerState, ModelProvider } from '@/types'
import { getModelState, saveModelState } from './db'
import { createDefaultModelState } from './factory'

/** 读取模型状态，缺省时返回默认状态 */
export async function loadModelState(): Promise<ModelManagerState> {
  const state = await getModelState()
  return state ?? createDefaultModelState()
}

/** 持久化模型状态 */
export async function persistModelState(state: ModelManagerState): Promise<void> {
  await saveModelState(state)
}

/** 新增/更新供应商（按 id 去重） */
export function upsertProvider(
  state: ModelManagerState,
  provider: ModelProvider,
): ModelManagerState {
  const exists = state.providers.some((p) => p.id === provider.id)
  const providers = exists
    ? state.providers.map((p) => (p.id === provider.id ? provider : p))
    : [...state.providers, provider]
  return { ...state, providers }
}

/** 删除供应商（内置供应商禁止删除） */
export function removeProvider(
  state: ModelManagerState,
  providerId: string,
): ModelManagerState {
  const target = state.providers.find((p) => p.id === providerId)
  if (target?.isBuiltIn) throw new Error('内置供应商不可删除')
  const providers = state.providers.filter((p) => p.id !== providerId)
  return { ...state, providers }
}

/** 设为默认供应商 */
export function markDefaultProvider(
  state: ModelManagerState,
  providerId: string,
): ModelManagerState {
  return {
    ...state,
    providers: state.providers.map((p) => ({
      ...p,
      isDefault: p.id === providerId,
    })),
  }
}

/** 更新当前生效的模型组合 */
export function updateCurrentConfig(
  state: ModelManagerState,
  config: ModelConfig,
): ModelManagerState {
  return { ...state, currentConfig: config }
}

/** 判断是否已配置可用凭证（决定是否跳过 Onboarding） */
export function hasUsableApiKey(state: ModelManagerState): boolean {
  if (state.globalApiKey && state.globalApiKey.trim()) return true
  return state.providers.some((p) => p.apiKey && p.apiKey.trim())
}
