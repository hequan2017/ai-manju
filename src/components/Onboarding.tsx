/**
 * 首次配置引导
 * —— 当未配置任何 API Key 时，在 Dashboard 顶部提示并引导前往模型配置。
 */
import { useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound } from 'lucide-react'
import { useModel } from '@/contexts/ModelContext'
import { hasUsableApiKey } from '@/services/modelService'
import { Button } from './ui'

export function Onboarding() {
  const { state } = useModel()
  const navigate = useNavigate()
  if (!state || hasUsableApiKey(state)) return null

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft p-4">
      <KeyRound className="h-5 w-5 shrink-0 text-accent" />
      <div className="flex-1">
        <p className="text-sm font-medium text-text">欢迎使用 AI 漫剧平台</p>
        <p className="text-xs text-text-muted">
          开始创作前，请先配置 AI 供应商与 API Key（对话 / 图像 / 视频 / 语音四类模型）。
        </p>
      </div>
      <Button variant="primary" onClick={() => navigate('/settings')}>
        前往配置 <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
