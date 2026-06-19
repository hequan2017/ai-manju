/**
 * 领域对象工厂 —— 集中创建带默认值的实体，保证字段完整与一致性。
 */
import type {
  AspectRatio,
  Character,
  CharacterVariation,
  Episode,
  Keyframe,
  ManjuProject,
  ModelManagerState,
  Prop,
  Scene,
  Season,
  Shot,
  VideoInterval,
} from '@/types'
import { now, uid } from './utils'

/** 创建漫剧项目 */
export function createProject(input: Partial<ManjuProject> = {}): ManjuProject {
  const ts = now()
  return {
    id: uid(),
    title: input.title ?? '未命名漫剧',
    description: input.description ?? '',
    coverImage: input.coverImage,
    createdAt: ts,
    lastModified: ts,
    visualStyle: input.visualStyle ?? 'anime',
    language: input.language ?? 'zh',
    characterLibrary: input.characterLibrary ?? [],
    sceneLibrary: input.sceneLibrary ?? [],
    propLibrary: input.propLibrary ?? [],
  }
}

/** 创建季 */
export function createSeason(projectId: string, sortOrder: number, title?: string): Season {
  const ts = now()
  return {
    id: uid(),
    projectId,
    title: title ?? `第 ${sortOrder} 季`,
    sortOrder,
    createdAt: ts,
    lastModified: ts,
  }
}

/** 创建集 */
export function createEpisode(input: {
  projectId: string
  seasonId: string
  episodeNumber: number
  title?: string
  visualStyle?: string
  language?: string
}): Episode {
  const ts = now()
  return {
    id: uid(),
    projectId: input.projectId,
    seasonId: input.seasonId,
    episodeNumber: input.episodeNumber,
    title: input.title ?? `第 ${input.episodeNumber} 集`,
    createdAt: ts,
    lastModified: ts,
    stage: 'script',
    rawScript: '',
    targetDuration: '60s',
    language: input.language ?? 'zh',
    visualStyle: input.visualStyle ?? 'anime',
    scriptData: null,
    shots: [],
    isParsingScript: false,
    renderLogs: [],
    characterRefs: [],
    sceneRefs: [],
    propRefs: [],
  }
}

/** 创建角色 */
export function createCharacter(input: Partial<Character> = {}): Character {
  return {
    id: uid(),
    name: input.name ?? '新角色',
    gender: input.gender,
    age: input.age,
    personality: input.personality,
    coreFeatures: input.coreFeatures,
    visualPrompt: input.visualPrompt,
    negativePrompt: input.negativePrompt,
    referenceImage: input.referenceImage,
    variations: input.variations ?? [],
    status: 'pending',
  }
}

/** 创建角色造型变体 */
export function createCharacterVariation(input: Partial<CharacterVariation> = {}): CharacterVariation {
  return {
    id: uid(),
    name: input.name ?? '新造型',
    visualPrompt: input.visualPrompt,
    negativePrompt: input.negativePrompt,
    referenceImage: input.referenceImage,
    status: 'pending',
  }
}

/** 创建场景 */
export function createScene(input: Partial<Scene> = {}): Scene {
  return {
    id: uid(),
    name: input.name ?? '新场景',
    location: input.location,
    time: input.time,
    atmosphere: input.atmosphere,
    visualPrompt: input.visualPrompt,
    negativePrompt: input.negativePrompt,
    referenceImage: input.referenceImage,
    status: 'pending',
  }
}

/** 创建道具 */
export function createProp(input: Partial<Prop> = {}): Prop {
  return {
    id: uid(),
    name: input.name ?? '新道具',
    category: input.category ?? '其他',
    description: input.description,
    visualPrompt: input.visualPrompt,
    negativePrompt: input.negativePrompt,
    referenceImage: input.referenceImage,
    status: 'pending',
  }
}

/** 创建关键帧 */
export function createKeyframe(type: 'start' | 'end', visualPrompt = ''): Keyframe {
  return {
    id: uid(),
    type,
    visualPrompt,
    status: 'pending',
  }
}

/** 创建视频片段 */
export function createVideoInterval(startKeyframeId: string, duration = 5): VideoInterval {
  return {
    id: uid(),
    startKeyframeId,
    duration,
    motionStrength: 0.6,
    status: 'pending',
  }
}

/** 创建镜头 */
export function createShot(input: Partial<Shot> = {}): Shot {
  const start = createKeyframe('start', input.actionSummary ?? '')
  return {
    id: uid(),
    sceneId: input.sceneId ?? '',
    index: input.index ?? 0,
    actionSummary: input.actionSummary ?? '',
    dialogue: input.dialogue,
    cameraMovement: input.cameraMovement ?? 'static',
    shotSize: input.shotSize ?? 'medium',
    characters: input.characters ?? [],
    characterVariations: input.characterVariations,
    props: input.props,
    keyframes: [start],
    status: 'pending',
  }
}

/**
 * 默认模型管理状态。
 * 内置一个 OpenAI 兼容供应商作为占位，用户需填写 baseUrl / apiKey，模型名可替换。
 */
export function createDefaultModelState(): ModelManagerState {
  const defaultProviderId = 'builtin-openai'
  return {
    providers: [
      {
        id: defaultProviderId,
        name: 'OpenAI 兼容',
        baseUrl: 'https://api.openai.com',
        isDefault: true,
        isBuiltIn: true,
      },
    ],
    currentConfig: {
      chatModel: {
        providerId: defaultProviderId,
        modelName: 'gpt-4o-mini',
      },
      imageModel: {
        providerId: defaultProviderId,
        modelName: 'gpt-image-1',
        type: 'openai',
      },
      videoModel: {
        providerId: defaultProviderId,
        type: 'seedance',
        modelName: 'doubao-seedance-1-5-pro-250528',
      },
      audioModel: {
        providerId: defaultProviderId,
        modelName: 'tts-1',
      },
    },
    defaultAspectRatio: '9:16' as AspectRatio,
    globalApiKey: '',
  }
}
