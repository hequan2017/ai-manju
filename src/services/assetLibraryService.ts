/**
 * 资产库服务
 * —— 项目级共享资产库（角色/场景/道具）的维护，与集(scriptData)的联动。
 *
 * 核心流程：集拆解剧本后 → applyAssetMatches(复用同名库资产) → promoteAssetsToLibrary(未匹配的提升入库)
 *   使得每个集内实体都带 libraryId/libraryVersion，并生成 episode refs，为跨集同步奠基。
 */
import type {
  AssetKind,
  AssetRef,
  Character,
  ManjuProject,
  Prop,
  Scene,
  ScriptData,
  VisualAsset,
} from '@/types'
import { clone, now, uid } from './utils'

export interface PromoteResult {
  project: ManjuProject
  scriptData: ScriptData
  characterRefs: AssetRef[]
  sceneRefs: AssetRef[]
  propRefs: AssetRef[]
}

/** 将集内未关联库的资产提升入库，并补全 libraryId/libraryVersion 与 refs */
export function promoteAssetsToLibrary(
  scriptData: ScriptData,
  project: ManjuProject,
): PromoteResult {
  const characterLibrary = [...project.characterLibrary]
  const sceneLibrary = [...project.sceneLibrary]
  const propLibrary = [...project.propLibrary]

  const promoteList = <T extends VisualAsset>(entities: T[], library: T[]): T[] =>
    entities.map((e) => {
      if (e.libraryId) return e // 已匹配库资产，保持
      const libAsset: T = { ...clone(e), id: uid(), libraryVersion: 1, version: 1 }
      library.push(libAsset)
      return { ...e, libraryId: libAsset.id, libraryVersion: 1 }
    })

  const characters = promoteList(scriptData.characters, characterLibrary)
  const scenes = promoteList(scriptData.scenes, sceneLibrary)
  const props = promoteList(scriptData.props, propLibrary)

  const toRef = (e: VisualAsset): AssetRef => ({
    id: e.id,
    syncedVersion: e.libraryVersion ?? 1,
    syncStatus: 'synced',
  })

  return {
    project: { ...project, characterLibrary, sceneLibrary, propLibrary, lastModified: now() },
    scriptData: { ...scriptData, characters, scenes, props },
    characterRefs: characters.map(toRef),
    sceneRefs: scenes.map(toRef),
    propRefs: props.map(toRef),
  }
}

function libraryOf(project: ManjuProject, kind: AssetKind): VisualAsset[] {
  return kind === 'character' ? project.characterLibrary : kind === 'scene' ? project.sceneLibrary : project.propLibrary
}

/** 向库新增资产 */
export function addLibraryAsset<K extends AssetKind>(
  project: ManjuProject,
  kind: K,
  asset: VisualAsset,
): ManjuProject {
  const libAsset = { ...clone(asset), id: uid(), libraryVersion: 1, version: 1 }
  if (kind === 'character') return { ...project, characterLibrary: [...project.characterLibrary, libAsset as Character] }
  if (kind === 'scene') return { ...project, sceneLibrary: [...project.sceneLibrary, libAsset as Scene] }
  return { ...project, propLibrary: [...project.propLibrary, libAsset as Prop] }
}

/**
 * 更新库资产（version+1，触发各集该资产 ref 变 outdated）。
 * 返回新 project；集内实体需由 characterSyncService 同步拉取。
 */
export function updateLibraryAsset(
  project: ManjuProject,
  kind: AssetKind,
  id: string,
  patch: Partial<VisualAsset>,
): ManjuProject {
  const update = <T extends VisualAsset>(list: T[]): T[] =>
    list.map((a) => (a.id === id ? { ...a, ...patch, version: (a.version ?? 1) + 1 } : a)) as T[]
  if (kind === 'character') return { ...project, characterLibrary: update(project.characterLibrary) }
  if (kind === 'scene') return { ...project, sceneLibrary: update(project.sceneLibrary) }
  return { ...project, propLibrary: update(project.propLibrary) }
}

/** 从库删除资产 */
export function removeLibraryAsset(project: ManjuProject, kind: AssetKind, id: string): ManjuProject {
  const remove = <T extends VisualAsset>(list: T[]): T[] => list.filter((a) => a.id !== id)
  if (kind === 'character') return { ...project, characterLibrary: remove(project.characterLibrary) }
  if (kind === 'scene') return { ...project, sceneLibrary: remove(project.sceneLibrary) }
  return { ...project, propLibrary: remove(project.propLibrary) }
}

/** 在项目库中按 id 查找 */
export function findLibraryAsset(project: ManjuProject, kind: AssetKind, id: string): VisualAsset | undefined {
  return libraryOf(project, kind).find((a) => a.id === id)
}
