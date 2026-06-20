/**
 * 项目资产库面板
 * —— 浏览并编辑项目级共享资产（角色/场景/道具）。编辑提示词会 version+1，
 *   触发引用该资产的各集 ref 变 outdated，由同步横幅提示拉取。
 */
import { Pencil } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { useI18n } from '@/contexts/I18nContext'
import { updateLibraryAsset } from '@/services/assetLibraryService'
import { Badge, Modal } from './ui'
import type { AssetKind, VisualAsset } from '@/types'

export function ProjectLibraryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentProject, updateProject } = useProject()
  const { t } = useI18n()

  if (!currentProject) {
    return (
      <Modal open={open} onClose={onClose} title={t('library.title')}>
        <p className="py-8 text-center text-sm text-text-muted">{t('library.noProject')}</p>
      </Modal>
    )
  }

  const handleEdit = (kind: AssetKind, asset: VisualAsset) => {
    const prompt = window.prompt(t('library.editPromptConfirm'), asset.visualPrompt ?? '')
    if (prompt === null) return
    updateProject(updateLibraryAsset(currentProject, kind, asset.id, { visualPrompt: prompt }))
  }

  const sections: { titleKey: string; kind: AssetKind; items: VisualAsset[] }[] = [
    { titleKey: 'library.char', kind: 'character', items: currentProject.characterLibrary },
    { titleKey: 'library.scene', kind: 'scene', items: currentProject.sceneLibrary },
    { titleKey: 'library.prop', kind: 'prop', items: currentProject.propLibrary },
  ]

  return (
    <Modal open={open} onClose={onClose} title={t('library.titleWithProject', { title: currentProject.title })} size="lg">
      <div className="space-y-4">
        <p className="text-xs text-text-muted">
          {t('library.desc')}
        </p>
        {sections.map((sec) => (
          <div key={sec.titleKey}>
            <h3 className="mb-2 text-sm font-medium text-text">
              {t(sec.titleKey)}（{sec.items.length}）
            </h3>
            {sec.items.length === 0 ? (
              <p className="text-xs text-text-subtle">{t('library.empty')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {sec.items.map((a) => (
                  <div key={a.id} className="overflow-hidden rounded-lg border border-border bg-bg">
                    <div className="aspect-square bg-surface-2">
                      {a.referenceImage ? (
                        <img src={a.referenceImage} alt={a.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-text-subtle">{t('library.noImage')}</div>
                      )}
                    </div>
                    <div className="p-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs text-text">{a.name}</span>
                        <button
                          title={t('library.editPromptTitle')}
                          onClick={() => handleEdit(sec.kind, a)}
                          className="shrink-0 rounded p-0.5 text-text-subtle hover:bg-surface-2 hover:text-text"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                      <Badge>v{a.version ?? 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}
