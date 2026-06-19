/**
 * 视频生成适配器
 * —— 关键帧驱动的帧间插值，兼容三种调度协议：
 *   · seedance：字节火山引擎（异步提交 + 轮询），图生视频 / 文生视频
 *   · sora    ：OpenAI Videos（异步提交 + 轮询）
 *   · veo     ：通用同步优先（无 id 时回退轮询）
 */
import type { AspectRatio, VideoModelConfig } from '@/types'
import { fetchUrlAsDataURL, parseJsonResponse, sleep } from '../utils'
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

/** 按 model.type 分发到对应协议 */
export async function generateVideo(
  ctx: AdapterContext,
  opts: VideoOptions,
): Promise<string> {
  return opts.model.type === 'seedance'
    ? generateSeedance(ctx, opts)
    : generateGeneric(ctx, opts)
}

// ---------------------------------------------------------------- Seedance（火山）

interface SeedanceTaskResult {
  id?: string
  status?: string
  content?: { video_url?: string; segments?: { video_url?: string }[] }
  error?: { message?: string }
}

async function generateSeedance(ctx: AdapterContext, opts: VideoOptions): Promise<string> {
  const provider = resolveProvider(ctx, opts.model.providerId)
  const endpoint = opts.model.endpoint ?? '/api/v3/contents/generations/tasks'
  const submitUrl = buildUrl(provider.baseUrl, endpoint)

  const content: Array<Record<string, unknown>> = [{ type: 'text', text: opts.prompt }]
  if (opts.startImage) {
    content.push({ type: 'image_url', image_url: { url: opts.startImage } })
  }
  if (opts.endImage) {
    content.push({ type: 'image_url', image_url: { url: opts.endImage } })
  }
  const bodyObj: Record<string, unknown> = { model: opts.model.modelName, content }
  if (opts.duration) bodyObj.duration = String(opts.duration)
  if (opts.aspect) bodyObj.ratio = opts.aspect

  const res = await request(submitUrl, provider.apiKey, {
    body: JSON.stringify(bodyObj),
    signal: opts.signal,
  })
  await ensureOk(res, 'Seedance 任务提交')
  const data = await parseJsonResponse<{ id?: string }>(res)
  const taskId = data.id
  if (!taskId) throw new Error('Seedance 未返回任务 ID')
  opts.onProgress?.({ status: 'queued' })
  return pollSeedance(provider, endpoint, taskId, opts)
}

async function pollSeedance(
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
    await ensureOk(res, 'Seedance 任务查询')
    const payload = await parseJsonResponse<SeedanceTaskResult>(res)
    const status = (payload.status ?? '').toLowerCase()
    opts.onProgress?.({ status, raw: payload })

    if (['succeeded', 'success', 'completed'].includes(status)) {
      const url = pickSeedanceVideo(payload)
      if (!url) throw new Error('Seedance 完成但未返回视频地址')
      return resolveVideoData(url)
    }
    if (['failed', 'error'].includes(status)) {
      throw new Error(payload.error?.message ?? 'Seedance 视频生成失败')
    }
  }
  throw new Error('Seedance 视频生成超时')
}

function pickSeedanceVideo(payload: SeedanceTaskResult): string | undefined {
  return payload.content?.video_url ?? payload.content?.segments?.[0]?.video_url
}

// ---------------------------------------------------------------- 通用（sora / veo）

interface GenericTaskPayload {
  id?: string
  task_id?: string
  data?: { id?: string; url?: string; video?: { url?: string }; status?: string }[]
  video?: { url?: string }
  url?: string
  status?: string
}

async function generateGeneric(ctx: AdapterContext, opts: VideoOptions): Promise<string> {
  const provider = resolveProvider(ctx, opts.model.providerId)
  const endpoint = opts.model.endpoint ?? '/v1/videos'
  const submitUrl = buildUrl(provider.baseUrl, endpoint)

  const res = await request(submitUrl, provider.apiKey, {
    body: JSON.stringify(buildSubmitBody(opts)),
    signal: opts.signal,
  })
  await ensureOk(res, '视频任务提交')
  const data = await parseJsonResponse<GenericTaskPayload>(res)

  // 同步直接返回
  const direct = pickVideoUrl(data)
  if (direct) return resolveVideoData(direct)

  // 异步轮询
  const taskId = data.id ?? data.task_id ?? data.data?.[0]?.id
  if (!taskId) throw new Error('视频任务未返回任务 ID，且无直接视频结果')
  opts.onProgress?.({ status: 'processing' })
  return pollGeneric(provider, endpoint, taskId, opts)
}

async function pollGeneric(
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
    const payload = await parseJsonResponse<GenericTaskPayload>(res)
    const status = (payload.status ?? payload.data?.[0]?.status ?? 'processing').toLowerCase()
    opts.onProgress?.({ status, raw: payload })

    if (['succeeded', 'completed', 'success'].includes(status)) {
      const url = pickVideoUrl(payload)
      if (!url) throw new Error('视频任务完成但未返回视频地址')
      return resolveVideoData(url)
    }
    if (['failed', 'error'].includes(status)) throw new Error('视频生成失败')
  }
  throw new Error('视频生成超时')
}

function buildSubmitBody(opts: VideoOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: opts.model.modelName,
    prompt: opts.prompt,
  }
  if (opts.duration) body.duration = opts.duration
  if (opts.aspect) body.aspect_ratio = opts.aspect
  if (opts.startImage) body.first_frame_image = stripDataPrefix(opts.startImage)
  if (opts.endImage) body.last_frame_image = stripDataPrefix(opts.endImage)
  return body
}

function pickVideoUrl(payload: GenericTaskPayload): string | undefined {
  return (
    payload.url ??
    payload.video?.url ??
    payload.data?.[0]?.url ??
    payload.data?.[0]?.video?.url
  )
}

async function resolveVideoData(urlOrData: string): Promise<string> {
  if (urlOrData.startsWith('data:')) return urlOrData
  return fetchUrlAsDataURL(urlOrData)
}

function stripDataPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(',')
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl
}
