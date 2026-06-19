/**
 * 视频引用解析 hook
 * —— 透明处理 OPFS 引用与 data/http url：传入 ref，返回可直接用于 <video src> 的地址。
 */
import { useEffect, useState } from 'react'
import { resolveVideoSrc } from '@/services/videoStorageService'

export function useVideoSrc(ref: string | undefined): string | undefined {
  const [src, setSrc] = useState<string | undefined>(ref)
  useEffect(() => {
    let active = true
    void resolveVideoSrc(ref).then((url) => {
      if (active) setSrc(url)
    })
    return () => {
      active = false
    }
  }, [ref])
  return src
}
