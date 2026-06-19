/**
 * AI 剧本服务
 * —— 将原始故事文本拆解为结构化剧本数据，并基于叙事节拍规划镜头。
 *
 * 两阶段：
 *   1) parseScript     —— 产出角色/场景/道具/故事节拍 + 美术指导
 *   2) generateShots   —— 基于节拍与目标时长拆分为镜头（含景别/运镜/角色引用）
 *
 * 为保证跨实体引用一致，要求 AI 使用稳定 `ref` 标识，解析时统一映射为实体 id。
 */
import type {
  ArtDirection,
  ChatModelConfig,
  Character,
  Prop,
  Scene,
  ScriptData,
  Shot,
} from '@/types'
import { chat, chatJSON, type AdapterContext } from './adapters'
import { hashText } from './utils'
import { createCharacter, createProp, createScene, createShot } from './factory'

export interface ParseScriptInput {
  rawScript: string
  language: string
  visualStyle: string
  targetDuration: string
  chatModel: ChatModelConfig
}

interface RawCharacter {
  ref: string
  name: string
  gender?: string
  age?: string
  personality?: string
  coreFeatures?: string
  visualPrompt?: string
}
interface RawScene {
  ref: string
  name: string
  location?: string
  time?: string
  atmosphere?: string
  visualPrompt?: string
}
interface RawProp {
  ref: string
  name: string
  category?: string
  description?: string
  visualPrompt?: string
}
interface RawBeat {
  ref: number
  text: string
  sceneRef: string
}
interface ParseScriptResult {
  title: string
  genre: string
  logline: string
  characters: RawCharacter[]
  scenes: RawScene[]
  props: RawProp[]
  storyBeats: RawBeat[]
  artDirection: ArtDirection
}

const PARSE_SYSTEM = `你是顶尖的漫剧编剧与分镜规划师，精通将故事文本工业化拆解为漫剧制作所需的资产结构。
请严格输出 JSON，字段使用与用户一致的语义。角色/场景/道具必须各自带稳定短标识 ref（角色 c1/c2、场景 s1/s2、道具 p1/p2...），故事节拍的 sceneRef 必须引用某个场景的 ref。
视觉提示词(visualPrompt)用英文、Midjourney/SD 风格关键词，强调可复现的视觉特征。`

/** 阶段一：解析剧本结构 + 美术指导 */
export async function parseScript(
  ctx: AdapterContext,
  input: ParseScriptInput,
): Promise<ScriptData> {
  const user = [
    `【原始故事】\n${input.rawScript}`,
    `【语言】${input.language}`,
    `【视觉风格】${input.visualStyle}`,
    `【目标时长】${input.targetDuration}`,
    ``,
    `请输出如下 JSON 结构：`,
    JSON.stringify(
      {
        title: '作品标题',
        genre: '类型',
        logline: '一句话故事梗概',
        characters: [
          { ref: 'c1', name: '', gender: '', age: '', personality: '', coreFeatures: '', visualPrompt: '' },
        ],
        scenes: [
          { ref: 's1', name: '', location: '', time: '', atmosphere: '', visualPrompt: '' },
        ],
        props: [
          { ref: 'p1', name: '', category: '', description: '', visualPrompt: '' },
        ],
        storyBeats: [{ ref: 1, text: '叙事节拍描述', sceneRef: 's1' }],
        artDirection: {
          visualStyle: '',
          colorPalette: { primary: '', secondary: '', accent: '', skinTones: '', saturation: '', temperature: '' },
          characterDesignRules: { proportions: '', eyeStyle: '', lineWeight: '', detailLevel: '' },
          lightingStyle: '',
          textureStyle: '',
          moodKeywords: [''],
          consistencyAnchors: '一段统一风格的视觉锚点描述',
        },
      },
      null,
      2,
    ),
  ].join('\n')

  const raw = await chatJSON<ParseScriptResult>(ctx, {
    model: input.chatModel,
    temperature: 0.7,
    messages: [
      { role: 'system', content: PARSE_SYSTEM },
      { role: 'user', content: user },
    ],
  })

  return mapParseResult(raw, input)
}

function mapParseResult(raw: ParseScriptResult, input: ParseScriptInput): ScriptData {
  // ref -> 实体 id 映射
  const charIdByRef = new Map<string, string>()
  const sceneIdByRef = new Map<string, string>()
  const propIdByRef = new Map<string, string>()

  const characters: Character[] = (raw.characters ?? []).map((c) => {
    const ch = createCharacter({
      name: c.name,
      gender: c.gender,
      age: c.age,
      personality: c.personality,
      coreFeatures: c.coreFeatures,
      visualPrompt: c.visualPrompt,
    })
    charIdByRef.set(c.ref, ch.id)
    return ch
  })

  const scenes: Scene[] = (raw.scenes ?? []).map((s) => {
    const sc = createScene({
      name: s.name,
      location: s.location,
      time: s.time,
      atmosphere: s.atmosphere,
      visualPrompt: s.visualPrompt,
    })
    sceneIdByRef.set(s.ref, sc.id)
    return sc
  })

  const props: Prop[] = (raw.props ?? []).map((p) => {
    const pr = createProp({
      name: p.name,
      category: p.category,
      description: p.description,
      visualPrompt: p.visualPrompt,
    })
    propIdByRef.set(p.ref, pr.id)
    return pr
  })

  const storyBeats = (raw.storyBeats ?? []).map((b) => ({
    id: b.ref,
    text: b.text,
    sceneRefId: sceneIdByRef.get(b.sceneRef) ?? scenes[0]?.id ?? '',
  }))

  return {
    title: raw.title || '未命名',
    genre: raw.genre || '',
    logline: raw.logline || '',
    targetDuration: input.targetDuration,
    language: input.language,
    visualStyle: input.visualStyle,
    artDirection: raw.artDirection,
    characters,
    scenes,
    props,
    storyBeats,
    generationMeta: { generatedAt: Date.now() },
  }
}

// ---------------------------------------------------------------------------
// 阶段二：镜头拆分
// ---------------------------------------------------------------------------

export interface GenerateShotsInput {
  scriptData: ScriptData
  targetDuration: string
  chatModel: ChatModelConfig
}

interface RawShot {
  sceneRef?: string
  beatRef?: number
  index: number
  actionSummary: string
  dialogue?: string
  cameraMovement?: string
  shotSize?: string
  characters?: string[]
  props?: string[]
}

const SHOTS_SYSTEM = `你是漫剧分镜师。根据给定的故事节拍与场景/角色/道具，规划出连续的镜头列表。
严格输出 JSON 数组。每个镜头需指定：所属场景(sceneRef，引用场景 ref)、动作摘要(actionSummary)、可选台词(dialogue)、运镜(cameraMovement)、景别(shotSize)、出场的角色 ref 列表(characters)、相关道具 ref 列表(props)。
根据目标时长合理控制镜头数量与节奏。`

/** 基于节拍生成镜头序列 */
export async function generateShots(
  ctx: AdapterContext,
  input: GenerateShotsInput,
): Promise<Shot[]> {
  const { scriptData } = input

  // 为 AI 构造反向映射：实体 id -> ref
  const sceneRefById = new Map<string, string>()
  scriptData.scenes.forEach((s, i) => sceneRefById.set(s.id, `s${i + 1}`))
  const charRefById = new Map<string, string>()
  scriptData.characters.forEach((c, i) => charRefById.set(c.id, `c${i + 1}`))
  const propRefById = new Map<string, string>()
  scriptData.props.forEach((p, i) => propRefById.set(p.id, `p${i + 1}`))

  const payload = {
    targetDuration: input.targetDuration,
    visualStyle: scriptData.visualStyle,
    scenes: scriptData.scenes.map((s, i) => ({
      ref: `s${i + 1}`,
      name: s.name,
      location: s.location,
    })),
    characters: scriptData.characters.map((c, i) => ({
      ref: `c${i + 1}`,
      name: c.name,
    })),
    props: scriptData.props.map((p, i) => ({ ref: `p${i + 1}`, name: p.name })),
    storyBeats: scriptData.storyBeats.map((b) => {
      const sceneIdx = scriptData.scenes.findIndex((s) => s.id === b.sceneRefId)
      return { text: b.text, sceneRef: sceneIdx >= 0 ? `s${sceneIdx + 1}` : '' }
    }),
  }

  const raw = await chatJSON<RawShot[]>(ctx, {
    model: input.chatModel,
    temperature: 0.6,
    messages: [
      { role: 'system', content: SHOTS_SYSTEM },
      {
        role: 'user',
        content: `请基于以下剧本数据规划镜头，输出 JSON 数组：\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  })

  return (raw ?? []).map((r) => {
    const sceneIdx = r.sceneRef ? Number(r.sceneRef.replace(/\D/g, '')) - 1 : -1
    const sceneId =
      sceneIdx >= 0 ? scriptData.scenes[sceneIdx]?.id ?? '' : scriptData.scenes[0]?.id ?? ''
    return createShot({
      sceneId,
      index: r.index,
      actionSummary: r.actionSummary,
      dialogue: r.dialogue,
      cameraMovement: r.cameraMovement,
      shotSize: r.shotSize,
      characters: (r.characters ?? [])
        .map((ref) => scriptData.characters[Number(ref.replace(/\D/g, '')) - 1]?.id)
        .filter(Boolean) as string[],
      props: (r.props ?? [])
        .map((ref) => scriptData.props[Number(ref.replace(/\D/g, '')) - 1]?.id)
        .filter(Boolean) as string[],
    })
  })
}

// ===========================================================================
// 剧本续写 / 改写 / 图推断风格 / 场景指纹缓存
// ===========================================================================

/** 续写剧本（自然衔接，保持人设风格） */
export async function continueScript(
  ctx: AdapterContext,
  input: { rawScript: string; maxChars: number; chatModel: ChatModelConfig },
): Promise<string> {
  return chat(ctx, {
    model: input.chatModel,
    temperature: 0.8,
    messages: [
      { role: 'system', content: '你是漫剧编剧。续写用户的故事，保持风格与人设一致，自然衔接。只输出续写的新内容，不要重复原文。' },
      { role: 'user', content: `原文：\n${input.rawScript}\n\n请续写（不超过 ${input.maxChars} 字）：` },
    ],
  })
}

/** 按指令改写剧本 */
export async function rewriteScript(
  ctx: AdapterContext,
  input: { rawScript: string; instruction: string; chatModel: ChatModelConfig },
): Promise<string> {
  return chat(ctx, {
    model: input.chatModel,
    temperature: 0.7,
    messages: [
      { role: 'system', content: '你是漫剧编剧。按用户指令改写故事。只输出改写后的完整内容。' },
      { role: 'user', content: `原文：\n${input.rawScript}\n\n改写指令：${input.instruction}` },
    ],
  })
}

/** 多模态：从参考图推断视觉风格 */
export async function inferVisualStyleFromImage(
  ctx: AdapterContext,
  input: { image: string; chatModel: ChatModelConfig },
): Promise<{ stylePrompt: string; styleLabel: string; reason: string }> {
  const result = await chatJSON<{ stylePrompt?: string; styleLabel?: string; reason?: string }>(ctx, {
    model: input.chatModel,
    temperature: 0.3,
    messages: [
      { role: 'system', content: '分析图像的视觉风格，输出 JSON：{stylePrompt(英文生图风格关键词), styleLabel(中文风格标签), reason(简短理由)}' },
      {
        role: 'user',
        content: [
          { type: 'text', text: '分析这张图的视觉风格' },
          { type: 'image_url', image_url: { url: input.image } },
        ],
      },
    ],
  })
  return {
    stylePrompt: result.stylePrompt ?? 'anime style',
    styleLabel: result.styleLabel ?? '动漫',
    reason: result.reason ?? '',
  }
}

/**
 * 场景指纹（djb2 哈希）：用于分镜增量缓存——剧本某场景未变则复用旧分镜，避免重复调用 AI。
 */
export function buildSceneReuseSignature(input: {
  location?: string
  time?: string
  atmosphere?: string
  actionText: string
  shotsPerScene: number
  visualStyle: string
  language: string
  model: string
}): string {
  const env = [input.location, input.time, input.atmosphere].filter(Boolean).join('|')
  const payload = `${env}::${hashText(input.actionText)}::${input.shotsPerScene}::${input.visualStyle}::${input.language}::${input.model}`
  return `scene-${hashText(payload)}`
}
