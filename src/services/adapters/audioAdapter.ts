/**
 * 语音合成适配器
 * —— 用于镜头配音（旁白 / 对白）。OpenAI TTS 兼容协议。
 */
import type { AudioModelConfig } from '@/types'
import { blobToDataURL } from '../utils'
import { buildUrl, ensureOk, request, resolveProvider, type AdapterContext } from './http'

export interface AudioOptions {
  model: AudioModelConfig
  text: string
  voice?: string
  outputFormat?: 'mp3' | 'wav'
  signal?: AbortSignal
}

/** 合成语音，返回 base64 data url */
export async function generateAudio(
  ctx: AdapterContext,
  opts: AudioOptions,
): Promise<string> {
  const provider = resolveProvider(ctx, opts.model.providerId)
  const endpoint = opts.model.endpoint ?? '/v1/audio/speech'
  const url = buildUrl(provider.baseUrl, endpoint)

  const body = JSON.stringify({
    model: opts.model.modelName,
    input: opts.text,
    voice: opts.voice ?? 'alloy',
    response_format: opts.outputFormat ?? 'mp3',
  })

  const res = await request(url, provider.apiKey, { body, signal: opts.signal })
  await ensureOk(res, '语音合成')
  const blob = await res.blob()
  if (blob.size === 0) throw new Error('语音合成返回为空')
  return blobToDataURL(blob)
}
