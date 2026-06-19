/**
 * 对话模型适配器
 * —— 用于剧本拆解、提示词生成等文本推理任务。
 */
import type { ChatModelConfig } from '@/types'
import { extractJSON, parseJsonResponse } from '../utils'
import { buildUrl, ensureOk, request, resolveProvider, type AdapterContext } from './http'

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatContentPart[]
}

export interface ChatOptions {
  model: ChatModelConfig
  messages: ChatMessage[]
  temperature?: number
  /** 强制 JSON 对象输出 */
  jsonMode?: boolean
  signal?: AbortSignal
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[]
}

/** 执行一次对话补全，返回纯文本 */
export async function chat(
  ctx: AdapterContext,
  opts: ChatOptions,
): Promise<string> {
  const provider = resolveProvider(ctx, opts.model.providerId)
  const endpoint = opts.model.endpoint ?? '/v1/chat/completions'
  const url = buildUrl(provider.baseUrl, endpoint)

  const body = JSON.stringify({
    model: opts.model.modelName,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  })

  const res = await request(url, provider.apiKey, { body, signal: opts.signal })
  await ensureOk(res, '对话模型请求')
  const data = await parseJsonResponse<OpenAIChatResponse>(res)
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('对话模型返回内容为空')
  return content
}

/** 强制 JSON 输出并解析为对象 */
export async function chatJSON<T = unknown>(
  ctx: AdapterContext,
  opts: Omit<ChatOptions, 'jsonMode'> & { jsonMode?: boolean },
): Promise<T> {
  const raw = await chat(ctx, { ...opts, jsonMode: opts.jsonMode ?? true })
  return extractJSON<T>(raw)
}
