/**
 * 镜头操作纯函数
 * —— 首帧 / 尾帧 / 视频片段 / 配音 的生成逻辑（不触碰状态）。
 *   供 useShotActions（单镜头）与 StageDirector（批量）共用，遵循 DRY。
 */
import type {
  AspectRatio,
  AudioModelConfig,
  ChatModelConfig,
  ImageModelConfig,
  ScriptData,
  Shot,
  VideoModelConfig,
} from '@/types'
import { generateAudio, generateImage, generateVideo, type AdapterContext } from './adapters'
import { DEFAULT_NEGATIVE_PROMPT } from './promptTemplateService'
import { compressPromptWithLLM } from './promptCompressionService'

/** 组合「场景 + 出场角色 + 动作 + 美术指导」为镜头提示词 */
export function buildShotPrompt(shot: Shot, sd: ScriptData | null): string {
  if (!sd) return shot.actionSummary
  const scene = sd.scenes.find((s) => s.id === shot.sceneId)
  const chars = shot.characters
    .map((id) => sd.characters.find((c) => c.id === id))
    .filter(Boolean)
  return [
    scene?.visualPrompt,
    scene?.atmosphere,
    ...chars.map((c) => c?.visualPrompt),
    shot.actionSummary,
    shot.shotSize && `shot size: ${shot.shotSize}`,
    shot.cameraMovement && `camera movement: ${shot.cameraMovement}`,
    sd.artDirection?.visualStyle && `visual style: ${sd.artDirection.visualStyle}`,
    sd.artDirection?.consistencyAnchors,
  ]
    .filter(Boolean)
    .join(', ')
}

/** 生成首帧（以场景概念图为参考约束） */
export async function generateStartFrame(
  ctx: AdapterContext,
  shot: Shot,
  sd: ScriptData | null,
  model: ImageModelConfig,
  aspect: AspectRatio,
  chatModel?: ChatModelConfig,
): Promise<string> {
  const scene = sd?.scenes.find((s) => s.id === shot.sceneId)
  let prompt = buildShotPrompt(shot, sd)
  // 超 4500 字符触发 LLM 压缩，避免超出模型上限被截断
  if (chatModel && prompt.length > 4500) {
    prompt = await compressPromptWithLLM(ctx, chatModel, prompt, 4500)
  }
  return generateImage(ctx, {
    model,
    prompt,
    aspect,
    negative: DEFAULT_NEGATIVE_PROMPT,
    referenceImage: scene?.referenceImage,
  })
}

/** 生成尾帧（以首帧为参考，提示词追加结束状态） */
export async function generateEndFrame(
  ctx: AdapterContext,
  shot: Shot,
  sd: ScriptData | null,
  model: ImageModelConfig,
  aspect: AspectRatio,
  chatModel?: ChatModelConfig,
): Promise<string> {
  const start = shot.keyframes.find((k) => k.type === 'start')
  let prompt = `${buildShotPrompt(shot, sd)}, ending state of the action`
  if (chatModel && prompt.length > 4500) {
    prompt = await compressPromptWithLLM(ctx, chatModel, prompt, 4500)
  }
  return generateImage(ctx, {
    model,
    prompt,
    aspect,
    negative: DEFAULT_NEGATIVE_PROMPT,
    referenceImage: start?.imageUrl,
  })
}

/** 生成视频片段（首帧 / 首尾帧插值；onProgress 用于轮询进度反馈） */
export async function generateVideoClip(
  ctx: AdapterContext,
  shot: Shot,
  sd: ScriptData | null,
  model: VideoModelConfig,
  aspect: AspectRatio,
  onProgress?: (status: string) => void,
): Promise<string> {
  const start = shot.keyframes.find((k) => k.type === 'start')
  const end = shot.keyframes.find((k) => k.type === 'end')
  if (!start?.imageUrl) throw new Error('请先生成首帧')
  return generateVideo(ctx, {
    model,
    prompt: buildShotPrompt(shot, sd),
    startImage: start.imageUrl,
    endImage: end?.imageUrl,
    aspect,
    onProgress: (info) => onProgress?.(info.status),
  })
}

/** 生成配音 */
export async function generateDubbing(
  ctx: AdapterContext,
  text: string,
  model: AudioModelConfig,
  voice?: string,
): Promise<string> {
  return generateAudio(ctx, { model, text, voice })
}
