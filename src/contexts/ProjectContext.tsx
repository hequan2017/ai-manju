/**
 * 项目 Context —— 多集漫剧的数据中枢
 *
 * 三级层级：项目(Project) → 季(Season) → 集(Episode)，惰性加载。
 * 集(Episode) 是创作单元，patchEpisode 为高频编辑入口（剧本/分镜变更）。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Episode, ManjuProject, Season } from '@/types'
import {
  deleteEpisode,
  deleteProject,
  deleteSeason,
  getEpisode,
  listEpisodesBySeason,
  listProjects,
  listSeasons,
  saveEpisode,
  saveProject,
  saveSeason,
} from '@/services/db'
import {
  createEpisode as buildEpisode,
  createProject as buildProject,
  createSeason as buildSeason,
} from '@/services/factory'
import { clone, now, uid } from '@/services/utils'

interface CreateEpisodeInput {
  title?: string
}

interface ProjectContextValue {
  projects: ManjuProject[]
  seasons: Season[]
  episodes: Episode[]

  currentProject: ManjuProject | null
  currentSeason: Season | null
  currentEpisode: Episode | null
  loading: boolean

  refreshProjects: () => Promise<void>
  selectProject: (id: string | null) => Promise<void>
  selectSeason: (id: string | null) => Promise<void>
  selectEpisode: (id: string | null) => void
  refreshCurrentEpisode: () => Promise<void>

  createProject: (input: Partial<ManjuProject>) => Promise<ManjuProject>
  updateProject: (project: ManjuProject) => Promise<void>
  removeProject: (id: string) => Promise<void>

  createSeason: (title?: string) => Promise<Season | null>
  removeSeason: (id: string) => Promise<void>
  updateSeason: (id: string, title: string) => Promise<void>

  createEpisode: (input?: CreateEpisodeInput) => Promise<Episode | null>
  /** 高频编辑：基于最新 db 状态应用变更并持久化 */
  patchEpisode: (id: string, mutator: (e: Episode) => Episode) => Promise<void>
  removeEpisode: (id: string) => Promise<void>
  duplicateEpisode: (id: string) => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ManjuProject[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])

  const [projectId, setProjectId] = useState<string | null>(null)
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [episodeId, setEpisodeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setProjects(await listProjects())
      setLoading(false)
    })()
  }, [])

  const currentProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  )
  const currentSeason = useMemo(
    () => seasons.find((s) => s.id === seasonId) ?? null,
    [seasons, seasonId],
  )
  const currentEpisode = useMemo(
    () => episodes.find((e) => e.id === episodeId) ?? null,
    [episodes, episodeId],
  )

  const refreshProjects = useCallback(async () => {
    setProjects(await listProjects())
  }, [])

  const loadSeasons = useCallback(async (pid: string): Promise<Season[]> => {
    const list = await listSeasons(pid)
    setSeasons(list)
    return list
  }, [])

  const loadEpisodes = useCallback(async (sid: string) => {
    setEpisodes(await listEpisodesBySeason(sid))
  }, [])

  const selectProject = useCallback(
    async (id: string | null) => {
      setProjectId(id)
      setSeasonId(null)
      setEpisodeId(null)
      setEpisodes([])
      if (!id) {
        setSeasons([])
        return
      }
      // 直接消费 loadSeasons 的返回值，避免在 setState updater 内触发副作用（StrictMode 安全）
      const list = await loadSeasons(id)
      const first = list[0]
      if (first) {
        setSeasonId(first.id)
        await loadEpisodes(first.id)
      }
    },
    [loadSeasons, loadEpisodes],
  )

  const selectSeason = useCallback(
    async (id: string | null) => {
      setSeasonId(id)
      setEpisodeId(null)
      if (id) {
        await loadEpisodes(id)
      } else {
        setEpisodes([])
      }
    },
    [loadEpisodes],
  )

  const selectEpisode = useCallback((id: string | null) => {
    setEpisodeId(id)
  }, [])

  const refreshCurrentEpisode = useCallback(async () => {
    if (!episodeId) return
    const fresh = await getEpisode(episodeId)
    if (fresh) {
      setEpisodes((prev) => prev.map((e) => (e.id === episodeId ? fresh : e)))
    }
  }, [episodeId])

  // ---- 项目 CRUD ----
  const createProject = useCallback(
    async (input: Partial<ManjuProject>) => {
      const project = buildProject(input)
      const firstSeason = buildSeason(project.id, 1, '第 1 季')
      await saveProject(project)
      await saveSeason(firstSeason)
      await refreshProjects()
      return project
    },
    [refreshProjects],
  )

  const updateProject = useCallback(
    async (project: ManjuProject) => {
      const next = { ...project, lastModified: now() }
      await saveProject(next)
      setProjects((prev) => prev.map((p) => (p.id === next.id ? next : p)))
    },
    [],
  )

  const removeProject = useCallback(
    async (id: string) => {
      await deleteProject(id)
      if (projectId === id) await selectProject(null)
      await refreshProjects()
    },
    [projectId, selectProject, refreshProjects],
  )

  // ---- 季 CRUD ----
  const createSeason = useCallback(
    async (title?: string) => {
      if (!projectId) return null
      const order = seasons.length + 1
      const season = buildSeason(projectId, order, title ?? `第 ${order} 季`)
      await saveSeason(season)
      await loadSeasons(projectId)
      return season
    },
    [projectId, seasons.length, loadSeasons],
  )

  const removeSeason = useCallback(
    async (id: string) => {
      await deleteSeason(id)
      if (seasonId === id) await selectSeason(null)
      if (projectId) await loadSeasons(projectId)
    },
    [seasonId, projectId, selectSeason, loadSeasons],
  )

  /** 重命名季 */
  const updateSeason = useCallback(
    async (id: string, title: string) => {
      const season = seasons.find((s) => s.id === id)
      if (!season) return
      await saveSeason({ ...season, title, lastModified: now() })
      if (projectId) await loadSeasons(projectId)
    },
    [seasons, projectId, loadSeasons],
  )

  // ---- 集 CRUD ----
  const createEpisode = useCallback(
    async (input?: CreateEpisodeInput) => {
      if (!seasonId || !projectId) return null
      const number = episodes.length + 1
      const episode = buildEpisode({
        projectId,
        seasonId,
        episodeNumber: number,
        title: input?.title ?? `第 ${number} 集`,
        visualStyle: currentProject?.visualStyle,
        language: currentProject?.language,
      })
      await saveEpisode(episode)
      await loadEpisodes(seasonId)
      return episode
    },
    [seasonId, projectId, episodes.length, currentProject, loadEpisodes],
  )

  const patchEpisode = useCallback(
    async (id: string, mutator: (e: Episode) => Episode) => {
      const latest = await getEpisode(id)
      if (!latest) throw new Error(`集不存在：${id}`)
      const next = { ...mutator(latest), lastModified: now() }
      await saveEpisode(next)
      setEpisodes((prev) => prev.map((e) => (e.id === id ? next : e)))
    },
    [],
  )

  const removeEpisode = useCallback(
    async (id: string) => {
      await deleteEpisode(id)
      if (episodeId === id) selectEpisode(null)
      if (seasonId) await loadEpisodes(seasonId)
    },
    [episodeId, seasonId, selectEpisode, loadEpisodes],
  )

  /** 复制集（新 id，置于当前季末尾） */
  const duplicateEpisode = useCallback(
    async (id: string) => {
      const src = await getEpisode(id)
      if (!src || !seasonId) return
      const number = episodes.length + 1
      const copy: Episode = {
        ...clone(src),
        id: uid(),
        episodeNumber: number,
        title: `${src.title} 副本`,
        createdAt: now(),
        lastModified: now(),
      }
      await saveEpisode(copy)
      await loadEpisodes(seasonId)
    },
    [seasonId, episodes.length, loadEpisodes],
  )

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      seasons,
      episodes,
      currentProject,
      currentSeason,
      currentEpisode,
      loading,
      refreshProjects,
      selectProject,
      selectSeason,
      selectEpisode,
      refreshCurrentEpisode,
      createProject,
      updateProject,
      removeProject,
      createSeason,
      removeSeason,
      updateSeason,
      createEpisode,
      patchEpisode,
      removeEpisode,
      duplicateEpisode,
    }),
    [
      projects,
      seasons,
      episodes,
      currentProject,
      currentSeason,
      currentEpisode,
      loading,
      refreshProjects,
      selectProject,
      selectSeason,
      selectEpisode,
      refreshCurrentEpisode,
      createProject,
      updateProject,
      removeProject,
      createSeason,
      removeSeason,
      updateSeason,
      createEpisode,
      patchEpisode,
      removeEpisode,
      duplicateEpisode,
    ],
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject 必须在 ProjectProvider 内使用')
  return ctx
}
