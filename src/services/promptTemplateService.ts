/**
 * 提示词模板服务
 * —— 提供可编辑的提示词模板默认值、镜头参数参考库与占位符渲染。
 */

/** 32 种运镜参考（中英） */
export const CAMERA_MOVEMENTS: { value: string; label: string }[] = [
  { value: 'static', label: '静止' },
  { value: 'pan', label: '摇镜（水平）' },
  { value: 'tilt', label: '俯仰（垂直）' },
  { value: 'zoom in', label: '推（放大）' },
  { value: 'zoom out', label: '拉（缩小）' },
  { value: 'dolly', label: '移镜' },
  { value: 'track', label: '跟拍' },
  { value: 'crane', label: '升降' },
  { value: 'handheld', label: '手持' },
  { value: 'orbit', label: '环绕' },
  { value: 'dolly zoom', label: '滑动变焦' },
  { value: 'over the shoulder', label: '过肩' },
  { value: 'pov', label: '第一人称' },
  { value: "bird's eye", label: '鸟瞰' },
  { value: 'worm\'s eye', label: '虫眼' },
  { value: 'canted', label: '倾斜' },
]

/** 景别参考 */
export const SHOT_SIZES: { value: string; label: string }[] = [
  { value: 'extreme close-up', label: '大特写' },
  { value: 'close-up', label: '特写' },
  { value: 'medium', label: '中景' },
  { value: 'full', label: '全景' },
  { value: 'wide', label: '远景' },
  { value: 'establishing', label: '建立镜头' },
]

/** 默认负面提示词 */
export const DEFAULT_NEGATIVE_PROMPT =
  'lowres, bad anatomy, bad hands, extra fingers, deformed, blurry, watermark, text, signature, jpeg artifacts'

/** 可编辑模板配置 */
export interface PromptTemplateConfig {
  storyboardSystem: string
  keyframeGuide: string
  videoPromptPrefix: string
  negativePrompt: string
}

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplateConfig = {
  storyboardSystem:
    '你是专业漫剧分镜师。根据故事节拍规划连续镜头，每镜头指定景别、运镜、出场角色与动作。',
  keyframeGuide:
    'maintain character consistency, cinematic composition, sharp focus, high detail',
  videoPromptPrefix: 'cinematic motion, smooth transition, 24fps',
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
}

/** 占位符渲染：{key} → vars[key]，缺失保留原样 */
export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? vars[k] : `{${k}}`))
}
