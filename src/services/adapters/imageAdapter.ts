/**
 * 图像生成适配器
 * —— 支持文生图与图生图(image edit)，兼容 OpenAI 协议与 Gemini 原生两种形态。
 *   用于关键帧、角色定妆图、场景概念图、道具参考图。
 */
import type { AspectRatio, ImageModelConfig } from '@/types'
import {
  aspectToSize,
  dataURLToBytes,
  fetchUrlAsDataURL,
  parseJsonResponse,
} from '../utils'
import { buildUrl, ensureOk, request, resolveProvider, type AdapterContext } from './http'

export interface ImageOptions {
  model: ImageModelConfig
  prompt: string
  negative?: string
  aspect?: AspectRatio
  /** 参考图 base64 data url：提供时启用图生图(image edit) */
  referenceImage?: string
  signal?: AbortSignal
}

interface OpenAIImageResponse {
  data?: { b64_json?: string; url?: string }[]
}

/** 生成图像（referenceImage 存在时自动走图生图），返回 base64 data url */
export async function generateImage(
  ctx: AdapterContext,
  opts: ImageOptions,
): Promise<string> {
  return (opts.model.type ?? 'openai') === 'gemini'
    ? generateWithGemini(ctx, opts)
    : generateWithOpenAI(ctx, opts)
}

// ---------------------------------------------------------------- OpenAI 兼容

async function generateWithOpenAI(
  ctx: AdapterContext,
  opts: ImageOptions,
): Promise<string> {
  const provider = resolveProvider(ctx, opts.model.providerId)
  const aspect = opts.aspect ?? '16:9'
  const fullPrompt = opts.negative ? `${opts.prompt}\n\nAvoid: ${opts.negative}` : opts.prompt

  return opts.referenceImage
    ? openAIImageEdit(provider, opts.model, fullPrompt, aspect, opts.referenceImage, opts.signal)
    : openAITextToImage(provider, opts.model, fullPrompt, aspect, opts.signal)
}

/** 文生图：/v1/images/generations */
async function openAITextToImage(
  provider: { baseUrl: string; apiKey: string },
  model: ImageModelConfig,
  prompt: string,
  aspect: string,
  signal?: AbortSignal,
): Promise<string> {
  const endpoint = model.endpoint ?? '/v1/images/generations'
  const url = buildUrl(provider.baseUrl, endpoint)
  const body = JSON.stringify({
    model: model.modelName,
    prompt,
    n: 1,
    size: aspectToSize(aspect),
    response_format: 'b64_json',
  })
  const res = await request(url, provider.apiKey, { body, signal })
  await ensureOk(res, '文生图')
  return pickOpenAIImage(await parseJsonResponse<OpenAIImageResponse>(res))
}

/** 图生图：/v1/images/edits（multipart 上传参考图 + prompt） */
async function openAIImageEdit(
  provider: { baseUrl: string; apiKey: string },
  model: ImageModelConfig,
  prompt: string,
  aspect: string,
  referenceImage: string,
  signal?: AbortSignal,
): Promise<string> {
  const endpoint = model.endpoint
    ? model.endpoint.replace('generations', 'edits')
    : '/v1/images/edits'
  const url = buildUrl(provider.baseUrl, endpoint)
  const { bytes } = dataURLToBytes(referenceImage)

  const form = new FormData()
  form.append('model', model.modelName)
  form.append('prompt', prompt)
  form.append('n', '1')
  form.append('size', aspectToSize(aspect))
  form.append('response_format', 'b64_json')
  form.append('image', new Blob([bytes], { type: 'image/png' }), 'reference.png')

  // multipart 由浏览器自动设置 Content-Type 与 boundary，仅附加鉴权头
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider.apiKey}` },
    body: form,
    signal,
  })
  await ensureOk(res, '图生图')
  return pickOpenAIImage(await parseJsonResponse<OpenAIImageResponse>(res))
}

async function pickOpenAIImage(data: OpenAIImageResponse): Promise<string> {
  const item = data.data?.[0]
  if (!item) throw new Error('图像生成返回为空')
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`
  if (item.url) return fetchUrlAsDataURL(item.url)
  throw new Error('图像生成未返回图片数据')
}

// ---------------------------------------------------------------- Gemini 原生

async function generateWithGemini(
  ctx: AdapterContext,
  opts: ImageOptions,
): Promise<string> {
  const provider = resolveProvider(ctx, opts.model.providerId)
  const endpoint =
    opts.model.endpoint ?? `/v1beta/models/${opts.model.modelName}:generateContent`
  const url = buildUrl(provider.baseUrl, endpoint)

  const parts: Array<Record<string, unknown>> = [{ text: opts.prompt }]
  // 图生图：在 parts 前置参考图
  if (opts.referenceImage) {
    const [meta, b64] = opts.referenceImage.split(',')
    const mime = /data:(.*?);/.exec(meta)?.[1] ?? 'image/png'
    parts.unshift({ inlineData: { mimeType: mime, data: b64 } })
  }

  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  })
  // 统一 Bearer 鉴权（new-api 对 /v1beta/* 走 TokenAuth）+ JSON 提交
  const res = await request(url, provider.apiKey, { body, signal: opts.signal })
  await ensureOk(res, '图像生成(Gemini)')
  const data = await parseJsonResponse<{
    candidates?: {
      content?: {
        parts?: { inlineData?: { mimeType?: string; data?: string } }[]
      }
    }[]
  }>(res)
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
  const inline = part?.inlineData
  if (!inline?.data) throw new Error('Gemini 图像生成未返回图片数据')
  return `data:${inline.mimeType ?? 'image/png'};base64,${inline.data}`
}
