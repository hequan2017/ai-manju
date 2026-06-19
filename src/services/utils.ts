/**
 * 通用工具函数
 */

/** 生成唯一 id（优先 crypto.randomUUID，回退时间戳+随机） */
export const uid = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** 当前时间戳（毫秒） */
export const now = (): number => Date.now()

/** 深拷贝（结构化克隆，用于可序列化的领域对象） */
export const clone = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value
  return structuredClone(value)
}

/**
 * 阻塞式 sleep。用于轮询异步视频任务的节流。
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 读取文本型 Response 的 JSON，统一错误信息。
 */
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`响应不是合法 JSON：${text.slice(0, 200)}`)
  }
}

/**
 * 从大模型输出中稳健地提取 JSON（兼容 ```json 代码块包裹与前后多余文本）。
 */
export function extractJSON<T = unknown>(raw: string): T {
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()

  const objStart = s.indexOf('{')
  const objEnd = s.lastIndexOf('}')
  const arrStart = s.indexOf('[')
  const arrEnd = s.lastIndexOf(']')

  const hasObj = objStart !== -1 && objEnd !== -1 && objEnd > objStart
  const hasArr = arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart

  let candidate = s
  if (hasObj && (!hasArr || objStart <= arrStart)) {
    candidate = s.slice(objStart, objEnd + 1)
  } else if (hasArr) {
    candidate = s.slice(arrStart, arrEnd + 1)
  }

  try {
    return JSON.parse(candidate) as T
  } catch (err) {
    throw new Error(`无法解析 JSON：${err instanceof Error ? err.message : String(err)}；原文：${raw.slice(0, 200)}`)
  }
}

/** Blob 转 base64 data url */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('FileReader 读取失败'))
    reader.readAsDataURL(blob)
  })
}

/** 将远程媒体 URL 拉取为 base64 data url（避免链接过期，便于 IndexedDB 持久化） */
export async function fetchUrlAsDataURL(url: string): Promise<string> {
  const { fetchMediaWithCorsFallback } = await import('./mediaFetchService')
  const res = await fetchMediaWithCorsFallback(url)
  if (!res.ok) throw new Error(`媒体下载失败 (${res.status})：${url}`)
  const blob = await res.blob()
  return blobToDataURL(blob)
}

/** 横竖屏比例映射为像素尺寸（用于图像生成参数） */
export function aspectToSize(aspect: string): string {
  switch (aspect) {
    case '9:16':
      return '1024x1792'
    case '1:1':
      return '1024x1024'
    case '16:9':
    default:
      return '1792x1024'
  }
}

/** 横竖屏比例映射为视频尺寸（用于视频生成参数） */
export function aspectToVideoSize(aspect: string): string {
  switch (aspect) {
    case '9:16':
      return '1080x1920'
    case '1:1':
      return '1080x1080'
    case '16:9':
    default:
      return '1920x1080'
  }
}

/** data url 解析为字节数组与 MIME（用于导出打包、multipart 上传） */
export function dataURLToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const [meta, b64] = dataUrl.split(',')
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? 'application/octet-stream'
  const bin = atob(b64 ?? '')
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { bytes, mime }
}

/** data url 转 Blob */
export function dataURLToBlob(dataUrl: string): Blob {
  const { bytes, mime } = dataURLToBytes(dataUrl)
  return new Blob([bytes], { type: mime })
}

/** 触发浏览器下载一个 Blob */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 时长解析（秒）：支持 90 / 90s / 3min / 2h / 1m30s / 02:30 / 1小时30分钟 等。
 */
export function parseDurationToSeconds(input: string | undefined): number | null {
  if (!input) return null
  const s = input.trim().toLowerCase()
  if (!s) return null

  // mm:ss 或 hh:mm:ss
  const parts = s.split(':').map((p) => parseInt(p, 10))
  if (parts.length >= 2 && parts.length <= 3 && parts.every((p) => !isNaN(p))) {
    return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  // 纯数字 → 秒
  if (/^\d+$/.test(s)) return parseInt(s, 10)

  // 单位复合
  const units: Array<[RegExp, number]> = [
    [/(\d+)\s*(小时|hours?|hrs?|h)(?![a-z])/i, 3600],
    [/(\d+)\s*(分钟|minutes?|mins?|m)(?![a-z])/i, 60],
    [/(\d+)\s*(秒|seconds?|secs?|s)(?![a-z])/i, 1],
  ]
  let total = 0
  let matched = false
  for (const [re, mult] of units) {
    const m = s.match(re)
    if (m) {
      matched = true
      total += parseInt(m[1], 10) * mult
    }
  }
  return matched && total > 0 ? total : null
}

/** djb2 风格字符串哈希（用于分镜指纹缓存） */
export function hashText(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}
