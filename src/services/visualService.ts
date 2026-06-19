/**
 * 视觉风格服务
 * —— 独立的美术指导生成、批量角色视觉提示词、角色九宫格(turnaround)多视角。
 */
import { chatJSON, generateImage, type AdapterContext } from './adapters'
import type {
  ArtDirection,
  AspectRatio,
  Character,
  ChatModelConfig,
  ImageModelConfig,
} from '@/types'

function normalizeArtDirection(raw: Partial<ArtDirection>, visualStyle: string): ArtDirection {
  return {
    visualStyle,
    colorPalette: {
      primary: '', secondary: '', accent: '', skinTones: '', saturation: '', temperature: '',
      ...(raw.colorPalette ?? {}),
    },
    characterDesignRules: {
      proportions: '', eyeStyle: '', lineWeight: '', detailLevel: '',
      ...(raw.characterDesignRules ?? {}),
    },
    lightingStyle: raw.lightingStyle ?? '',
    textureStyle: raw.textureStyle ?? '',
    moodKeywords: raw.moodKeywords ?? [],
    consistencyAnchors: raw.consistencyAnchors ?? '',
  }
}

/** 生成全局美术指导文档（统一全片视觉风格） */
export async function generateArtDirection(
  ctx: AdapterContext,
  input: { scriptText: string; visualStyle: string; language: string; chatModel: ChatModelConfig },
): Promise<ArtDirection> {
  const result = await chatJSON<Partial<ArtDirection>>(ctx, {
    model: input.chatModel,
    temperature: 0.6,
    messages: [
      {
        role: 'system',
        content: '你是美术指导。为漫剧生成统一视觉风格的美术指导文档，输出 JSON：{colorPalette{primary,secondary,accent,skinTones,saturation,temperature}, characterDesignRules{proportions,eyeStyle,lineWeight,detailLevel}, lightingStyle, textureStyle, moodKeywords[], consistencyAnchors(80-120词英文主风格段)}。',
      },
      { role: 'user', content: `故事：${input.scriptText}\n视觉风格：${input.visualStyle}\n语言：${input.language}` },
    ],
  })
  return normalizeArtDirection(result, input.visualStyle)
}

/** 批量生成角色视觉提示词（6点结构，风格统一但视觉可区分） */
export async function generateAllCharacterPrompts(
  ctx: AdapterContext,
  input: { characters: Character[]; visualStyle: string; chatModel: ChatModelConfig },
): Promise<Record<string, string>> {
  if (input.characters.length === 0) return {}
  const result = await chatJSON<{ characters?: { ref: string; visualPrompt: string }[] }>(ctx, {
    model: input.chatModel,
    temperature: 0.6,
    messages: [
      {
        role: 'system',
        content: '为每个角色生成英文视觉提示词，结构：Core Identity / Facial / Hairstyle / Clothing / Pose / Technical Quality。所有角色风格统一但视觉可区分。输出 JSON {characters:[{ref, visualPrompt}]}，ref 引用输入的 ref。',
      },
      {
        role: 'user',
        content: JSON.stringify(
          input.characters.map((c, i) => ({ ref: `c${i + 1}`, name: c.name, personality: c.personality, coreFeatures: c.coreFeatures })),
        ),
      },
    ],
  })
  const map: Record<string, string> = {}
  input.characters.forEach((c, i) => {
    const found = result.characters?.find((r) => r.ref === `c${i + 1}`)
    if (found?.visualPrompt) map[c.id] = found.visualPrompt
  })
  return map
}

const TURNAROUND_VIEWS = [
  'front full body', 'front medium shot', 'front close-up face',
  'left side full body', 'right side full body', 'three-quarter view',
  'back view', 'low angle', 'high angle',
]

/** 生成角色九宫格多视角参考图（character turnaround） */
export async function generateCharacterTurnaround(
  ctx: AdapterContext,
  input: { character: Character; imageModel: ImageModelConfig; aspect?: AspectRatio; anchor?: string },
): Promise<string> {
  const views = TURNAROUND_VIEWS.map((v, i) => `Panel ${i + 1}: ${v}`).join('\n')
  const prompt = [
    input.anchor,
    'character turnaround reference sheet, 9 views in 3x3 grid',
    `character: ${input.character.visualPrompt ?? input.character.name}`,
    'same character in all panels, consistent design',
    'absolutely no text',
    views,
  ].filter(Boolean).join('\n')
  return generateImage(ctx, { model: input.imageModel, prompt, aspect: '1:1' })
}
