/**
 * 适配器 HTTP 基础设施
 * —— 统一供应商解析、URL 构造、鉴权与错误处理。
 *   适配器仅依赖 AdapterContext（providers + globalApiKey），不耦合具体状态管理。
 */
import type { ModelProvider } from '@/types'

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

/** 统一鉴权请求（Bearer Token） */
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
  return fetch(url, {
    method: opts.method ?? 'POST',
    headers,
    body: opts.body,
    signal: opts.signal,
  })
}

/** 校验响应并抛出携带状态码与响应片段的错误 */
export async function ensureOk(res: Response, label: string): Promise<void> {
  if (res.ok) return
  const text = await res.text().catch(() => '')
  throw new Error(`${label}失败 (${res.status})：${text.slice(0, 300)}`)
}
