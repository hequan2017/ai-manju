/**
 * AI 资产 ↔ 库 匹配服务
 * —— 当新集拆解出角色/场景/道具时，用名称相似度(Jaccard + Dice)在项目资产库中
 *   自动找到同名/近名资产并复用（沿用其参考图与版本），保证多集间视觉一致。
 */
import type {
  Character,
  ManjuProject,
  Prop,
  Scene,
  ScriptData,
  VisualAsset,
} from '@/types'
import type { AssetRef } from '@/types'

/** 分词：英文按单词，中文按 2-gram（捕获语义片段） */
export function tokenize(text: string): string[] {
  const t = (text ?? '').toLowerCase().trim()
  const en = t.match(/[a-z0-9]+/g) ?? []
  const cnChars = t.match(/[一-龥]/g) ?? []
  const cn: string[] = []
  for (let i = 0; i < cnChars.length - 1; i++) cn.push(cnChars[i] + cnChars[i + 1])
  return [...en, ...cn]
}

function setIntersection<T>(a: Set<T>, b: Set<T>): number {
  let n = 0
  for (const x of a) if (b.has(x)) n++
  return n
}

/** Jaccard 相似度 */
export function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a)
  const sb = new Set(b)
  if (sa.size === 0 && sb.size === 0) return 0
  return setIntersection(sa, sb) / (sa.size + sb.size - setIntersection(sa, sb))
}

/** Dice 系数 */
export function diceCoeff(a: string[], b: string[]): number {
  const sa = new Set(a)
  const sb = new Set(b)
  if (sa.size === 0 && sb.size === 0) return 0
  return (2 * setIntersection(sa, sb)) / (sa.size + sb.size)
}

/** 综合名称相似度：Jaccard·0.55 + Dice·0.45 + 包含加分 0.2，封顶 1 */
export function nameSimilarity(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  let score = jaccard(ta, tb) * 0.55 + diceCoeff(ta, tb) * 0.45
  if (a && b && (a.includes(b) || b.includes(a))) score += 0.2
  return Math.min(1, score)
}

/** 在候选中按动态阈值挑选最佳匹配（短名更严格） */
export function pickBestByName<T extends VisualAsset>(
  name: string,
  candidates: T[],
): T | undefined {
  if (candidates.length === 0 || !name) return undefined
  const threshold = name.length <= 2 ? 0.95 : name.length <= 4 ? 0.72 : 0.5
  let best: T | undefined
  let bestScore = threshold
  for (const c of candidates) {
    let s = nameSimilarity(name, c.name)
    if (c.referenceImage) s += 0.04 // 有参考图的库资产优先
    if (s > bestScore) {
      bestScore = s
      best = c
    }
  }
  return best
}

export interface MatchPlan {
  characters: { entity: Character; library?: Character }[]
  scenes: { entity: Scene; library?: Scene }[]
  props: { entity: Prop; library?: Prop }[]
}

/** 规划匹配：对 scriptData 每个实体在项目库中寻找可复用资产 */
export function planAssetMatches(scriptData: ScriptData, project: ManjuProject): MatchPlan {
  return {
    characters: scriptData.characters.map((entity) => ({
      entity,
      library: pickBestByName(entity.name, project.characterLibrary),
    })),
    scenes: scriptData.scenes.map((entity) => ({
      entity,
      library: pickBestByName(entity.name, project.sceneLibrary),
    })),
    props: scriptData.props.map((entity) => ({
      entity,
      library: pickBestByName(entity.name, project.propLibrary),
    })),
  }
}

export interface ApplyResult {
  scriptData: ScriptData
  characterRefs: AssetRef[]
  sceneRefs: AssetRef[]
  propRefs: AssetRef[]
}

/**
 * 应用匹配：复用库资产（沿用其 libraryId/libraryVersion/参考图），并为每类资产生成同步引用。
 * 实体保留集内自身 id（shots 中的引用无需 remap）；引用记录用于跨集同步。
 */
export function applyAssetMatches(
  scriptData: ScriptData,
  project: ManjuProject,
): ApplyResult {
  const plan = planAssetMatches(scriptData, project)

  const mergeEntity = <T extends VisualAsset>(entity: T, library: T | undefined): T => {
    if (!library) return entity
    return {
      ...entity,
      libraryId: library.id,
      libraryVersion: library.version ?? 1,
      // 集内无图时沿用库参考图，保证一致
      referenceImage: entity.referenceImage ?? library.referenceImage,
      visualPrompt: entity.visualPrompt ?? library.visualPrompt,
    }
  }

  const toRef = <T extends VisualAsset>(entity: T): AssetRef => ({
    id: entity.id,
    syncedVersion: entity.libraryVersion ?? 0,
    syncStatus: entity.libraryId ? 'synced' : 'local-only',
  })

  const characters = plan.characters.map(({ entity, library }) => mergeEntity(entity, library))
  const scenes = plan.scenes.map(({ entity, library }) => mergeEntity(entity, library))
  const props = plan.props.map(({ entity, library }) => mergeEntity(entity, library))

  return {
    scriptData: { ...scriptData, characters, scenes, props },
    characterRefs: characters.map(toRef),
    sceneRefs: scenes.map(toRef),
    propRefs: props.map(toRef),
  }
}
