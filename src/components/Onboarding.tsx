/**
 * 首次配置引导
 * —— 当未配置任何 API Key 时，在 Dashboard 顶部提示并引导前往模型配置。
 */
import { useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound } from 'lucide-react'
import { useModel } from '@/contexts/ModelContext'
import { useI18n } from '@/contexts/I18nContext'
import { hasUsableApiKey } from '@/services/modelService'
import { Button } from './ui'

export function Onboarding() {
  const { state } = useModel()
  const navigate = useNavigate()
  const { t } = useI18n()
  if (!state || hasUsableApiKey(state)) return null

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft p-4">
      <KeyRound className="h-5 w-5 shrink-0 text-accent" />
      <div className="flex-1">
        <p className="text-sm font-medium text-text">{t('dashboard.onboarding.title')}</p>
        <p className="text-xs text-text-muted">
          {t('dashboard.onboarding.desc')}
        </p>
      </div>
      <Button variant="primary" onClick={() => navigate('/settings')}>
        {t('dashboard.onboarding.action')} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
