/**
 * 镜头分镜辅助服务（九宫格）
 * —— 将单镜头拆为多视角面板(4/6/9)，再生成九宫格整图，用于首帧构图选型。
 */
import { chatJSON, generateImage, type AdapterContext } from './adapters'
import type {
  AspectRatio,
  ChatModelConfig,
  ImageModelConfig,
  NineGridPanel,
  ScriptData,
  Shot,
  StoryboardGridPanelCount,
} from '@/types'
import { buildShotPrompt } from './shotActions'

const LAYOUTS: Record<StoryboardGridPanelCount, { rows: number; cols: number }> = {
  4: { rows: 2, cols: 2 },
  6: { rows: 2, cols: 3 },
  9: { rows: 3, cols: 3 },
}

export function resolveGridLayout(panelCount: StoryboardGridPanelCount) {
  return { panelCount, ...LAYOUTS[panelCount] }
}

/** AI 拆分镜头为 N 个视角面板描述 */
export async function generateNineGridPanels(
  ctx: AdapterContext,
  input: {
    shot: Shot
    sd: ScriptData
    panelCount: StoryboardGridPanelCount
    chatModel: ChatModelConfig
  },
): Promise<NineGridPanel[]> {
  const { shot, sd, panelCount, chatModel } = input
  const basePrompt = buildShotPrompt(shot, sd)
  const result = await chatJSON<{ panels?: NineGridPanel[] }>(ctx, {
    model: chatModel,
    temperature: 0.6,
    messages: [
      {
        role: 'system',
        content: `你是分镜师。把一个镜头拆成 ${panelCount} 个视角面板（不同景别/机位），每面板英文描述 10-30 词，视角尽量多样。输出 JSON {panels:[{index, shotSize, cameraAngle, description}]}。`,
      },
      { role: 'user', content: `镜头：${basePrompt}\n面板数：${panelCount}` },
    ],
  })
  return (result.panels ?? []).slice(0, panelCount).map((p, i) => ({ ...p, index: i }))
}

/** 拼接面板描述生成九宫格整图（零文字硬约束） */
export async function generateNineGridImage(
  ctx: AdapterContext,
  input: {
    panels: NineGridPanel[]
    imageModel: ImageModelConfig
    aspect?: AspectRatio
    anchor?: string
  },
): Promise<string> {
  const descriptions = input.panels
    .map((p) => `Panel ${p.index + 1}: ${p.description}`)
    .join('\n')
  const prompt = [
    input.anchor,
    `storyboard grid of ${input.panels.length} panels arranged in a grid`,
    'absolutely no text, no captions, no speech bubbles',
    descriptions,
  ]
    .filter(Boolean)
    .join('\n')
  return generateImage(ctx, { model: input.imageModel, prompt, aspect: '1:1' })
}
