/**
 * 渲染日志服务
 * —— 记录每次 AI 调用的成败/耗时/模型，用于渲染日志面板。
 */
import type { RenderLog } from '@/types'
import { now, uid } from './utils'

export function createRenderLog(input: Omit<RenderLog, 'id' | 'timestamp'>): RenderLog {
  return { ...input, id: uid(), timestamp: now() }
}

/** 包裹一次 AI 操作，自动记录日志（通过回调写入 episode.renderLogs） */
export async function withLogging<T>(
  op: () => Promise<T>,
  info: Omit<RenderLog, 'id' | 'timestamp' | 'status' | 'duration'>,
  onLog: (log: RenderLog) => void,
): Promise<T> {
  const start = now()
  try {
    const result = await op()
    onLog(createRenderLog({ ...info, status: 'success', duration: now() - start }))
    return result
  } catch (err) {
    onLog(
      createRenderLog({
        ...info,
        status: 'failed',
        duration: now() - start,
        error: err instanceof Error ? err.message : String(err),
      }),
    )
    throw err
  }
}

/** 追加日志到数组（上限 200 条） */
export function appendLog(logs: RenderLog[], log: RenderLog): RenderLog[] {
  return [log, ...logs].slice(0, 200)
}