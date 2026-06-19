/**
 * 成片合成服务
 * —— 浏览器内 canvas + MediaRecorder + AudioContext 混流：逐段绘制视频帧并录制为单一 WebM。
 *   不支持时返回 null，调用方回退 ZIP 分段。
 */
import { resolveVideoSrc } from './videoStorageService'

function pickMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(t)) return t
  }
  return 'video/webm'
}

export interface StitchOptions {
  fps?: number
  videoBitsPerSecond?: number
  onProgress?: (ratio: number) => void
}

/** 将多段视频拼接为单一视频 Blob；失败返回 null */
export async function stitchVideosToMaster(
  videoRefs: string[],
  opts: StitchOptions = {},
): Promise<Blob | null> {
  if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
    return null
  }
  const fps = opts.fps ?? 30
  const videos: HTMLVideoElement[] = []

  try {
    for (const ref of videoRefs) {
      const url = await resolveVideoSrc(ref)
      if (!url) continue
      const v = document.createElement('video')
      v.src = url
      v.muted = false
      v.playsInline = true
      await new Promise<void>((res, rej) => {
        v.onloadedmetadata = () => res()
        v.onerror = () => rej(new Error('视频加载失败'))
      })
      videos.push(v)
    }
    if (videos.length === 0) return null

    const w = videos[0].videoWidth || 1080
    const h = videos[0].videoHeight || 1920
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const stream = canvas.captureStream(fps)

    // 尝试合并音频轨道
    let audioCtx: AudioContext | null = null
    try {
      audioCtx = new AudioContext()
      const dest = audioCtx.createMediaStreamDestination()
      for (const v of videos) {
        const src = audioCtx.createMediaElementSource(v)
        src.connect(dest)
      }
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
    } catch {
      audioCtx = null
    }

    const recorder = new MediaRecorder(stream, {
      mimeType: pickMimeType(),
      videoBitsPerSecond: opts.videoBitsPerSecond ?? 8_000_000,
    })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: chunks[0]?.type ?? 'video/webm' }))
    })

    recorder.start()
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i]
      v.currentTime = 0
      await v.play().catch(() => undefined)
      await new Promise<void>((res) => {
        const draw = () => {
          ctx.drawImage(v, 0, 0, w, h)
          opts.onProgress?.((i + v.currentTime / (v.duration || 1)) / videos.length)
          if (v.ended) {
            res()
            return
          }
          requestAnimationFrame(draw)
        }
        draw()
        v.onended = () => res()
      })
      v.pause()
    }
    recorder.stop()
    if (audioCtx) await audioCtx.close()
    return await stopped
  } catch {
    return null
  }
}
