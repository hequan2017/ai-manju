/**
 * 阶段二：资产与选角
 * —— 基于剧本结构生成角色定妆图、场景概念图、道具参考图。
 *   美术指导锚点注入提示词，保证全片视觉一致性。
 */
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { AlertTriangle, ImageOff, Loader2, MapPin, Shirt, Sparkles, Upload, User, Wand2 } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { useAdapterContext, useModel } from '@/contexts/ModelContext'
import { useAlert } from '@/contexts/AlertContext'
import {
  generateAssetImage,
  type AssetImageKind,
} from '@/services/assetService'
import { generateAllCharacterPrompts } from '@/services/visualService'
import { clone } from '@/services/utils'
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
  const [batchKind, setBatchKind] = useState<AssetImageKind | null>(null)
  const [wardrobeChar, setWardrobeChar] = useState<Character | null>(null)
  const [enriching, setEnriching] = useState(false)

  if (!currentEpisode) {
    return <EmptyState title="请先选择一集" />
  }
  const sd = currentEpisode.scriptData
  if (!sd) {
    return (
      <EmptyState
        icon={<Sparkles className="h-10 w-10" />}
        title="还没有剧本结构"
        description="请先在「剧本」阶段完成 AI 拆解，再生成资产定妆图。"
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
      setError('图像模型未就绪，请先在「模型配置」中配置')
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
      alert('角色提示词已补全', 'success')
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
          尚未配置图像模型，请前往「模型配置」。
        </div>
      )}

      {sd.characters.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" loading={enriching} onClick={handleEnrichCharacters}>
            <Wand2 className="h-4 w-4" /> AI 补全角色提示词
          </Button>
        </div>
      )}

      <AssetSection<Character>
        title="角色定妆"
        icon={<User className="h-4 w-4 text-accent" />}
        kind="character"
        assets={sd.characters}
        busyIds={busyIds}
        batchKind={batchKind}
        aspect={aspect}
        onGenerate={generateOne}
        onBatch={generateBatch}
        onUploadImage={handleUploadImage}
        onVariations={(a) => setWardrobeChar(a as Character)}
      />

      <AssetSection<Scene>
        title="场景概念"
        icon={<MapPin className="h-4 w-4 text-accent" />}
        kind="scene"
        assets={sd.scenes}
        busyIds={busyIds}
        batchKind={batchKind}
        aspect={aspect}
        onGenerate={generateOne}
        onBatch={generateBatch}
        onUploadImage={handleUploadImage}
      />

      {sd.props.length > 0 && (
        <AssetSection<Prop>
          title="道具参考"
          icon={<Sparkles className="h-4 w-4 text-accent" />}
          kind="prop"
          assets={sd.props}
          busyIds={busyIds}
          batchKind={batchKind}
          aspect={aspect}
          onGenerate={generateOne}
          onBatch={generateBatch}
        onUploadImage={handleUploadImage}
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
}: AssetSectionProps<T>) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-text">
          {icon} {title}（{assets.length}）
        </span>
        <Button
          size="sm"
          variant="outline"
          loading={batchKind === kind}
          onClick={() => onBatch(kind)}
        >
          <Wand2 className="h-4 w-4" /> 批量生成
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
}: {
  asset: VisualAsset
  aspect: string
  busy: boolean
  onGenerate: () => void
  onUploadImage?: (dataUrl: string) => void
  onVariations?: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
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
          <Badge tone="danger" className="absolute right-1 top-1">失败</Badge>
        )}
      </div>
      <div className="p-2.5">
        <div className="truncate text-xs font-medium text-text">{asset.name}</div>
        <Button
          size="sm"
          variant={asset.referenceImage ? 'ghost' : 'primary'}
          className="mt-2 w-full"
          loading={busy}
          onClick={onGenerate}
        >
          {asset.referenceImage ? '重新生成' : '生成参考图'}
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
              <Upload className="h-3.5 w-3.5" /> 上传图片
            </Button>
          </>
        )}
        {onVariations && (
          <Button size="sm" variant="ghost" className="mt-1 w-full" onClick={onVariations}>
            <Shirt className="h-3.5 w-3.5" /> 造型
            {(asset as Character).variations?.length
              ? ` (${(asset as Character).variations.length})`
              : ''}
          </Button>
        )}
      </div>
    </div>
  )
}
