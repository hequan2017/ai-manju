/**
 * 项目导入/导出服务
 * —— 整项目（项目 + 季 + 集）序列化为 JSON 备份；导入时作为新项目复制（id 重映射）。
 */
import {
  getProject,
  listEpisodesByProject,
  listSeasons,
  saveEpisode,
  saveProject,
  saveSeason,
} from './db'
import { uid } from './utils'
import type { Episode, ManjuProject, Season } from '@/types'

export interface ProjectExportPayload {
  version: 1
  exportedAt: number
  project: ManjuProject
  seasons: Season[]
  episodes: Episode[]
}

/** 导出整项目为可序列化 payload */
export async function exportProjectData(projectId: string): Promise<ProjectExportPayload> {
  const project = await getProject(projectId)
  if (!project) throw new Error('项目不存在')
  const seasons = await listSeasons(projectId)
  const episodes = await listEpisodesByProject(projectId)
  return { version: 1, exportedAt: Date.now(), project, seasons, episodes }
}

/** 导入 payload 为新项目（重映射 project/season/episode id，集内实体 id 保留自洽） */
export async function importProjectData(payload: ProjectExportPayload): Promise<string> {
  if (!payload?.project) throw new Error('无效的项目备份文件')
  const seasonIdMap = new Map<string, string>()
  const newProjectId = uid()
  seasonIdMap.set(payload.project.id, newProjectId)

  const project: ManjuProject = {
    ...payload.project,
    id: newProjectId,
    title: `${payload.project.title}（导入）`,
  }
  await saveProject(project)

  for (const s of payload.seasons ?? []) {
    const newSeasonId = uid()
    seasonIdMap.set(s.id, newSeasonId)
    await saveSeason({ ...s, id: newSeasonId, projectId: newProjectId })
  }

  for (const e of payload.episodes ?? []) {
    const newEpisodeId = uid()
    const seasonId = seasonIdMap.get(e.seasonId) ?? payload.seasons[0]?.id ?? e.seasonId
    await saveEpisode({ ...e, id: newEpisodeId, projectId: newProjectId, seasonId })
  }

  return newProjectId
}
