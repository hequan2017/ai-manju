/**
 * IndexedDB 持久化层（基于 idb）
 *
 * Object Stores:
 *   · projects  —— 漫剧项目（含跨集共享资产库）
 *   · seasons   —— 季（index: by-project）
 *   · episodes  —— 集（index: by-project, by-season）
 *   · models    —— 模型管理状态（单条，key='state'）
 *   · kv        —— 键值杂项（主题、UI 偏好等）
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Episode,
  ManjuProject,
  ModelManagerState,
  Season,
} from '@/types'

interface ManjuDB extends DBSchema {
  projects: { key: string; value: ManjuProject }
  seasons: {
    key: string
    value: Season
    indexes: { 'by-project': string }
  }
  episodes: {
    key: string
    value: Episode
    indexes: { 'by-project': string; 'by-season': string }
  }
  models: { key: string; value: ModelManagerState }
  kv: { key: string; value: unknown }
}

const DB_NAME = 'ai-manju'
const DB_VERSION = 1
const MODELS_KEY = 'state'

let dbPromise: Promise<IDBPDatabase<ManjuDB>> | null = null

function getDB(): Promise<IDBPDatabase<ManjuDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ManjuDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('seasons')) {
          const store = db.createObjectStore('seasons', { keyPath: 'id' })
          store.createIndex('by-project', 'projectId')
        }
        if (!db.objectStoreNames.contains('episodes')) {
          const store = db.createObjectStore('episodes', { keyPath: 'id' })
          store.createIndex('by-project', 'projectId')
          store.createIndex('by-season', 'seasonId')
        }
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models')
        }
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv')
        }
      },
    })
  }
  return dbPromise
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function listProjects(): Promise<ManjuProject[]> {
  const db = await getDB()
  const all = await db.getAll('projects')
  return all.sort((a, b) => b.lastModified - a.lastModified)
}

export async function getProject(id: string): Promise<ManjuProject | undefined> {
  const db = await getDB()
  return db.get('projects', id)
}

export async function saveProject(project: ManjuProject): Promise<void> {
  const db = await getDB()
  await db.put('projects', project)
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['projects', 'seasons', 'episodes'], 'readwrite')
  // 级联删除：项目下的季与集
  const seasonIds = await tx.objectStore('seasons').index('by-project').getAllKeys(id)
  for (const sid of seasonIds) {
    await tx.objectStore('seasons').delete(sid)
  }
  const episodeIds = await tx.objectStore('episodes').index('by-project').getAllKeys(id)
  for (const eid of episodeIds) {
    await tx.objectStore('episodes').delete(eid)
  }
  await tx.objectStore('projects').delete(id)
  await tx.done
}

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------

export async function listSeasons(projectId: string): Promise<Season[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('seasons', 'by-project', projectId)
  return all.sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function saveSeason(season: Season): Promise<void> {
  const db = await getDB()
  await db.put('seasons', season)
}

export async function deleteSeason(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['seasons', 'episodes'], 'readwrite')
  const episodeIds = await tx.objectStore('episodes').index('by-season').getAllKeys(id)
  for (const eid of episodeIds) {
    await tx.objectStore('episodes').delete(eid)
  }
  await tx.objectStore('seasons').delete(id)
  await tx.done
}

// ---------------------------------------------------------------------------
// Episodes
// ---------------------------------------------------------------------------

export async function listEpisodesByProject(projectId: string): Promise<Episode[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('episodes', 'by-project', projectId)
  return all.sort((a, b) => a.episodeNumber - b.episodeNumber)
}

export async function listEpisodesBySeason(seasonId: string): Promise<Episode[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('episodes', 'by-season', seasonId)
  return all.sort((a, b) => a.episodeNumber - b.episodeNumber)
}

export async function getEpisode(id: string): Promise<Episode | undefined> {
  const db = await getDB()
  return db.get('episodes', id)
}

export async function saveEpisode(episode: Episode): Promise<void> {
  const db = await getDB()
  await db.put('episodes', episode)
}

export async function deleteEpisode(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('episodes', id)
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export async function getModelState(): Promise<ModelManagerState | undefined> {
  const db = await getDB()
  return db.get('models', MODELS_KEY)
}

export async function saveModelState(state: ModelManagerState): Promise<void> {
  const db = await getDB()
  await db.put('models', state, MODELS_KEY)
}

// ---------------------------------------------------------------------------
// KV（杂项键值）
// ---------------------------------------------------------------------------

export async function kvGet<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDB()
  return db.get('kv', key) as Promise<T | undefined>
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('kv', value, key)
}
