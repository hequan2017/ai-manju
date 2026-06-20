/**
 * 工作台壳
 * —— 项目内导航（季/集）+ 四阶段（剧本/资产/导演台/导出）切换 + 阶段内容容器。
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Camera,
  ChevronLeft,
  Clapperboard,
  Copy,
  Download,
  Image as ImageIcon,
  Library,
  Pencil,
  Plus,
  ScrollText,
  Sliders,
  Trash2,
} from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { useI18n } from '@/contexts/I18nContext'
import type { EpisodeStage } from '@/types'
import { Badge, Button, EmptyState, Select, Spinner } from './ui'
import { AssetSyncBanner } from './AssetSyncBanner'
import { ProjectLibraryModal } from './ProjectLibraryModal'
import { RenderLogsModal } from './RenderLogsModal'
import { StageAssets } from './stages/StageAssets'
import { StageDirector } from './stages/StageDirector'
import { StageExport } from './stages/StageExport'
import { StagePrompts } from './stages/StagePrompts'
import { StageScript } from './stages/StageScript'

const STAGES: { key: EpisodeStage; labelKey: string; icon: typeof Clapperboard }[] = [
  { key: 'script', labelKey: 'stage.script', icon: Clapperboard },
  { key: 'assets', labelKey: 'stage.assets', icon: ImageIcon },
  { key: 'director', labelKey: 'stage.director', icon: Camera },
  { key: 'export', labelKey: 'stage.export', icon: Download },
  { key: 'prompts', labelKey: 'stage.prompts', icon: Sliders },
]

export function Workspace() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const {
    currentProject,
    seasons,
    currentSeason,
    episodes,
    currentEpisode,
    loading,
    selectProject,
    selectSeason,
    selectEpisode,
    createSeason,
    removeSeason,
    updateSeason,
    createEpisode,
    patchEpisode,
    removeEpisode,
    duplicateEpisode,
  } = useProject()
  const { t } = useI18n()

  const [stage, setStage] = useState<EpisodeStage>('script')
  const [openLogs, setOpenLogs] = useState(false)
  const [openLibrary, setOpenLibrary] = useState(false)

  useEffect(() => {
    if (projectId) void selectProject(projectId)
  }, [projectId, selectProject])

  useEffect(() => {
    if (currentEpisode) setStage(currentEpisode.stage)
  }, [currentEpisode?.id]) // eslint-disable-line react-hooks/exhaustive-deps -- 切集时跟随该集所处阶段

  const handleStage = (next: EpisodeStage) => {
    setStage(next)
    if (currentEpisode) void patchEpisode(currentEpisode.id, (e) => ({ ...e, stage: next }))
  }

  if (loading || !projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!currentProject) {
    return (
      <div className="p-8">
        <EmptyState
          title={t('ws.notExist')}
          description={t('ws.deletedDesc')}
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              <ChevronLeft className="h-4 w-4" /> {t('ws.back')}
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* 左侧导航 */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-bg-elevated">
        <div className="border-b border-border p-4">
          <button
            className="mb-2 flex items-center gap-1 text-xs text-text-subtle hover:text-text"
            onClick={() => navigate('/')}
          >
            <ChevronLeft className="h-3 w-3" /> {t('ws.back')}
          </button>
          <h2 className="truncate font-semibold text-text">{currentProject.title}</h2>
          {currentProject.description && (
            <p className="mt-1 line-clamp-2 text-xs text-text-muted">{currentProject.description}</p>
          )}
        </div>

        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Select
              className="h-8 text-xs"
              value={currentSeason?.id ?? ''}
              onChange={(e) => void selectSeason(e.target.value)}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </Select>
            <Button
              size="icon"
              variant="ghost"
              title={t('ws.newSeason')}
              onClick={() => void createSeason()}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title={t('ws.renameSeason')}
              disabled={!currentSeason}
              onClick={() => {
                if (!currentSeason) return
                const name = prompt(t('ws.renameSeasonPrompt'), currentSeason.title)
                if (name && name.trim()) void updateSeason(currentSeason.id, name.trim())
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title={t('ws.deleteSeason')}
              disabled={!currentSeason || seasons.length <= 1}
              onClick={() => {
                if (currentSeason && confirm(t('ws.deleteSeasonConfirmTitle', { title: currentSeason.title }))) {
                  void removeSeason(currentSeason.id)
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-xs font-medium text-text-muted">{t('ws.episodes')}（{episodes.length}）</span>
            <Button size="sm" variant="ghost" onClick={() => void createEpisode()}>
              <Plus className="h-3.5 w-3.5" /> {t('ws.newEpisode')}
            </Button>
          </div>
          {episodes.map((ep) => (
            <div
              key={ep.id}
              onClick={() => selectEpisode(ep.id)}
              className={[
                'group mb-1 flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm',
                currentEpisode?.id === ep.id
                  ? 'bg-accent-soft text-accent'
                  : 'text-text-muted hover:bg-surface-2 hover:text-text',
              ].join(' ')}
            >
              <span
                className="truncate"
                title={t('ws.episodeDoubleRename')}
                onDoubleClick={() => {
                  const name = prompt(t('ws.episodeNamePrompt'), ep.title)
                  if (name && name.trim()) patchEpisode(ep.id, (e) => ({ ...e, title: name.trim() }))
                }}
              >
                <span className="font-mono text-xs">EP{String(ep.episodeNumber).padStart(2, '0')}</span>{' '}
                {ep.title}
              </span>
              <span className="flex items-center gap-1">
                {ep.scriptData && <Badge tone="success">{t('common.parsed')}</Badge>}
                <button
                  title={t('ws.duplicateEpisode')}
                  onClick={(e) => { e.stopPropagation(); duplicateEpisode(ep.id) }}
                  className="hidden h-5 w-5 items-center justify-center rounded text-text-subtle hover:bg-surface-2 hover:text-text group-hover:flex"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  title={t('ws.deleteEpisode')}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(t('ws.deleteEpisodeConfirmTitle', { title: ep.title }))) removeEpisode(ep.id)
                  }}
                  className="hidden h-5 w-5 items-center justify-center rounded text-text-subtle hover:bg-danger/20 hover:text-danger group-hover:flex"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-2">
          <Button variant="outline" size="sm" className="w-full" onClick={() => setOpenLibrary(true)}>
            <Library className="h-4 w-4" /> {t('ws.library')}
          </Button>
        </div>
      </aside>

      {/* 主区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {currentEpisode ? (
          <>
            <div className="flex items-center gap-1 border-b border-border bg-bg-elevated px-4">
              {STAGES.map((s) => {
                const Icon = s.icon
                const active = stage === s.key
                return (
                  <button
                    key={s.key}
                    onClick={() => handleStage(s.key)}
                    className={[
                      'flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium',
                      active
                        ? 'border-accent text-text'
                        : 'border-transparent text-text-muted hover:text-text',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" /> {t(s.labelKey)}
                  </button>
                )
              })}
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                title={t('ws.renderLogs')}
                onClick={() => setOpenLogs(true)}
              >
                <ScrollText className="h-4 w-4" /> {t('common.logs')}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <AssetSyncBanner />
              {stage === 'script' && <StageScript />}
              {stage === 'assets' && <StageAssets />}
              {stage === 'director' && <StageDirector />}
              {stage === 'export' && <StageExport />}
              {stage === 'prompts' && <StagePrompts />}
              <RenderLogsModal open={openLogs} onClose={() => setOpenLogs(false)} episode={currentEpisode} />
              <ProjectLibraryModal open={openLibrary} onClose={() => setOpenLibrary(false)} />
            </div>
          </>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={<Clapperboard className="h-10 w-10" />}
              title={t('ws.selectEpisode')}
              description={t('ws.selectEpisode.desc')}
            />
          </div>
        )}
      </div>
    </div>
  )
}
