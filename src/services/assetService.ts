/**
 * 资产生成服务
 * —— 为角色/场景/道具生成参考图。将「美术指导一致性锚点」注入提示词，
 *   保证全片视觉风格统一（角色不变形、场景光影一致）。
 */
import type {
  ArtDirection,
  AspectRatio,
  ImageModelConfig,
} from '@/types'
import { generateImage, type AdapterContext } from './adapters'

export type AssetImageKind = 'character' | 'scene' | 'prop'

export interface GenerateAssetImageInput {
  imageModel: ImageModelConfig
  aspect: AspectRatio
  kind: AssetImageKind
  visualPrompt?: string
  negative?: string
  artDirection?: ArtDirection
  /** 参考图（以图生图，约束一致性） */
  referenceImage?: string
}

const KIND_HINT: Record<AssetImageKind, string> = {
  character:
    'character reference sheet, full body, clear face, neutral background, concept art, high detail',
  scene:
    'environment concept art, establishing shot, cinematic lighting, wide angle, high detail',
  prop:
    'product reference, isolated on neutral background, centered, studio lighting, high detail',
}

/** 生成资产参考图，返回 base64 data url */
export async function generateAssetImage(
  ctx: AdapterContext,
  input: GenerateAssetImageInput,
): Promise<string> {
  const anchor = input.artDirection?.consistencyAnchors?.trim()
  const parts = [
    input.visualPrompt?.trim(),
    KIND_HINT[input.kind],
    `visual style: ${input.artDirection?.visualStyle ?? 'anime'}`,
    anchor ? `style anchors: ${anchor}` : '',
  ].filter(Boolean)

  const prompt = parts.join(', ')

  return generateImage(ctx, {
    model: input.imageModel,
    prompt,
    negative: input.negative,
    aspect: input.aspect,
    referenceImage: input.referenceImage,
  })
}
