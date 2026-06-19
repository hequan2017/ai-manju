/**
 * 渲染日志面板
 * —— 展示当前集的 AI 调用记录（类型/资源/模型/状态/耗时）。
 */
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { Episode } from '@/types'
import { Badge, Modal } from './ui'

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}

export function RenderLogsModal({
  open,
  onClose,
  episode,
}: {
  open: boolean
  onClose: () => void
  episode: Episode | null
}) {
  return (
    <Modal open={open} onClose={onClose} title="渲染日志" size="lg">
      {!episode || episode.renderLogs.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">暂无调用记录</p>
      ) : (
        <div className="space-y-1.5">
          {episode.renderLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-xs"
            >
              {log.status === 'success' ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0 text-danger" />
              )}
              <Badge>{log.type}</Badge>
              <span className="min-w-0 flex-1 truncate text-text">{log.resourceName}</span>
              <span className="font-mono text-text-subtle">{log.model}</span>
              <span className="flex items-center gap-0.5 text-text-subtle">
                <Clock className="h-3 w-3" />
                {log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '—'}
              </span>
              <span className="text-text-subtle">{formatTime(log.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
