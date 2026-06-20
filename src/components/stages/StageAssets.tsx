/**
 * 阶段二：资产与选角
 * —— 基于剧本结构生成角色定妆图、场景概念图、道具参考图。
 *   美术指导锚点注入提示词，保证全片视觉一致性。
 */
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { AlertTriangle, ImageOff, Loader2, MapPin, Pencil, Shirt, Sparkles, Upload, User, Wand2 } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { useAdapterContext, useModel } from '@/contexts/ModelContext'
import { useAlert } from '@/contexts/AlertContext'
import { useI18n } from '@/contexts/I18nContext'
import {
  generateAssetImage,
  type AssetImageKind,
} from '@/services/assetService'
import { generateAllCharacterPrompts } from '@/services/visualService'
import { clone } from '@/services/utils'
import { appendPromptVersion } from '@/services/promptVersionService'
import type { Character, Prop, Scene, VisualAsset } from '@/types'
import { WardrobeModal } from '../WardrobeModal'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
} from '../ui'

export function StageAssets() {
  const { currentEpisode, patchEpisode } = useProject()
  const { state } = useModel()
  const adapterCtx = useAdapterContext()
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const { alert } = useAlert()
  const { t } = useI18n()
  const [batchKind, setBatchKind] = useState<AssetImageKind | null>(null)
  const [wardrobeChar, setWardrobeChar] = useState<Character | null>(null)
  const [enriching, setEnriching] = useState(false)

  if (!currentEpisode) {
    return <EmptyState title={t('common.emptyEpisode')} />
  }
  const sd = currentEpisode.scriptData
  if (!sd) {
    return (
      <EmptyState
        icon={<Sparkles className="h-10 w-10" />}
        title={t('assets.noScript')}
        description={t('assets.noScriptDesc')}
      />
    )
  }

  const imageModel = state?.currentConfig.imageModel
  const aspect = state?.defaultAspectRatio ?? '9:16'

  /** 深层更新 scriptData 中的单个资产 */
  const patchAsset = (
    kind: AssetImageKind,
    id: string,
    mutator: (a: VisualAsset) => VisualAsset,
  ) => {
    patchEpisode(currentEpisode.id, (e) => {
      if (!e.scriptData) return e
      const next = clone(e.scriptData)
      if (kind === 'character') {
        const idx = next.characters.findIndex((a) => a.id === id)
        if (idx >= 0) next.characters[idx] = mutator(next.characters[idx]) as Character
      } else if (kind === 'scene') {
        const idx = next.scenes.findIndex((a) => a.id === id)
        if (idx >= 0) next.scenes[idx] = mutator(next.scenes[idx]) as Scene
      } else {
        const idx = next.props.findIndex((a) => a.id === id)
        if (idx >= 0) next.props[idx] = mutator(next.props[idx]) as Prop
      }
      return { ...e, scriptData: next }
    })
  }

  const generateOne = async (kind: AssetImageKind, asset: VisualAsset) => {
    if (!adapterCtx || !imageModel) {
      setError(t('assets.imageNotReady'))
      return
    }
    setError(null)
    setBusyIds((prev) => new Set(prev).add(asset.id))
    patchAsset(kind, asset.id, (a) => ({ ...a, status: 'generating' }))
    try {
      const img = await generateAssetImage(adapterCtx, {
        imageModel,
        aspect,
        kind,
        visualPrompt: asset.visualPrompt,
        negative: asset.negativePrompt,
        artDirection: sd.artDirection,
        referenceImage: asset.referenceImage,
      })
      patchAsset(kind, asset.id, (a) => ({ ...a, referenceImage: img, status: 'completed' }))
    } catch (err) {
      patchAsset(kind, asset.id, (a) => ({ ...a, status: 'failed' }))
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(asset.id)
        return next
      })
    }
  }

  const handleUploadImage = (kind: AssetImageKind, asset: VisualAsset, dataUrl: string) => {
    patchAsset(kind, asset.id, (a) => ({ ...a, referenceImage: dataUrl, status: 'completed' }))
  }

  const handleWardrobeSave = (next: Character) => {
    patchAsset('character', next.id, () => next)
    setWardrobeChar(next)
  }

  const handleEditPrompt = (kind: AssetImageKind, asset: VisualAsset, prompt: string) => {
    patchAsset(kind, asset.id, (a) => ({
      ...a,
      visualPrompt: prompt,
      promptVersions: appendPromptVersion(a.promptVersions, prompt, 'manual-edit'),
    }))
  }

  /** AI 批量补全角色视觉提示词（6点结构化，风格统一） */
  const handleEnrichCharacters = async () => {
    if (!adapterCtx || !state || !sd) return
    setEnriching(true)
    try {
      const map = await generateAllCharacterPrompts(adapterCtx, {
        characters: sd.characters,
        visualStyle: currentEpisode.visualStyle,
        chatModel: state.currentConfig.chatModel,
      })
      patchEpisode(currentEpisode.id, (e) => {
        if (!e.scriptData) return e
        const next = clone(e.scriptData)
        next.characters = next.characters.map((c) =>
          map[c.id] ? { ...c, visualPrompt: map[c.id] } : c,
        )
        return { ...e, scriptData: next }
      })
      alert(t('assets.enrichDone'), 'success')
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err), 'danger')
    } finally {
      setEnriching(false)
    }
  }

  const generateBatch = async (kind: AssetImageKind) => {
    const list: VisualAsset[] =
      kind === 'character' ? sd.characters : kind === 'scene' ? sd.scenes : sd.props
    setBatchKind(kind)
    for (const asset of list) {
      // eslint-disable-next-line no-await-in-loop -- 顺序生成以控制 API 压力与一致性
      await generateOne(kind, asset)
    }
    setBatchKind(null)
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      )}

      {!imageModel && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {t('assets.noImageModel')}
        </div>
      )}

      {sd.characters.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" loading={enriching} onClick={handleEnrichCharacters}>
            <Wand2 className="h-4 w-4" /> {t('assets.enrich')}
          </Button>
        </div>
      )}

      <AssetSection<Character>
        title={t('assets.charTitle')}
        icon={<User className="h-4 w-4 text-accent" />}
        kind="character"
        assets={sd.characters}
        busyIds={busyIds}
        batchKind={batchKind}
        aspect={aspect}
        onGenerate={generateOne}
        onBatch={generateBatch}
        onUploadImage={handleUploadImage}
        onEditPrompt={handleEditPrompt}
        onVariations={(a) => setWardrobeChar(a as Character)}
      />

      <AssetSection<Scene>
        title={t('assets.sceneTitle')}
        icon={<MapPin className="h-4 w-4 text-accent" />}
        kind="scene"
        assets={sd.scenes}
        busyIds={busyIds}
        batchKind={batchKind}
        aspect={aspect}
        onGenerate={generateOne}
        onBatch={generateBatch}
        onUploadImage={handleUploadImage}
        onEditPrompt={handleEditPrompt}
      />

      {sd.props.length > 0 && (
        <AssetSection<Prop>
          title={t('assets.propTitle')}
          icon={<Sparkles className="h-4 w-4 text-accent" />}
          kind="prop"
          assets={sd.props}
          busyIds={busyIds}
          batchKind={batchKind}
          aspect={aspect}
          onGenerate={generateOne}
          onBatch={generateBatch}
        onUploadImage={handleUploadImage}
        onEditPrompt={handleEditPrompt}
        />
      )}

      {wardrobeChar && (
        <WardrobeModal
          character={wardrobeChar}
          artDirectionAnchor={sd.artDirection?.consistencyAnchors}
          onClose={() => setWardrobeChar(null)}
          onSave={handleWardrobeSave}
        />
      )}
    </div>
  )
}

interface AssetSectionProps<T extends VisualAsset> {
  title: string
  icon: ReactNode
  kind: AssetImageKind
  assets: T[]
  busyIds: Set<string>
  batchKind: AssetImageKind | null
  aspect: string
  onGenerate: (kind: AssetImageKind, asset: VisualAsset) => void
  onBatch: (kind: AssetImageKind) => void
  onUploadImage: (kind: AssetImageKind, asset: VisualAsset, dataUrl: string) => void
  onVariations?: (asset: VisualAsset) => void
  onEditPrompt: (kind: AssetImageKind, asset: VisualAsset, prompt: string) => void
}

function AssetSection<T extends VisualAsset>({
  title,
  icon,
  kind,
  assets,
  busyIds,
  batchKind,
  aspect,
  onGenerate,
  onBatch,
  onUploadImage,
  onVariations,
  onEditPrompt,
}: AssetSectionProps<T>) {
  const { t } = useI18n()
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-text">
          {icon} {t('assets.titleCount', { title, n: assets.length })}
        </span>
        <Button
          size="sm"
          variant="outline"
          loading={batchKind === kind}
          onClick={() => onBatch(kind)}
        >
          <Wand2 className="h-4 w-4" /> {t('assets.batch')}
        </Button>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => {
            const busy = busyIds.has(asset.id) || asset.status === 'generating'
            return (
              <AssetCard
                key={asset.id}
                asset={asset}
                aspect={aspect}
                busy={busy}
                onGenerate={() => onGenerate(kind, asset)}
                onUploadImage={(dataUrl) => onUploadImage(kind, asset, dataUrl)}
                onVariations={onVariations ? () => onVariations(asset) : undefined}
                onEditPrompt={(prompt) => onEditPrompt(kind, asset, prompt)}
              />
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}

function AssetCard({
  asset,
  aspect,
  busy,
  onGenerate,
  onUploadImage,
  onVariations,
  onEditPrompt,
}: {
  asset: VisualAsset
  aspect: string
  busy: boolean
  onGenerate: () => void
  onUploadImage?: (dataUrl: string) => void
  onVariations?: () => void
  onEditPrompt?: (prompt: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [promptDraft, setPromptDraft] = useState('')
  const { t } = useI18n()
  const aspectClass = aspect === '9:16' ? 'aspect-[9/16]' : aspect === '1:1' ? 'aspect-square' : 'aspect-video'
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => onUploadImage?.(reader.result as string)
    reader.readAsDataURL(f)
    e.target.value = ''
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <div className={`${aspectClass} relative w-full bg-surface-2`}>
        {asset.referenceImage ? (
          <img src={asset.referenceImage} alt={asset.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-text-subtle">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageOff className="h-6 w-6" />}
          </div>
        )}
        {asset.status === 'failed' && (
          <Badge tone="danger" className="absolute right-1 top-1">{t('assets.failed')}</Badge>
        )}
      </div>
      <div className="p-2.5">
        <div className="truncate text-xs font-medium text-text">{asset.name}</div>
        {editingPrompt ? (
          <div className="mt-1 space-y-1">
            <textarea
              rows={2}
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              className="w-full resize-y rounded border border-border bg-bg px-1 py-0.5 text-[10px] text-text focus:border-accent focus:outline-none"
            />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => setEditingPrompt(false)}>{t('common.cancel')}</Button>
              <Button size="sm" variant="primary" className="flex-1" onClick={() => { onEditPrompt?.(promptDraft); setEditingPrompt(false) }}>{t('common.save')}</Button>
            </div>
          </div>
        ) : (
          <>
            {asset.visualPrompt && (
              <p className="mt-0.5 line-clamp-2 font-mono text-[10px] text-text-subtle">{asset.visualPrompt}</p>
            )}
            {onEditPrompt && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 w-full"
                onClick={() => { setEditingPrompt(true); setPromptDraft(asset.visualPrompt ?? '') }}
              >
                <Pencil className="h-3 w-3" /> {t('assets.editPrompt')}
              </Button>
            )}
            {asset.promptVersions && asset.promptVersions.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-[10px] text-text-subtle">
                  {t('assets.history')} ({asset.promptVersions.length})
                </summary>
                <div className="mt-1 max-h-24 space-y-0.5 overflow-y-auto">
                  {[...asset.promptVersions].reverse().map((v) => (
                    <button
                      key={v.id}
                      className="block w-full truncate rounded px-1 py-0.5 text-left text-[10px] text-text-muted hover:bg-surface-2"
                      title={v.prompt}
                      onClick={() => onEditPrompt?.(v.prompt)}
                    >
                      {v.source}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
        <Button
          size="sm"
          variant={asset.referenceImage ? 'ghost' : 'primary'}
          className="mt-2 w-full"
          loading={busy}
          onClick={onGenerate}
        >
          {asset.referenceImage ? t('assets.regenRef') : t('assets.genRef')}
        </Button>
        {onUploadImage && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <Button
              size="sm"
              variant="ghost"
              className="mt-1 w-full"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> {t('assets.upload')}
            </Button>
          </>
        )}
        {onVariations && (
          <Button size="sm" variant="ghost" className="mt-1 w-full" onClick={onVariations}>
            <Shirt className="h-3.5 w-3.5" /> {t('assets.wardrobe')}
            {(asset as Character).variations?.length
              ? ` (${(asset as Character).variations.length})`
              : ''}
          </Button>
        )}
      </div>
    </div>
  )
}
