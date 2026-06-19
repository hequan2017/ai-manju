/**
 * 镜头工作卡
 * —— 单镜头的完整创作单元：首帧 / 尾帧生成、视频片段生成（含轮询进度）、配音生成与播放。
 */
import { useState } from 'react'
import {
  AlertTriangle,
  Film,
  ImageOff,
  LayoutGrid,
  Loader2,
  Volume2,
  Wand2,
} from 'lucide-react'
import { useShotActions } from '@/hooks/useShotActions'
import { useVideoSrc } from '@/hooks/useVideoSrc'
import type { Keyframe, Shot } from '@/types'
import { Badge, Button, Card } from '../ui'

export function ShotCard({ shot }: { shot: Shot }) {
  const {
    sd,
    busy,
    videoStatus,
    error,
    supportsEndFrame,
    generateStart,
    generateEnd,
    generateVideoClip,
    generateDubbing,
    generateNineGrid,
  } = useShotActions(shot)
  const videoSrc = useVideoSrc(shot.interval?.videoUrl)

  const sceneName = sd?.scenes.find((s) => s.id === shot.sceneId)?.name ?? '—'
  const start = shot.keyframes.find((k) => k.type === 'start')
  const end = shot.keyframes.find((k) => k.type === 'end')

  const [dubText, setDubText] = useState(shot.dialogue ?? shot.actionSummary)
  const [dubMode, setDubMode] = useState<'narration' | 'dialogue'>(
    shot.dialogue ? 'dialogue' : 'narration',
  )

  return (
    <Card className="overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2">
        <Badge tone="accent">#{shot.index}</Badge>
        <span className="truncate text-xs text-text-muted">{sceneName}</span>
        <div className="ml-auto flex gap-1">
          {shot.shotSize && <Badge>{shot.shotSize}</Badge>}
          {shot.cameraMovement && <Badge>{shot.cameraMovement}</Badge>}
        </div>
      </div>

      <div className="space-y-3 p-3">
        {/* 帧 */}
        <div className={`grid gap-2 ${supportsEndFrame ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <FrameSlot
            label="首帧"
            kf={start}
            busy={busy.start}
            onGenerate={generateStart}
          />
          {supportsEndFrame && (
            <FrameSlot label="尾帧" kf={end} busy={busy.end} onGenerate={generateEnd} />
          )}
        </div>

        {/* 动作 / 台词 */}
        <div>
          <p className="text-sm text-text">{shot.actionSummary}</p>
          {shot.dialogue && <p className="mt-1 text-xs italic text-text-muted">「{shot.dialogue}」</p>}
        </div>

        {/* 视频 */}
        <div className="rounded-lg border border-border bg-bg p-2">
          {videoSrc ? (
            <video src={videoSrc} controls className="aspect-video w-full rounded" />
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary" loading={busy.video} onClick={generateVideoClip}>
                <Film className="h-4 w-4" /> 生成视频
              </Button>
              {busy.video && videoStatus && (
                <span className="text-xs text-text-muted">状态：{videoStatus}…</span>
              )}
              {!busy.video && !supportsEndFrame && (
                <span className="text-xs text-text-subtle">当前视频模型仅支持首帧驱动</span>
              )}
            </div>
          )}
        </div>

        {/* 九宫格构图 */}
        <div className="rounded-lg border border-border bg-bg p-2">
          <div className="mb-1.5 flex items-center gap-1 text-xs font-medium text-text-muted">
            <LayoutGrid className="h-3.5 w-3.5" /> 九宫格构图
          </div>
          {shot.nineGrid?.imageUrl && (
            <img src={shot.nineGrid.imageUrl} alt="九宫格" className="mb-1 aspect-square w-full rounded" />
          )}
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            loading={busy.ninegrid}
            onClick={() => generateNineGrid(9)}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> {shot.nineGrid?.imageUrl ? '重生九宫格' : '生成九宫格'}
          </Button>
        </div>

        {/* 配音 */}
        <div className="rounded-lg border border-border bg-bg p-2">
          <div className="mb-1.5 flex items-center gap-1 text-xs font-medium text-text-muted">
            <Volume2 className="h-3.5 w-3.5" /> 配音
          </div>
          <textarea
            rows={2}
            value={dubText}
            onChange={(e) => setDubText(e.target.value)}
            className="w-full resize-y rounded border border-border bg-bg px-2 py-1 text-xs text-text focus:border-accent focus:outline-none"
            placeholder="旁白或对白文本"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <select
              value={dubMode}
              onChange={(e) => setDubMode(e.target.value as 'narration' | 'dialogue')}
              className="h-7 rounded border border-border bg-bg px-1 text-xs text-text"
            >
              <option value="narration">旁白</option>
              <option value="dialogue">对白</option>
            </select>
            <Button
              size="sm"
              variant="secondary"
              loading={busy.dubbing}
              onClick={() => generateDubbing(dubText, dubMode)}
            >
              <Wand2 className="h-3.5 w-3.5" /> 生成配音
            </Button>
          </div>
          {shot.dubbing?.audioUrl && (
            <audio src={shot.dubbing.audioUrl} controls className="mt-2 w-full" />
          )}
        </div>

        {error && (
          <div className="flex items-start gap-1.5 rounded border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="break-all">{error}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

function FrameSlot({
  label,
  kf,
  busy,
  onGenerate,
}: {
  label: string
  kf?: Keyframe
  busy: boolean
  onGenerate: () => void
}) {
  return (
    <div>
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-surface-2">
        {kf?.imageUrl ? (
          <img src={kf.imageUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-text-subtle">
            {busy || kf?.status === 'generating' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImageOff className="h-5 w-5" />
            )}
          </div>
        )}
        <span className="absolute left-1 top-1 rounded bg-black/50 px-1 text-[10px] text-white">
          {label}
        </span>
      </div>
      <Button
        size="sm"
        variant={kf?.imageUrl ? 'ghost' : 'primary'}
        className="mt-1.5 w-full"
        loading={busy}
        onClick={onGenerate}
      >
        {kf?.imageUrl ? '重生' : `生成${label}`}
      </Button>
    </div>
  )
}
