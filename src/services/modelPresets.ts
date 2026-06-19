/**
 * 主流模型供应商预设
 * —— 覆盖当前主流的 OpenAI 兼容 / 原生协议模型，支持一键添加与切换。
 *   预设仅作为起点：用户可修改 baseUrl / endpoint / 模型名 / API Key。
 */
import type { ImageModelConfig, VideoModelConfig } from '@/types'

export interface ModelPreset {
  id: string
  name: string
  baseUrl: string
  description: string
  chat?: string[]
  image?: { name: string; type: ImageModelConfig['type'] }[]
  video?: { name: string; type: VideoModelConfig['type'] }[]
  audio?: string[]
}

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    description: 'GPT / DALL·E / Sora / TTS 全栈',
    chat: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
    image: [
      { name: 'gpt-image-1', type: 'openai' },
      { name: 'dall-e-3', type: 'openai' },
    ],
    video: [{ name: 'sora-2', type: 'sora' }],
    audio: ['tts-1', 'tts-1-hd'],
  },
  {
    id: 'volcengine',
    name: '火山引擎(豆包)',
    baseUrl: 'https://ark.cn-beijing.volces.com',
    description: '豆包对话 / Seedream 图像 / Seedance 视频（主力视频）',
    chat: ['doubao-pro-32k', 'doubao-1-5-pro-256k', 'doubao-1-5-lite-32k'],
    image: [{ name: 'doubao-seedream-3-0-t2i-250415', type: 'openai' }],
    video: [
      { name: 'doubao-seedance-1-5-pro-250528', type: 'seedance' },
      { name: 'doubao-seedance-1-5-lite-i2v-250428', type: 'seedance' },
    ],
    audio: ['doubao-tts'],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    description: 'Gemini 对话 / 图像 / Veo 视频（图像走 Gemini 原生）',
    chat: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    image: [{ name: 'gemini-2.5-flash-image', type: 'gemini' }],
    video: [{ name: 'veo-3.1-generate', type: 'veo' }],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    description: '深度推理与对话（OpenAI 兼容）',
    chat: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'moonshot',
    name: 'Moonshot Kimi',
    baseUrl: 'https://api.moonshot.cn',
    description: 'Kimi 长上下文对话（OpenAI 兼容）',
    chat: ['moonshot-v1-8k', 'moonshot-v1-32k', 'kimi-k2-0905-preview'],
  },
  {
    id: 'zhipu',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    description: 'GLM 对话 / CogView 图像',
    chat: ['glm-4-plus', 'glm-4-flash', 'glm-4-air'],
    image: [{ name: 'cogview-3-plus', type: 'openai' }],
  },
  {
    id: 'dashscope',
    name: '阿里通义(DashScope)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
    description: '通义千问对话 / 万相图像（兼容模式）',
    chat: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    image: [{ name: 'wanx2.1-t2i-turbo', type: 'openai' }],
  },
  {
    id: 'siliconflow',
    name: '硅基流动',
    baseUrl: 'https://api.siliconflow.cn',
    description: '开源模型聚合（OpenAI 兼容）',
    chat: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct'],
    image: [{ name: 'Kwai-Kolors/Kolors', type: 'openai' }],
  },
  {
    id: 'antsk',
    name: 'AntSK 聚合',
    baseUrl: 'https://api.antsk.cn',
    description: '多模型聚合代理（GPT/Claude/Gemini/视频）',
    chat: ['gpt-4o', 'claude-3-5-sonnet', 'gemini-2.5-pro'],
    image: [{ name: 'gpt-image-1', type: 'openai' }],
    video: [{ name: 'doubao-seedance-1-5-pro-250528', type: 'seedance' }],
  },
]

/** 按 id 取预设 */
export function getPreset(id: string): ModelPreset | undefined {
  return MODEL_PRESETS.find((p) => p.id === id)
}

/** 聚合所有预设的模型名建议（用于输入框 datalist） */
export function suggestModels(kind: 'chat' | 'image' | 'video' | 'audio'): string[] {
  const set = new Set<string>()
  for (const p of MODEL_PRESETS) {
    if (kind === 'chat') p.chat?.forEach((m) => set.add(m))
    else if (kind === 'image') p.image?.forEach((m) => set.add(m.name))
    else if (kind === 'video') p.video?.forEach((m) => set.add(m.name))
    else p.audio?.forEach((m) => set.add(m))
  }
  return [...set]
}
