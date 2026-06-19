/**
 * 跨集资产同步服务
 * —— 当项目库资产被更新(version+1)后，引用它的各集实体 ref.syncedVersion 落后即 outdated。
 *   sync 拉取库最新内容覆盖集内实体（保留集内 id 与角色 variations），并刷新 ref。
 */
import type {
  AssetKind,
  AssetRef,
  Character,
  Episode,
  ManjuProject,
  Prop,
  Scene,
  VisualAsset,
} from '@/types'
import { clone } from './utils'
import { findLibraryAsset } from './assetLibraryService'

function episodeList(episode: Episode, kind: AssetKind): VisualAsset[] {
  const sd = episode.scriptData
  if (!sd) return []
  return kind === 'character' ? sd.characters : kind === 'scene' ? sd.scenes : sd.props
}

function episodeRefs(episode: Episode, kind: AssetKind): AssetRef[] {
  return kind === 'character'
    ? episode.characterRefs
    : kind === 'scene'
      ? episode.sceneRefs
      : episode.propRefs
}

export interface SyncIssue {
  entityId: string
  libraryId: string
  status: 'outdated' | 'missing'
}

/** 检测集中落后于库或库已删除的资产引用 */
export function checkSync(
  episode: Episode,
  project: ManjuProject,
  kind: AssetKind,
): SyncIssue[] {
  const issues: SyncIssue[] = []
  for (const entity of episodeList(episode, kind)) {
    if (!entity.libraryId) continue // local-only 不参与同步
    const lib = findLibraryAsset(project, kind, entity.libraryId)
    if (!lib) {
      issues.push({ entityId: entity.id, libraryId: entity.libraryId, status: 'missing' })
    } else if ((entity.libraryVersion ?? 0) < (lib.version ?? 1)) {
      issues.push({ entityId: entity.id, libraryId: entity.libraryId, status: 'outdated' })
    }
  }
  return issues
}

/** 全部资产种类的同步问题汇总 */
export function checkAllSync(episode: Episode, project: ManjuProject): {
  kind: AssetKind
  issues: SyncIssue[]
}[] {
  return (['character', 'scene', 'prop'] as AssetKind[]).map((kind) => ({ kind, issues: checkSync(episode, project, kind) }))
}

/** 拉取库最新覆盖单个集内实体（保留集内 id 与角色 variations） */
export function syncAsset(
  episode: Episode,
  project: ManjuProject,
  kind: AssetKind,
  entityId: string,
): Episode {
  if (!episode.scriptData) return episode
  const next = clone(episode)
  const sd = next.scriptData!
  const list = episodeList(next, kind)
  const idx = list.findIndex((e) => e.id === entityId)
  if (idx < 0) return episode
  const entity = list[idx]
  if (!entity.libraryId) return episode
  const lib = findLibraryAsset(project, kind, entity.libraryId)
  if (!lib) return episode

  const synced: VisualAsset = {
    ...entity,
    visualPrompt: lib.visualPrompt,
    negativePrompt: lib.negativePrompt,
    referenceImage: lib.referenceImage,
    shapeReferenceImage: lib.shapeReferenceImage,
    libraryVersion: lib.version ?? 1,
  }
  if (kind === 'character') (synced as Character).variations = (entity as Character).variations

  if (kind === 'character') sd.characters[idx] = synced as Character
  else if (kind === 'scene') sd.scenes[idx] = synced as Scene
  else sd.props[idx] = synced as Prop

  const refs = episodeRefs(next, kind)
  const refIdx = refs.findIndex((r) => r.id === entityId)
  if (refIdx >= 0) {
    refs[refIdx] = { ...refs[refIdx], syncedVersion: lib.version ?? 1, syncStatus: 'synced' }
  }
  return next
}

/** 同步当前集所有落后资产 */
export function syncAll(episode: Episode, project: ManjuProject): Episode {
  let next = episode
  for (const { kind, issues } of checkAllSync(next, project)) {
    for (const issue of issues) {
      if (issue.status === 'outdated') next = syncAsset(next, project, kind, issue.entityId)
    }
  }
  return next
}
