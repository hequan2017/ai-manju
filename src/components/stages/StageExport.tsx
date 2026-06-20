/**
 * 阶段四：成片导出
 * —— 时间轴预览（视频/配音）+ 一键打包导出（关键帧 / 视频片段 / 配音 / 分镜 JSON）。
 */
import { useState } from 'react'
import JSZip from 'jszip'
import { ArrowDownUp, ChevronDown, ChevronUp, Clock, Download, Film, Layers, Package, Scissors } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { useI18n } from '@/contexts/I18nContext'
import { useVideoSrc } from '@/hooks/useVideoSrc'
import { materializeVideoRef } from '@/services/videoStorageService'
import { stitchVideosToMaster } from '@/services/exportService'
import { dataURLToBytes, downloadBlob } from '@/services/utils'
import { Button, Card, CardBody, CardHeader, EmptyState, Spinner } from '../ui'

function VideoThumb({ src }: { src: string }) {
  const url = useVideoSrc(src)
  if (!url) return null
  return <video src={url} controls className="mt-1 w-full rounded" />
}

function mimeToExt(mime: string): string {
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mov')) return 'mov'
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('mpeg')) return 'mp3'
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  return 'bin'
}

export function StageExport() {
  const { currentProject, currentEpisode, patchEpisode } = useProject()
  const { t } = useI18n()
  const [exporting, setExporting] = useState(false)
  const [stitching, setStitching] = useState(false)

  if (!currentEpisode) return <EmptyState title={t('export.selectEpisode')} />
  const sd = currentEpisode.scriptData
  if (!sd || currentEpisode.shots.length === 0) {
    return (
      <EmptyState
        icon={<Film className="h-10 w-10" />}
        title={t('export.noContent')}
        description={t('export.noContentDesc')}
      />
    )
  }

  const shotsWithVideo = currentEpisode.shots.filter((s) => s.interval?.videoUrl)
  const shotsWithFrame = currentEpisode.shots.filter((s) =>
    s.keyframes.some((k) => k.imageUrl),
  )

  const handleExportZip = async () => {
    setExporting(true)
    try {
      const zip = new JSZip()
      for (const shot of currentEpisode.shots) {
        const tag = `EP${String(shot.index).padStart(2, '0')}`
        const start = shot.keyframes.find((k) => k.type === 'start')
        const end = shot.keyframes.find((k) => k.type === 'end')
        if (start?.imageUrl) {
          const { bytes, mime } = dataURLToBytes(start.imageUrl)
          zip.file(`frames/${tag}-start.${mimeToExt(mime)}`, bytes)
        }
        if (end?.imageUrl) {
          const { bytes, mime } = dataURLToBytes(end.imageUrl)
          zip.file(`frames/${tag}-end.${mimeToExt(mime)}`, bytes)
        }
        if (shot.interval?.videoUrl) {
          const mat = await materializeVideoRef(shot.interval.videoUrl)
          if (mat) {
            const { bytes, mime } = dataURLToBytes(mat)
            zip.file(`videos/${tag}.${mimeToExt(mime)}`, bytes)
          }
        }
        if (shot.dubbing?.audioUrl) {
          const { bytes, mime } = dataURLToBytes(shot.dubbing.audioUrl)
          zip.file(`audio/${tag}.${mimeToExt(mime)}`, bytes)
        }
      }
      // 分镜元数据
      const meta = {
        project: currentProject?.title,
        episode: currentEpisode.title,
        targetDuration: currentEpisode.targetDuration,
        script: {
          title: sd.title,
          genre: sd.genre,
          logline: sd.logline,
          characters: sd.characters.map((c) => ({ name: c.name, visualPrompt: c.visualPrompt })),
          scenes: sd.scenes.map((s) => ({ name: s.name, visualPrompt: s.visualPrompt })),
        },
        shots: currentEpisode.shots.map((s) => ({
          index: s.index,
          scene: sd.scenes.find((sc) => sc.id === s.sceneId)?.name,
          actionSummary: s.actionSummary,
          dialogue: s.dialogue,
          shotSize: s.shotSize,
          cameraMovement: s.cameraMovement,
          characters: s.characters
            .map((id) => sd.characters.find((c) => c.id === id)?.name)
            .filter(Boolean),
          hasStartFrame: Boolean(s.keyframes.find((k) => k.type === 'start')?.imageUrl),
          hasVideo: Boolean(s.interval?.videoUrl),
          hasDubbing: Boolean(s.dubbing?.audioUrl),
        })),
      }
      zip.file('storyboard.json', JSON.stringify(meta, null, 2))
      const blob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(blob, `${currentProject?.title ?? 'manju'}-${currentEpisode.title}.zip`)
    } finally {
      setExporting(false)
    }
  }

  const handleStitch = async () => {
    setStitching(true)
    try {
      const videoRefs = currentEpisode.shots
        .filter((s) => s.interval?.videoUrl)
        .map((s) => s.interval!.videoUrl!)
      const blob = await stitchVideosToMaster(videoRefs, {})
      if (blob) {
        downloadBlob(blob, `${currentProject?.title ?? 'manju'}-${currentEpisode.title}.webm`)
      } else {
        alert(t('export.stitchFallback'))
      }
    } catch (err) {
      alert(t('export.stitchFail', { msg: err instanceof Error ? err.message : String(err) }))
    } finally {
      setStitching(false)
    }
  }

  /** 剪辑：上移/下移镜头（重排 shots 并刷新序号） */
  const handleMoveShot = (shotId: string, dir: -1 | 1) => {
    patchEpisode(currentEpisode.id, (e) => {
      const shots = [...e.shots]
      const idx = shots.findIndex((s) => s.id === shotId)
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= shots.length) return e
      ;[shots[idx], shots[target]] = [shots[target], shots[idx]]
      return { ...e, shots: shots.map((s, i) => ({ ...s, index: i + 1 })) }
    })
  }

  /** 反转镜头顺序 */
  const handleReverse = () => {
    patchEpisode(currentEpisode.id, (e) => ({
      ...e,
      shots: [...e.shots].reverse().map((s, i) => ({ ...s, index: i + 1 })),
    }))
  }

  /** 按场景分组排序 */
  const handleGroupByScene = () => {
    patchEpisode(currentEpisode.id, (e) => ({
      ...e,
      shots: [...e.shots]
        .sort((a, b) => a.sceneId.localeCompare(b.sceneId))
        .map((s, i) => ({ ...s, index: i + 1 })),
    }))
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-text">
            <Scissors className="h-4 w-4 text-accent" /> {t('export.editTitle')}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" title={t('export.reverseTitle')} onClick={handleReverse}>
              <ArrowDownUp className="h-3.5 w-3.5" /> {t('export.reverse')}
            </Button>
            <Button size="sm" variant="ghost" title={t('export.groupTitle')} onClick={handleGroupByScene}>
              <Layers className="h-3.5 w-3.5" /> {t('export.groupByScene')}
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {currentEpisode.shots.map((shot, i) => (
            <div
              key={shot.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-bg p-2 text-sm"
            >
              <span className="font-mono text-xs text-text-subtle">#{i + 1}</span>
              <span className="flex-1 truncate text-text">{shot.actionSummary}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title={t('export.moveUp')}
                disabled={i === 0}
                onClick={() => handleMoveShot(shot.id, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title={t('export.moveDown')}
                disabled={i === currentEpisode.shots.length - 1}
                onClick={() => handleMoveShot(shot.id, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-text">
            <Clock className="h-4 w-4 text-accent" /> {t('export.timeline')}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              loading={stitching}
              onClick={handleStitch}
              disabled={shotsWithVideo.length === 0}
            >
              <Film className="h-4 w-4" /> {t('export.stitch')}
            </Button>
            <Button variant="primary" loading={exporting} onClick={handleExportZip}>
              {exporting ? <Spinner className="h-4 w-4" /> : <Package className="h-4 w-4" />}
              {t('export.zip')}
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="mb-4 flex flex-wrap gap-4 text-xs text-text-muted">
            <span>{t('export.shots')} {currentEpisode.shots.length}</span>
            <span>{t('export.keyframes')} {shotsWithFrame.length}</span>
            <span className="text-success">{t('export.videoClips')} {shotsWithVideo.length}</span>
            <span>{t('export.targetDuration')} {currentEpisode.targetDuration}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {currentEpisode.shots.map((shot) => {
              const start = shot.keyframes.find((k) => k.type === 'start')
              return (
                <div key={shot.id} className="w-32 shrink-0">
                  <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-surface-2">
                    {start?.imageUrl ? (
                      <img src={start.imageUrl} alt={shot.actionSummary} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-text-subtle">
                        #{shot.index}
                      </div>
                    )}
                    {shot.interval?.videoUrl && (
                      <span className="absolute right-1 top-1 rounded bg-success/80 px-1 text-[10px] text-white">
                        <Film className="inline h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                  {shot.interval?.videoUrl && <VideoThumb src={shot.interval.videoUrl} />}
                  {shot.dubbing?.audioUrl && (
                    <audio src={shot.dubbing.audioUrl} className="mt-1 w-full" />
                  )}
                  <p className="mt-1 line-clamp-2 text-[10px] text-text-muted">{shot.actionSummary}</p>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-start gap-2 text-sm text-text-muted">
            <Download className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div>
              <p>{t('export.zipDesc')}</p>
              <p className="mt-1 text-xs text-text-subtle">{t('export.zipTip')}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
