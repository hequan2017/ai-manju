/**
 * OPFS 视频大对象存储
 * —— 将视频(base64)移出 IndexedDB 至 Origin Private File System，规避 IndexedDB 容量上限。
 *   集成点：视频生成后 persistVideoToOPFS；播放前 resolveVideoSrc 还原为 objectURL。
 */
import { blobToDataURL, dataURLToBytes } from './utils'

const OPFS_PREFIX = 'opfs://video/'
const VIDEO_DIR = 'videos'

export function isOPFSRef(value: string | undefined): boolean {
  return !!value && value.startsWith(OPFS_PREFIX)
}

export function supportsOPFS(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory
}

async function getVideoDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(VIDEO_DIR, { create: true })
}

function pickExt(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mov')) return 'mov'
  if (mime.includes('ogv')) return 'ogv'
  return 'mp4'
}

/** 将 base64 data url 视频持久化到 OPFS，返回 opfs:// 引用；非 data url 原样返回 */
export async function persistVideoToOPFS(value: string): Promise<string> {
  if (!supportsOPFS() || !value.startsWith('data:')) return value
  const { bytes, mime } = dataURLToBytes(value)
  const name = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}.${pickExt(mime)}`
  const dir = await getVideoDir()
  const fh = await dir.getFileHandle(name, { create: true })
  // createWritable 为 OPFS 同步句柄写入口（Chromium 系支持）
  const writable = await (fh as unknown as {
    createWritable: () => Promise<FileSystemWritableFileStream>
  }).createWritable()
  await writable.write(bytes)
  await writable.close()
  return OPFS_PREFIX + name
}

/** 将视频引用物化为 data url（OPFS ref 读取为 base64）；用于导出打包 */
export async function materializeVideoRef(value: string | undefined): Promise<string | undefined> {
  if (!value) return undefined
  if (!isOPFSRef(value)) return value
  const name = value.slice(OPFS_PREFIX.length)
  try {
    const dir = await getVideoDir()
    const fh = await dir.getFileHandle(name)
    const file = await fh.getFile()
    return blobToDataURL(file)
  } catch {
    return undefined
  }
}

/** 解析视频引用为可播放的 objectURL；非 OPFS 引用（data/http）原样返回 */
export async function resolveVideoSrc(value: string | undefined): Promise<string | undefined> {
  if (!value) return undefined
  if (!isOPFSRef(value)) return value
  const name = value.slice(OPFS_PREFIX.length)
  try {
    const dir = await getVideoDir()
    const fh = await dir.getFileHandle(name)
    const file = await fh.getFile()
    return URL.createObjectURL(file)
  } catch {
    return undefined
  }
}
