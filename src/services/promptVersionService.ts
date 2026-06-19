/**
 * 提示词版本历史服务
 * —— 记录每次提示词变更（AI生成/手动编辑/回滚），支持版本回滚。上限 30 条。
 */
import type { PromptVersion } from '@/types'
import { now, uid } from './utils'

const MAX_VERSIONS = 30

export function createPromptVersion(
  prompt: string,
  source: PromptVersion['source'],
  note?: string,
): PromptVersion {
  return { id: uid(), prompt, createdAt: now(), source, note }
}

/** 追加版本（与上一条相同时不重复入栈） */
export function appendPromptVersion(
  history: PromptVersion[] | undefined,
  prompt: string,
  source: PromptVersion['source'],
  note?: string,
): PromptVersion[] {
  const list = history ?? []
  const last = list[list.length - 1]
  if (last && last.prompt === prompt) return list
  return [...list, createPromptVersion(prompt, source, note)].slice(-MAX_VERSIONS)
}

/** 回滚到指定版本 */
export function rollbackTo(history: PromptVersion[] | undefined, versionId: string): PromptVersion[] | undefined {
  if (!history) return history
  const idx = history.findIndex((v) => v.id === versionId)
  if (idx < 0) return history
  const target = history[idx]
  return [...history, createPromptVersion(target.prompt, 'rollback', `回滚至 ${target.source}`)].slice(-MAX_VERSIONS)
}