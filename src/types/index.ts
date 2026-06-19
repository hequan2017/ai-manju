/**
 * AI 漫剧平台 —— 核心数据模型
 *
 * 领域架构：漫剧项目(ManjuProject) → 季(Season) → 集(Episode)
 *   · 资产(角色/场景/道具)在项目级「资产库」中共享，保证多集间一致性
 *   · 单集走「剧本 → 资产 → 导演台 → 导出」四阶段工业化工作流
 *   · 镜头采用关键帧驱动(Keyframe-Driven)：先生成首尾帧，再在帧间插值生成视频
 */

// ============================================================================
// 通用基础类型
// ============================================================================

/** 资产生成生命周期状态（用于 loading 持久化与 UI 反馈） */
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed'

/** 资产种类 */
export type AssetKind = 'character' | 'scene' | 'prop'

/** 提示词编辑历史条目（支持回滚） */
export interface PromptVersion {
  id: string
  prompt: string
  createdAt: number
  source: 'ai-generated' | 'manual-edit' | 'rollback' | 'imported' | 'system'
  note?: string
}

/** 横竖屏比例 */
export type AspectRatio = '16:9' | '9:16' | '1:1'

// ============================================================================
// 视觉资产（角色 / 场景 / 道具共享公共字段）
// ============================================================================

/**
 * 视觉资产公共基类。
 * 角色、场景、道具在「提示词 / 参考图 / 版本 / 状态」上结构一致，抽取以遵循 DRY。
 */
export interface VisualAsset {
  id: string
  name: string
  description?: string
  /** 正向视觉提示词（英文/SD 风格） */
  visualPrompt?: string
  /** 负向提示词 */
  negativePrompt?: string
  /** 参考图（base64 data url），作为生成时的强约束 */
  referenceImage?: string
  /** 仅用于轮廓/形状引导的参考图 */
  shapeReferenceImage?: string
  /** 提示词编辑历史 */
  promptVersions?: PromptVersion[]
  /** 当前生成状态 */
  status?: GenerationStatus
  /** 关联到项目资产库的 id（跨集共享时） */
  libraryId?: string
  /** 已同步的资产库版本号 */
  libraryVersion?: number
  /** 自身版本号 */
  version?: number
}

/** 角色九宫格单视角面板 */
export interface CharacterTurnaroundPanel {
  index: number // 0-8
  viewAngle: string // 正面 / 侧面 / 背面 ...
  shotSize: string // 全身 / 半身 / 特写
  description: string
}

/** 角色九宫格造型设计（多视角参考，提升角色一致性） */
export interface CharacterTurnaroundData {
  panels: CharacterTurnaroundPanel[]
  imageUrl?: string
  prompt?: string
  status: GenerationStatus
}

/** 角色造型变体（衣橱系统：日常 / 战斗 / 受伤 ...） */
export interface CharacterVariation extends VisualAsset {
  // 继承 VisualAsset 全部字段；变体复用同一套提示词/参考图结构
}

/** 角色 */
export interface Character extends VisualAsset {
  gender?: string
  age?: string
  personality?: string
  coreFeatures?: string
  variations: CharacterVariation[]
  turnaround?: CharacterTurnaroundData
}

/** 场景 */
export interface Scene extends VisualAsset {
  location?: string
  time?: string
  atmosphere?: string
}

/** 道具（保持多镜头间物品视觉一致性） */
export interface Prop extends VisualAsset {
  category?: string // 武器 / 文件书信 / 食物饮品 / 交通工具 / 装饰品 / 科技设备 / 其他
}

/** 资产库条目（项目级共享资产的统一封装） */
export interface AssetLibraryItem {
  id: string
  kind: AssetKind
  name: string
  data: Character | Scene | Prop
  createdAt: number
  updatedAt: number
}

// ============================================================================
// 美术指导 & 剧本结构
// ============================================================================

/** 全局美术指导文档 —— 统一全片视觉风格 */
export interface ArtDirection {
  visualStyle: string // anime / 3d-animation / live-action / oil-painting ...
  colorPalette: {
    primary: string
    secondary: string
    accent: string
    skinTones: string
    saturation: string
    temperature: string
  }
  characterDesignRules: {
    proportions: string
    eyeStyle: string
    lineWeight: string
    detailLevel: string
  }
  lightingStyle: string
  textureStyle: string
  moodKeywords: string[]
  /** 一致性锚点描述，注入所有提示词生成 */
  consistencyAnchors: string
}

/** 故事段落（剧本拆解后的叙事单元，关联场景） */
export interface StoryBeat {
  id: number
  text: string
  sceneRefId: string
}

/** 剧本结构化数据（AI 拆解 rawScript 的产物） */
export interface ScriptData {
  title: string
  genre: string
  logline: string
  targetDuration?: string
  language?: string
  visualStyle?: string
  artDirection?: ArtDirection
  characters: Character[]
  scenes: Scene[]
  props: Prop[]
  storyBeats: StoryBeat[]
  /** 生成指纹，用于增量重生成时判定缓存是否失效 */
  generationMeta?: {
    structureKey?: string
    visualsKey?: string
    shotsKey?: string
    generatedAt?: number
  }
}

// ============================================================================
// 镜头 & 关键帧（核心：关键帧驱动）
// ============================================================================

/** 关键帧（镜头的起始/结束画面） */
export interface Keyframe {
  id: string
  type: 'start' | 'end'
  visualPrompt: string
  imageUrl?: string // base64
  promptVersions?: PromptVersion[]
  status: GenerationStatus
}

/** 视频片段（首尾帧间插值 / 单图驱动） */
export interface VideoInterval {
  id: string
  startKeyframeId: string
  endKeyframeId?: string
  duration: number
  motionStrength?: number
  videoUrl?: string // base64
  videoPrompt?: string
  promptVersions?: PromptVersion[]
  status: GenerationStatus
}

/** 镜头配音（旁白 / 对白） */
export interface ShotDubbing {
  mode: 'narration' | 'dialogue'
  text: string
  modelId?: string
  voice?: string
  audioUrl?: string // base64
  transcript?: string
  status: GenerationStatus
  error?: string
}

/** 九宫格分镜面板数 */
export type StoryboardGridPanelCount = 4 | 6 | 9

/** 九宫格单视角面板 */
export interface NineGridPanel {
  index: number
  shotSize: string
  cameraAngle: string
  description: string
}

/** 九宫格分镜数据（镜头的多视角预览，可作为首帧构图选型） */
export interface NineGridData {
  panels: NineGridPanel[]
  layout?: { panelCount: StoryboardGridPanelCount; rows: number; cols: number }
  imageUrl?: string
  prompt?: string
  status: GenerationStatus
}

/** 单个镜头 */
export interface Shot {
  id: string
  sceneId: string
  index: number // 镜头序号
  actionSummary: string
  dialogue?: string
  cameraMovement?: string // 推 / 拉 / 摇 / 移 / 跟 ...
  shotSize?: string // 特写 / 近景 / 中景 / 全景 / 远景
  characters: string[] // Character IDs
  characterVariations?: Record<string, string> // characterId -> variationId
  props?: string[] // Prop IDs
  keyframes: Keyframe[]
  interval?: VideoInterval
  dubbing?: ShotDubbing
  nineGrid?: NineGridData
  qualityAssessment?: ShotQualityAssessment
  status?: GenerationStatus
}

// ============================================================================
// 多集架构：项目 → 季 → 集
// ============================================================================

/** 集当前所处阶段 */
export type EpisodeStage = 'script' | 'assets' | 'director' | 'export' | 'prompts'

/** 资产同步状态（项目库 vs 集内引用） */
export type AssetSyncStatus = 'synced' | 'outdated' | 'local-only'

/** 集对项目资产的引用 */
export interface AssetRef {
  id: string
  syncedVersion: number
  syncStatus: AssetSyncStatus
}

/** 单集创作单元 */
export interface Episode {
  id: string
  projectId: string
  seasonId: string
  episodeNumber: number
  title: string
  createdAt: number
  lastModified: number
  stage: EpisodeStage
  rawScript: string
  targetDuration: string
  language: string
  visualStyle: string
  shotGenerationModel?: string
  scriptData: ScriptData | null
  shots: Shot[]
  isParsingScript: boolean
  renderLogs: RenderLog[]
  /** 集引用的项目级资产（保证跨集一致） */
  characterRefs: AssetRef[]
  sceneRefs: AssetRef[]
  propRefs: AssetRef[]
}

/** 季 */
export interface Season {
  id: string
  projectId: string
  title: string
  sortOrder: number
  createdAt: number
  lastModified: number
}

/** 漫剧项目（一整部漫剧） */
export interface ManjuProject {
  id: string
  title: string
  description?: string
  coverImage?: string
  /** 示例项目标记（demo 不可删除） */
  isDemo?: boolean
  createdAt: number
  lastModified: number
  visualStyle: string
  language: string
  artDirection?: ArtDirection
  /** 项目级共享资产库（多集复用） */
  characterLibrary: Character[]
  sceneLibrary: Scene[]
  propLibrary: Prop[]
}

// ============================================================================
// 模型配置
// ============================================================================

/** AI 服务供应商（OpenAI 兼容协议） */
export interface ModelProvider {
  id: string
  name: string
  baseUrl: string // 如 https://api.example.com
  apiKey?: string // 独立 Key；缺省时使用全局 Key
  isDefault?: boolean
  isBuiltIn?: boolean
}

/** 对话模型（剧本分析 / 提示词生成） */
export interface ChatModelConfig {
  providerId: string
  modelName: string
  endpoint?: string // 默认 /v1/chat/completions
}

/** 图像模型（关键帧 / 定妆图） */
export interface ImageModelConfig {
  providerId: string
  modelName: string
  endpoint?: string
  /** API 形态：OpenAI 兼容 / Gemini 原生 */
  type?: 'openai' | 'gemini'
}

/** 视频模型（帧间插值） */
export interface VideoModelConfig {
  providerId: string
  /** 调度协议：sora(OpenAI 异步) / veo(通用同步优先) / seedance(字节火山异步) */
  type: 'sora' | 'veo' | 'seedance'
  modelName: string
  endpoint?: string
}

/** 语音模型（配音） */
export interface AudioModelConfig {
  providerId: string
  modelName: string
  endpoint?: string
  voices?: string[]
}

/** 当前生效的模型组合 */
export interface ModelConfig {
  chatModel: ChatModelConfig
  imageModel: ImageModelConfig
  videoModel: VideoModelConfig
  audioModel: AudioModelConfig
}

/** 模型管理全局状态 */
export interface ModelManagerState {
  providers: ModelProvider[]
  currentConfig: ModelConfig
  defaultAspectRatio: AspectRatio
  /** 全局 API Key（供应商未单独配置时回退） */
  globalApiKey?: string
}

// ============================================================================
// 渲染日志
// ============================================================================

export type RenderLogType =
  | 'character'
  | 'scene'
  | 'prop'
  | 'keyframe'
  | 'video'
  | 'audio'
  | 'script'

export interface RenderLog {
  id: string
  timestamp: number
  type: RenderLogType
  resourceId: string
  resourceName: string
  status: 'success' | 'failed'
  model: string
  prompt?: string
  error?: string
  duration?: number // ms
  inputTokens?: number
  outputTokens?: number
}

/** 质量评估单项检查 */
export interface QualityCheck {
  key: string
  label: string
  score: number // 0-100
  weight: number
  passed: boolean
  details?: string
}

/** 镜头质量评估结果 */
export interface ShotQualityAssessment {
  version: number
  score: number // 0-100
  grade: 'pass' | 'warning' | 'fail'
  generatedAt: number
  checks: QualityCheck[]
  summary: string
}
