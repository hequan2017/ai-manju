/**
 * 视频生成适配器
 * —— 统一走 new-api 的 /v1/videos（OpenAI Sora 兼容）：提交任务 + 轮询。
 *   首帧/首尾帧通过 input 数组传入，new-api 代理到实际视频渠道（Sora/Seedance/Veo）。
 */
import type { AspectRatio, VideoModelConfig } from '@/types'
import { aspectToVideoSize, fetchUrlAsDataURL, parseJsonResponse, sleep } from '../utils'
import { buildUrl, ensureOk, request, resolveProvider, type AdapterContext } from './http'

export interface VideoOptions {
  model: VideoModelConfig
  prompt: string
  /** 起始帧 base64 data url */
  startImage?: string
  /** 结束帧 base64 data url（首尾帧插值） */
  endImage?: string
  duration?: number
  aspect?: AspectRatio
  signal?: AbortSignal
  onProgress?: (info: { status: string; raw?: unknown }) => void
}

const POLL_INTERVAL_MS = 5000
const POLL_MAX_ATTEMPTS = 120 // 约 10 分钟上限

interface TaskPayload {
  id?: string
  task_id?: string
  status?: string
  url?: string
  video_url?: string
  video?: { url?: string }
  data?: { id?: string; url?: string; video?: { url?: string }; status?: string }[]
  error?: { message?: string }
}

/** 生成视频（统一 /v1/videos），返回 base64 data url */
export async function generateVideo(ctx: AdapterContext, opts: VideoOptions): Promise<string> {
  const provider = resolveProvider(ctx, opts.model.providerId)
  const endpoint = opts.model.endpoint ?? '/v1/videos'
  const submitUrl = buildUrl(provider.baseUrl, endpoint)

  const res = await request(submitUrl, provider.apiKey, {
    body: JSON.stringify(buildSubmitBody(opts)),
    signal: opts.signal,
  })
  await ensureOk(res, '视频任务提交')
  const data = await parseJsonResponse<TaskPayload>(res)

  // 同步直接返回结果
  const direct = pickVideoUrl(data)
  if (direct) return resolveVideoData(direct)

  // 异步轮询
  const taskId = data.id ?? data.task_id ?? data.data?.[0]?.id
  if (!taskId) throw new Error('视频任务未返回任务 ID')
  opts.onProgress?.({ status: 'queued' })
  return pollTask(provider, endpoint, taskId, opts)
}

/** OpenAI Sora 兼容请求体 */
function buildSubmitBody(opts: VideoOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: opts.model.modelName,
    prompt: opts.prompt,
  }
  if (opts.duration) body.seconds = opts.duration
  if (opts.aspect) body.size = aspectToVideoSize(opts.aspect)

  // 参考帧（首帧 / 首尾帧）
  const input: Array<Record<string, unknown>> = []
  if (opts.startImage) input.push({ type: 'image_url', image_url: { url: opts.startImage } })
  if (opts.endImage) input.push({ type: 'image_url', image_url: { url: opts.endImage } })
  if (input.length > 0) body.input = input

  return body
}

async function pollTask(
  provider: { baseUrl: string; apiKey: string },
  endpoint: string,
  taskId: string,
  opts: VideoOptions,
): Promise<string> {
  const statusUrl = buildUrl(provider.baseUrl, `${endpoint}/${taskId}`)
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS)
    if (opts.signal?.aborted) throw new Error('视频生成已取消')
    const res = await request(statusUrl, provider.apiKey, { method: 'GET', signal: opts.signal })
    await ensureOk(res, '视频任务查询')
    const payload = await parseJsonResponse<TaskPayload>(res)
    const status = (payload.status ?? payload.data?.[0]?.status ?? 'processing').toLowerCase()
    opts.onProgress?.({ status, raw: payload })

    if (['succeeded', 'success', 'completed', 'done'].includes(status)) {
      const url = pickVideoUrl(payload)
      if (!url) throw new Error('视频任务完成但未返回视频地址')
      return resolveVideoData(url)
    }
    if (['failed', 'error'].includes(status)) {
      throw new Error(payload.error?.message ?? '视频生成失败')
    }
  }
  throw new Error('视频生成超时')
}

function pickVideoUrl(payload: TaskPayload): string | undefined {
  return (
    payload.url ??
    payload.video_url ??
    payload.video?.url ??
    payload.data?.[0]?.url ??
    payload.data?.[0]?.video?.url
  )
}

async function resolveVideoData(urlOrData: string): Promise<string> {
  if (urlOrData.startsWith('data:')) return urlOrData
  return fetchUrlAsDataURL(urlOrData)
}
