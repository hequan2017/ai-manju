/**
 * 资产同步横幅
 * —— 当前集存在落后于项目库的资产时，提示并提供「同步全部」拉取最新。
 */
import { useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { useI18n } from '@/contexts/I18nContext'
import { checkAllSync, syncAll } from '@/services/characterSyncService'
import { Button } from './ui'

export function AssetSyncBanner() {
  const { currentEpisode, currentProject, patchEpisode } = useProject()
  const { t } = useI18n()
  const [syncing, setSyncing] = useState(false)

  if (!currentEpisode || !currentProject || !currentEpisode.scriptData) return null

  const groups = checkAllSync(currentEpisode, currentProject)
  const total = groups.reduce((n, g) => n + g.issues.filter((i) => i.status === 'outdated').length, 0)
  if (total === 0) return null

  const handleSync = async () => {
    setSyncing(true)
    try {
      const next = syncAll(currentEpisode, currentProject)
      await patchEpisode(currentEpisode.id, () => next)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <span className="text-text">
        {t('sync.banner', { n: total })}
      </span>
      <Button size="sm" variant="primary" loading={syncing} onClick={handleSync} className="ml-auto">
        <RefreshCw className="h-4 w-4" /> {t('sync.all')}
      </Button>
    </div>
  )
}
