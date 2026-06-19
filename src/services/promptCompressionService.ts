/**
 * 提示词压缩服务
 * —— 当提示词超长时，用 LLM 压缩（保留 MUST/FORBIDDEN 等关键约束），失败回退原文。
 */
import { chatJSON, type AdapterContext } from './adapters'
import type { ChatModelConfig } from '@/types'

export async function compressPromptWithLLM(
  ctx: AdapterContext,
  model: ChatModelConfig,
  text: string,
  maxChars: number,
): Promise<string> {
  if (text.length <= maxChars) return text
  try {
    const result = await chatJSON<{ compressed?: string }>(ctx, {
      model,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `你是提示词压缩器。压缩图像/视频提示词，必须保留：关键视觉要素、风格词、硬约束(MUST/DO NOT/FORBIDDEN/负面词)。去除冗余形容词与重复。输出 JSON {"compressed":"..."}，压缩后不超过 ${maxChars} 字符。若无法压缩则原样返回。`,
        },
        { role: 'user', content: text },
      ],
    })
    const compressed = (result.compressed ?? '').trim()
    return compressed && compressed.length < text.length ? compressed : text
  } catch {
    return text
  }
}