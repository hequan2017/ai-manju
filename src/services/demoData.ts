/**
 * 示例项目生成器（流浪地球主题）
 * —— 为首次使用者提供包含完整流程的参考 demo。
 */
import { saveEpisode, saveProject, saveSeason } from './db'
import {
  createCharacter,
  createEpisode,
  createProject,
  createProp,
  createScene,
  createSeason,
} from './factory'
import { now, uid } from './utils'
import type {
  ArtDirection,
  Character,
  Episode,
  GenerationStatus,
  ManjuProject,
  Prop,
  Scene,
  ScriptData,
  Shot,
} from '@/types'

/** 生成纯色 SVG 占位图（demo 关键帧） */
function placeholder(label: string, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640"><rect width="360" height="640" fill="${color}"/><text x="180" y="330" font-size="28" fill="rgba(255,255,255,0.85)" text-anchor="middle" font-family="sans-serif">${label}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const ART_DIRECTION: ArtDirection = {
  visualStyle: '3d-animation',
  colorPalette: {
    primary: 'cold steel blue',
    secondary: 'deep space black',
    accent: 'engine orange flame',
    skinTones: 'natural with cold ambient tint',
    saturation: 'moderate, cinematic',
    temperature: 'cool, with warm engine highlights',
  },
  characterDesignRules: {
    proportions: 'realistic, grounded',
    eyeStyle: 'naturalistic, expressive',
    lineWeight: 'clean 3D render, soft edges',
    detailLevel: 'high, weathered industrial textures',
  },
  lightingStyle: 'dramatic cinematic lighting, cold blue key with warm engine rim light',
  textureStyle: 'weathered metal, ice crystals, hard-surface sci-fi',
  moodKeywords: ['hard sci-fi', 'apocalyptic', 'industrial', 'hopeful', 'epic scale'],
  consistencyAnchors:
    'hard sci-fi cinematic style, cold blue palette with orange engine highlights, weathered industrial textures, dramatic scale, realistic 3D render, epic apocalyptic atmosphere',
}

const DONE = 'completed' as GenerationStatus
const TODO = 'pending' as GenerationStatus

function buildCharacters(): Character[] {
  return [
    { ...createCharacter({ name: '刘启', gender: '男', age: '20', personality: '叛逆、机敏、重情义', coreFeatures: '红色外套、短发', visualPrompt: 'young Chinese male, short black hair, red padded jacket, determined eyes, cold weather gear, 3d cinematic render' }), status: DONE, libraryVersion: 1, version: 1 },
    { ...createCharacter({ name: '韩朵朵', gender: '女', age: '18', personality: '纯真、勇敢', coreFeatures: '学生装、双马尾', visualPrompt: 'young Chinese girl, twin braids, school uniform under winter coat, innocent face, 3d cinematic render' }), status: DONE, libraryVersion: 1, version: 1 },
    { ...createCharacter({ name: '刘培强', gender: '男', age: '40', personality: '沉稳、坚毅、父爱', coreFeatures: '宇航员、短发', visualPrompt: 'middle-aged Chinese male astronaut, short hair, white spacesuit, calm resolute face, 3d cinematic render' }), status: TODO, libraryVersion: 1, version: 1 },
    { ...createCharacter({ name: '王磊', gender: '男', age: '35', personality: '果断、军人气质', coreFeatures: '军装、对讲机', visualPrompt: 'Chinese soldier, military winter gear, headset, stern face, 3d cinematic render' }), status: TODO, libraryVersion: 1, version: 1 },
  ]
}

function buildScenes(): Scene[] {
  return [
    { ...createScene({ name: '北京地下城', location: '地下', time: '不明', atmosphere: '霓虹拥挤、市井烟火', visualPrompt: 'underground city, neon signs, crowded market stalls, dim artificial light, cyberpunk-ish, 3d cinematic' }), status: DONE, libraryVersion: 1, version: 1 },
    { ...createScene({ name: '木星冰原', location: '地表', time: '白昼', atmosphere: '冰封、苍茫、危机', visualPrompt: 'frozen icy surface, massive jupiter looming in sky, blue cold tone, vast desolate, 3d cinematic' }), status: DONE, libraryVersion: 1, version: 1 },
    { ...createScene({ name: '领航员空间站', location: '太空', time: '太空', atmosphere: '洁白、科技、冷峻', visualPrompt: 'space station interior, white curved panels, earth view outside window, clean sci-fi, 3d cinematic' }), status: TODO, libraryVersion: 1, version: 1 },
    { ...createScene({ name: '行星发动机', location: '地表', time: '夜', atmosphere: '巨物、火焰、轰鸣', visualPrompt: 'colossal planetary engine, blue plasma flame jet, massive scale, industrial, 3d cinematic' }), status: TODO, libraryVersion: 1, version: 1 },
  ]
}

function buildProps(): Prop[] {
  return [
    { ...createProp({ name: '运载车', category: '交通工具', description: '重型全地形运载车', visualPrompt: 'heavy all-terrain transport vehicle, 12 wheels, industrial yellow, sci-fi truck, 3d cinematic' }), status: TODO, libraryVersion: 1, version: 1 },
    { ...createProp({ name: '点火钥匙', category: '装饰品', description: '启动发动机的石质钥匙', visualPrompt: 'stone ignition key, glowing runes, ancient artifact, 3d cinematic' }), status: TODO, libraryVersion: 1, version: 1 },
    { ...createProp({ name: '宇航服', category: '科技设备', description: '白色舱外宇航服', visualPrompt: 'white extravehicular spacesuit, helmet, oxygen tank, sci-fi, 3d cinematic' }), status: TODO, libraryVersion: 1, version: 1 },
  ]
}

function buildShots(characters: Character[], scenes: Scene[]): Shot[] {
  const c = (name: string) => characters.find((x) => x.name === name)!.id
  const sc = (name: string) => scenes.find((x) => x.name === name)!.id
  const mk = (over: Partial<Shot>): Shot => ({
    id: uid(),
    sceneId: '',
    index: 0,
    actionSummary: '',
    characters: [],
    props: [],
    keyframes: [{ id: uid(), type: 'start', visualPrompt: '', status: TODO }],
    status: TODO,
    ...over,
  })
  return [
    mk({
      sceneId: sc('北京地下城'), index: 1,
      actionSummary: '刘启与韩朵朵在地下城喧闹市集穿行，巨型屏幕播报木星危机',
      dialogue: '我们要上去看看',
      cameraMovement: 'tracking', shotSize: 'wide', characters: [c('刘启'), c('韩朵朵')],
      keyframes: [{ id: uid(), type: 'start', visualPrompt: 'underground city market, two figures walking, giant screen, neon, wide shot', imageUrl: placeholder('北京地下城', '#1a2a4a'), status: DONE }],
      dubbing: { mode: 'narration', text: '在地下城生活了十七年，刘启第一次想要回到地表。', status: TODO },
    }),
    mk({
      sceneId: sc('木星冰原'), index: 2,
      actionSummary: '运载车在木星冰原疾驰，巨大的木星占据天空',
      cameraMovement: 'dolly', shotSize: 'wide', characters: [c('刘启'), c('韩朵朵')],
      keyframes: [{ id: uid(), type: 'start', visualPrompt: 'transport vehicle racing across icy plain, giant jupiter in sky, epic scale', imageUrl: placeholder('木星冰原', '#0a1a3a'), status: DONE }],
    }),
    mk({
      sceneId: sc('领航员空间站'), index: 3,
      actionSummary: '刘培强在空间站凝望地球，决心启动发动机',
      dialogue: '无论最终结果将人类历史导向何处，我们决定，希望。',
      cameraMovement: 'static', shotSize: 'medium', characters: [c('刘培强')],
      keyframes: [{ id: uid(), type: 'start', visualPrompt: 'astronaut at space station window, earth below, contemplative', status: TODO }],
    }),
    mk({
      sceneId: sc('行星发动机'), index: 4,
      actionSummary: '巨型行星发动机喷出蓝色等离子焰，众人仰望巨物',
      cameraMovement: 'crane', shotSize: 'extreme wide', characters: [c('刘启'), c('王磊')],
      keyframes: [{ id: uid(), type: 'start', visualPrompt: 'colossal planetary engine firing blue plasma, people looking up, epic', imageUrl: placeholder('行星发动机', '#2a1a0a'), status: DONE }],
    }),
    mk({
      sceneId: sc('木星冰原'), index: 5,
      actionSummary: '众人合力推动点火钥匙，发动机轰鸣启动',
      dialogue: '前进！',
      cameraMovement: 'push', shotSize: 'close', characters: [c('刘启'), c('王磊')],
      keyframes: [{ id: uid(), type: 'start', visualPrompt: 'group pushing giant stone key, determination, close up, dramatic', status: TODO }],
    }),
  ]
}

/** 构建流浪地球示例项目（完整流程数据） */
export function buildDemoProject(): {
  project: ManjuProject
  seasons: ReturnType<typeof createSeason>[]
  episodes: Episode[]
} {
  const project = createProject({
    title: '流浪地球（示例）',
    description: '基于电影《流浪地球》改编的示例漫剧，展示从剧本到成片的完整创作流程。',
    visualStyle: '3d-animation',
    language: 'zh',
  })
  project.artDirection = ART_DIRECTION
  project.isDemo = true

  const characters = buildCharacters()
  const scenes = buildScenes()
  const props = buildProps()
  project.characterLibrary = characters
  project.sceneLibrary = scenes
  project.propLibrary = props

  const season = createSeason(project.id, 1, '第 1 季')
  const episode = createEpisode({
    projectId: project.id,
    seasonId: season.id,
    episodeNumber: 1,
    title: '第 1 集 · 启航',
    visualStyle: '3d-animation',
    language: 'zh',
  })
  episode.rawScript =
    '在不远的未来，太阳急速膨胀，人类启动「流浪地球」计划，在地球表面建造万座行星发动机，推动地球逃离太阳系。刘启与韩朵朵从北京地下城出发，前往地表……'

  const shots = buildShots(characters, scenes)
  const scriptData: ScriptData = {
    title: '流浪地球',
    genre: '硬科幻 / 末日',
    logline: '太阳膨胀，人类推动地球逃亡；一群普通人点燃了最后的希望。',
    targetDuration: '60s',
    language: 'zh',
    visualStyle: '3d-animation',
    artDirection: ART_DIRECTION,
    characters,
    scenes,
    props,
    storyBeats: [
      { id: 1, text: '地下城的日常生活与木星危机播报', sceneRefId: scenes[0].id },
      { id: 2, text: '驶上冰原，目睹巨物木星', sceneRefId: scenes[1].id },
      { id: 3, text: '空间站上的抉择', sceneRefId: scenes[2].id },
      { id: 4, text: '仰望行星发动机', sceneRefId: scenes[3].id },
      { id: 5, text: '合力点火，启航', sceneRefId: scenes[1].id },
    ],
    generationMeta: { generatedAt: now() },
  }
  episode.scriptData = scriptData
  episode.shots = shots
  episode.characterRefs = characters.map((c) => ({ id: c.id, syncedVersion: 1, syncStatus: 'synced' as const }))
  episode.sceneRefs = scenes.map((s) => ({ id: s.id, syncedVersion: 1, syncStatus: 'synced' as const }))
  episode.propRefs = props.map((p) => ({ id: p.id, syncedVersion: 1, syncStatus: 'synced' as const }))

  return { project, seasons: [season], episodes: [episode] }
}

/** 写入示例项目到数据库，返回项目 id */
export async function loadDemoProject(): Promise<string> {
  const { project, seasons, episodes } = buildDemoProject()
  await saveProject(project)
  for (const s of seasons) await saveSeason(s)
  for (const e of episodes) await saveEpisode(e)
  return project.id
}
