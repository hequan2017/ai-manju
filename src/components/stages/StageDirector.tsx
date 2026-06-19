/**
 * 阶段三：导演台
 * —— 镜头工作卡网格 + 批量首帧/视频生成。每张卡片由 ShotCard 承载完整创作能力。
 */
import { useState } from 'react'
import { AlertTriangle, Camera, Film, Wand2 } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { useAdapterContext, useModel } from '@/contexts/ModelContext'
import { generateStartFrame, generateVideoClip } from '@/services/shotActions'
import { clone } from '@/services/utils'
import type { GenerationStatus, Shot } from '@/types'
import { Button, Card, CardBody, CardHeader, EmptyState } from '../ui'
import { ShotCard } from './ShotCard'

export function StageDirector() {
  const { currentEpisode, patchEpisode } = useProject()
  const { state } = useModel()
  const adapterCtx = useAdapterContext()
  const [batch, setBatch] = useState<'' | 'start' | 'video'>('')
  const [error, setError] = useState<string | null>(null)

  if (!currentEpisode) return <EmptyState title="请先选择一集" />
  const sd = currentEpisode.scriptData
  if (!sd || currentEpisode.shots.length === 0) {
    return (
      <EmptyState
        icon={<Film className="h-10 w-10" />}
        title="还没有分镜"
        description="请先在「剧本」阶段完成 AI 拆解。"
      />
    )
  }

  const patchShot = (shotId: string, mutator: (s: Shot) => Shot) =>
    patchEpisode(currentEpisode.id, (e) => {
      const shots = clone(e.shots)
      const idx = shots.findIndex((s) => s.id === shotId)
      if (idx >= 0) shots[idx] = mutator(shots[idx])
      return { ...e, shots }
    })

  const batchStartFrames = async () => {
    if (!adapterCtx || !state) return setError('模型未就绪，请先配置')
    setBatch('start')
    setError(null)
    for (const shot of currentEpisode.shots) {
      // eslint-disable-next-line no-await-in-loop
      try {
        const img = await generateStartFrame(
          adapterCtx,
          shot,
          sd,
          state.currentConfig.imageModel,
          state.defaultAspectRatio,
        )
        await patchShot(shot.id, (s) => {
          const kf = s.keyframes.find((k) => k.type === 'start') ?? s.keyframes[0]
          return {
            ...s,
            keyframes: s.keyframes.map((k) =>
              k.id === kf?.id ? { ...k, imageUrl: img, status: 'completed' as GenerationStatus } : k,
            ),
          }
        })
      } catch (err) {
        setError(`镜头 #${shot.index} 首帧失败：${err instanceof Error ? err.message : String(err)}`)
        break
      }
    }
    setBatch('')
  }

  const batchVideos = async () => {
    if (!adapterCtx || !state) return setError('模型未就绪，请先配置')
    setBatch('video')
    setError(null)
    for (const shot of currentEpisode.shots) {
      const start = shot.keyframes.find((k) => k.type === 'start')
      if (!start?.imageUrl) continue
      await patchShot(shot.id, (s) => ({
        ...s,
        interval: { ...(s.interval ?? { id: '', startKeyframeId: start.id, duration: 5, status: 'pending' }), status: 'generating' },
      }))
      // eslint-disable-next-line no-await-in-loop
      try {
        const videoUrl = await generateVideoClip(
          adapterCtx,
          shot,
          sd,
          state.currentConfig.videoModel,
          state.defaultAspectRatio,
        )
        await patchShot(shot.id, (s) => ({
          ...s,
          interval: {
            ...(s.interval ?? { id: '', startKeyframeId: start.id, duration: 5, status: 'pending' }),
            videoUrl,
            status: 'completed',
          },
        }))
      } catch (err) {
        setError(`镜头 #${shot.index} 视频失败：${err instanceof Error ? err.message : String(err)}`)
        break
      }
    }
    setBatch('')
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-text">
            <Camera className="h-4 w-4 text-accent" /> 镜头工作台（{currentEpisode.shots.length}）
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" loading={batch === 'start'} onClick={batchStartFrames}>
              <Wand2 className="h-4 w-4" /> 批量首帧
            </Button>
            <Button size="sm" variant="outline" loading={batch === 'video'} onClick={batchVideos}>
              <Film className="h-4 w-4" /> 批量视频
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {currentEpisode.shots.map((shot) => (
              <ShotCard key={shot.id} shot={shot} />
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
