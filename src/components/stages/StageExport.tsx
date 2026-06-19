/**
 * 阶段四：成片导出
 * —— 时间轴预览（视频/配音）+ 一键打包导出（关键帧 / 视频片段 / 配音 / 分镜 JSON）。
 */
import { useState } from 'react'
import JSZip from 'jszip'
import { Clock, Download, Film, Package } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
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
  const { currentProject, currentEpisode } = useProject()
  const [exporting, setExporting] = useState(false)
  const [stitching, setStitching] = useState(false)

  if (!currentEpisode) return <EmptyState title="请先选择一集" />
  const sd = currentEpisode.scriptData
  if (!sd || currentEpisode.shots.length === 0) {
    return (
      <EmptyState
        icon={<Film className="h-10 w-10" />}
        title="还没有可导出的内容"
        description="完成剧本、资产与导演台阶段后，可在此预览时间轴并导出。"
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
        alert('当前浏览器不支持成片合成（需 MediaRecorder），请使用 ZIP 导出后在剪辑软件合成。')
      }
    } catch (err) {
      alert(`合成失败：${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setStitching(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-text">
            <Clock className="h-4 w-4 text-accent" /> 时间轴预览
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              loading={stitching}
              onClick={handleStitch}
              disabled={shotsWithVideo.length === 0}
            >
              <Film className="h-4 w-4" /> 合成成片
            </Button>
            <Button variant="primary" loading={exporting} onClick={handleExportZip}>
              {exporting ? <Spinner className="h-4 w-4" /> : <Package className="h-4 w-4" />}
              打包导出 ZIP
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="mb-4 flex flex-wrap gap-4 text-xs text-text-muted">
            <span>镜头 {currentEpisode.shots.length}</span>
            <span>关键帧 {shotsWithFrame.length}</span>
            <span className="text-success">视频片段 {shotsWithVideo.length}</span>
            <span>目标时长 {currentEpisode.targetDuration}</span>
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
              <p>ZIP 包含：所有镜头的<strong className="text-text">关键帧(PNG)</strong>、<strong className="text-text">视频片段(MP4)</strong>、<strong className="text-text">配音音频</strong>，以及 <code className="text-accent">storyboard.json</code> 分镜元数据。</p>
              <p className="mt-1 text-xs text-text-subtle">可直接导入剪辑软件（Premiere / 剪映 / DaVinci）进行最终成片合成。</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
