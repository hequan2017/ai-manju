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
  Download,
  Image as ImageIcon,
  Plus,
  ScrollText,
  Sliders,
} from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import type { EpisodeStage } from '@/types'
import { Badge, Button, EmptyState, Select, Spinner } from './ui'
import { AssetSyncBanner } from './AssetSyncBanner'
import { RenderLogsModal } from './RenderLogsModal'
import { StageAssets } from './stages/StageAssets'
import { StageDirector } from './stages/StageDirector'
import { StageExport } from './stages/StageExport'
import { StagePrompts } from './stages/StagePrompts'
import { StageScript } from './stages/StageScript'

const STAGES: { key: EpisodeStage; label: string; icon: typeof Clapperboard }[] = [
  { key: 'script', label: '剧本', icon: Clapperboard },
  { key: 'assets', label: '资产', icon: ImageIcon },
  { key: 'director', label: '导演台', icon: Camera },
  { key: 'export', label: '导出', icon: Download },
  { key: 'prompts', label: '提示词', icon: Sliders },
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
    createEpisode,
    patchEpisode,
  } = useProject()

  const [stage, setStage] = useState<EpisodeStage>('script')
  const [openLogs, setOpenLogs] = useState(false)

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
          title="项目不存在"
          description="该项目可能已被删除。"
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              <ChevronLeft className="h-4 w-4" /> 返回项目列表
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
            <ChevronLeft className="h-3 w-3" /> 项目列表
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
              title="新建季"
              onClick={() => void createSeason()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-xs font-medium text-text-muted">集（{episodes.length}）</span>
            <Button size="sm" variant="ghost" onClick={() => void createEpisode()}>
              <Plus className="h-3.5 w-3.5" /> 新建
            </Button>
          </div>
          {episodes.map((ep) => (
            <button
              key={ep.id}
              onClick={() => selectEpisode(ep.id)}
              className={[
                'mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm',
                currentEpisode?.id === ep.id
                  ? 'bg-accent-soft text-accent'
                  : 'text-text-muted hover:bg-surface-2 hover:text-text',
              ].join(' ')}
            >
              <span className="truncate">
                <span className="font-mono text-xs">EP{String(ep.episodeNumber).padStart(2, '0')}</span>{' '}
                {ep.title}
              </span>
              {ep.scriptData && <Badge tone="success">已拆解</Badge>}
            </button>
          ))}
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
                    <Icon className="h-4 w-4" /> {s.label}
                  </button>
                )
              })}
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                title="渲染日志"
                onClick={() => setOpenLogs(true)}
              >
                <ScrollText className="h-4 w-4" /> 日志
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
            </div>
          </>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={<Clapperboard className="h-10 w-10" />}
              title="选择一集开始创作"
              description="在左侧选择已有集，或点击「新建」创建一集，进入剧本创作阶段。"
            />
          </div>
        )}
      </div>
    </div>
  )
}
