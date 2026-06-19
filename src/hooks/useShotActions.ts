/**
 * 单镜头操作 hook
 * —— 包装 shotActions 纯函数，接入状态（patchShot + busy）。
 *   供 ShotCard 使用；busy 以任务键(start/end/video/dubbing)细分。
 */
import { useState } from 'react'
import { useProject } from '@/contexts/ProjectContext'
import { useAdapterContext, useModel } from '@/contexts/ModelContext'
import { useAlert } from '@/contexts/AlertContext'
import {
  generateDubbing as genDubbing,
  generateEndFrame,
  generateStartFrame,
  generateVideoClip as genVideoClip,
} from '@/services/shotActions'
import { generateNineGridImage, generateNineGridPanels, resolveGridLayout } from '@/services/shotService'
import { createKeyframe, createVideoInterval } from '@/services/factory'
import { clone } from '@/services/utils'
import { persistVideoToOPFS } from '@/services/videoStorageService'
import type { Episode, Shot, StoryboardGridPanelCount } from '@/types'

type TaskKey = 'start' | 'end' | 'video' | 'dubbing' | 'ninegrid'

/** sora/seedance 仅支持首帧，veo 支持首尾帧插值 */
export function videoSupportsEndFrame(type: 'sora' | 'veo' | 'seedance'): boolean {
  return type === 'veo'
}

export function useShotActions(shot: Shot) {
  const { currentEpisode, patchEpisode } = useProject()
  const { state } = useModel()
  const adapterCtx = useAdapterContext()
  const { alert } = useAlert()

  const [busy, setBusy] = useState<Record<TaskKey, boolean>>({
    start: false,
    end: false,
    video: false,
    dubbing: false,
    ninegrid: false,
  })
  const [videoStatus, setVideoStatus] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sd = currentEpisode?.scriptData ?? null
  const ready = Boolean(adapterCtx && state)

  const patchShot = (mutator: (s: Shot) => Shot) => {
    if (!currentEpisode) return
    void patchEpisode(currentEpisode.id, (e: Episode) => {
      const shots = clone(e.shots)
      const idx = shots.findIndex((s) => s.id === shot.id)
      if (idx >= 0) shots[idx] = mutator(shots[idx])
      return { ...e, shots }
    })
  }

  const run = async (key: TaskKey, fn: () => Promise<void>) => {
    setError(null)
    setBusy((b) => ({ ...b, [key]: true }))
    try {
      await fn()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      alert(msg, 'danger')
    } finally {
      setBusy((b) => ({ ...b, [key]: false }))
    }
  }

  const generateStart = () =>
    run('start', async () => {
      if (!adapterCtx || !state) throw new Error('模型未就绪')
      const kf = shot.keyframes.find((k) => k.type === 'start') ?? shot.keyframes[0]
      if (!kf) throw new Error('缺少首帧槽位')
      patchShot((s) => ({
        ...s,
        keyframes: s.keyframes.map((k) => (k.id === kf.id ? { ...k, status: 'generating' } : k)),
      }))
      const img = await generateStartFrame(
        adapterCtx,
        shot,
        sd,
        state.currentConfig.imageModel,
        state.defaultAspectRatio,
      )
      patchShot((s) => ({
        ...s,
        keyframes: s.keyframes.map((k) =>
          k.id === kf.id ? { ...k, imageUrl: img, status: 'completed' } : k,
        ),
      }))
    })

  const generateEnd = () =>
    run('end', async () => {
      if (!adapterCtx || !state) throw new Error('模型未就绪')
      let end = shot.keyframes.find((k) => k.type === 'end')
      if (!end) {
        end = createKeyframe('end', shot.actionSummary)
        patchShot((s) => ({ ...s, keyframes: [...s.keyframes, end!] }))
      }
      const endId = end.id
      patchShot((s) => ({
        ...s,
        keyframes: s.keyframes.map((k) => (k.id === endId ? { ...k, status: 'generating' } : k)),
      }))
      const img = await generateEndFrame(
        adapterCtx,
        shot,
        sd,
        state.currentConfig.imageModel,
        state.defaultAspectRatio,
      )
      patchShot((s) => ({
        ...s,
        keyframes: s.keyframes.map((k) =>
          k.id === endId ? { ...k, imageUrl: img, status: 'completed' } : k,
        ),
      }))
    })

  const generateVideoClip = () =>
    run('video', async () => {
      if (!adapterCtx || !state) throw new Error('模型未就绪')
      const start = shot.keyframes.find((k) => k.type === 'start')
      if (!start?.imageUrl) throw new Error('请先生成首帧')
      setVideoStatus('提交任务…')
      patchShot((s) => ({
        ...s,
        interval: {
          ...(s.interval ?? createVideoInterval(start.id, 5)),
          status: 'generating',
        },
      }))
      const rawVideoUrl = await genVideoClip(
        adapterCtx,
        shot,
        sd,
        state.currentConfig.videoModel,
        state.defaultAspectRatio,
        (status) => setVideoStatus(status),
      )
      // 大视频持久化至 OPFS，规避 IndexedDB 容量上限
      const videoUrl = await persistVideoToOPFS(rawVideoUrl)
      patchShot((s) => ({
        ...s,
        interval: {
          ...(s.interval ?? createVideoInterval(start.id, 5)),
          videoUrl,
          status: 'completed',
        },
      }))
      setVideoStatus('')
    })

  const generateDubbing = (text: string, mode: 'narration' | 'dialogue') =>
    run('dubbing', async () => {
      if (!adapterCtx || !state) throw new Error('模型未就绪')
      if (!text.trim()) throw new Error('配音文本为空')
      patchShot((s) => ({
        ...s,
        dubbing: { mode, text, modelId: state.currentConfig.audioModel.modelName, status: 'generating' },
      }))
      const audioUrl = await genDubbing(adapterCtx, text, state.currentConfig.audioModel)
      patchShot((s) => ({
        ...s,
        dubbing: { mode, text, modelId: state.currentConfig.audioModel.modelName, audioUrl, status: 'completed' },
      }))
    })

  const generateNineGrid = (panelCount: StoryboardGridPanelCount) =>
    run('ninegrid', async () => {
      if (!adapterCtx || !state || !sd) throw new Error('模型未就绪')
      patchShot((s) => ({ ...s, nineGrid: { panels: [], status: 'generating' } }))
      const panels = await generateNineGridPanels(adapterCtx, {
        shot,
        sd,
        panelCount,
        chatModel: state.currentConfig.chatModel,
      })
      const imageUrl = await generateNineGridImage(adapterCtx, {
        panels,
        imageModel: state.currentConfig.imageModel,
        anchor: sd.artDirection?.consistencyAnchors,
      })
      patchShot((s) => ({
        ...s,
        nineGrid: { panels, layout: resolveGridLayout(panelCount), imageUrl, status: 'completed' },
      }))
    })

  return {
    sd,
    ready,
    busy,
    videoStatus,
    error,
    supportsEndFrame: state ? videoSupportsEndFrame(state.currentConfig.videoModel.type) : false,
    generateStart,
    generateEnd,
    generateVideoClip,
    generateDubbing,
    generateNineGrid,
  }
}
