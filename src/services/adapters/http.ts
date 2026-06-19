/**
 * 适配器 HTTP 基础设施
 * —— 统一供应商解析、URL 构造、鉴权与错误处理。
 *   适配器仅依赖 AdapterContext（providers + globalApiKey），不耦合具体状态管理。
 */
import type { ModelProvider } from '@/types'
import { sleep } from '../utils'

/** 适配器运行上下文（由调用方注入） */
export interface AdapterContext {
  providers: ModelProvider[]
  globalApiKey?: string
}

/** 解析后的供应商凭证 */
export interface ResolvedProvider {
  baseUrl: string
  apiKey: string
}

/** 根据供应商 id 解析出 baseUrl 与生效 apiKey */
export function resolveProvider(
  ctx: AdapterContext,
  providerId: string,
): ResolvedProvider {
  const provider = ctx.providers.find((p) => p.id === providerId)
  if (!provider) throw new Error(`未找到供应商：${providerId}`)

  const apiKey =
    (provider.apiKey && provider.apiKey.trim()) ||
    (ctx.globalApiKey && ctx.globalApiKey.trim()) ||
    ''
  if (!apiKey) {
    throw new Error(
      `供应商「${provider.name}」未配置 API Key，请在「模型配置」中填写。`,
    )
  }
  return { baseUrl: provider.baseUrl.replace(/\/$/, ''), apiKey }
}

/** 拼接 baseUrl 与端点路径 */
export function buildUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit
  signal?: AbortSignal
}

/** 可重试的 HTTP 状态码（限流 / 网关 / 服务端瞬时错误） */
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const MAX_RETRIES = 2

/** 统一鉴权请求（Bearer Token），含指数退避重试 */
export async function request(
  url: string,
  apiKey: string,
  opts: RequestOptions = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...(opts.headers ?? {}),
  }
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        method: opts.method ?? 'POST',
        headers,
        body: opts.body,
        signal: opts.signal,
      })
      // 限流 / 5xx：指数退避后重试（1s, 2s）
      if (RETRY_STATUS.has(res.status) && attempt < MAX_RETRIES && !opts.signal?.aborted) {
        await sleep(2 ** attempt * 1000)
        continue
      }
      return res
    } catch (err) {
      // 网络错误 / 中断：未达上限且未取消则重试
      if (attempt >= MAX_RETRIES || opts.signal?.aborted) throw err
      await sleep(2 ** attempt * 1000)
    }
  }
}

/** 校验响应并抛出携带状态码与响应片段的错误 */
export async function ensureOk(res: Response, label: string): Promise<void> {
  if (res.ok) return
  const text = await res.text().catch(() => '')
  throw new Error(`${label}失败 (${res.status})：${text.slice(0, 300)}`)
}
