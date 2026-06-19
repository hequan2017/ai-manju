/**
 * 衣橱系统（角色造型变体）
 * —— 管理角色的多套造型（日常 / 战斗 / 受伤 …），基于定妆图保持面部一致。
 */
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAdapterContext, useModel } from '@/contexts/ModelContext'
import { generateAssetImage } from '@/services/assetService'
import { generateCharacterTurnaround } from '@/services/visualService'
import { createCharacterVariation } from '@/services/factory'
import type { Character, CharacterVariation } from '@/types'
import { Button, Input, Label, Modal } from './ui'

export function WardrobeModal({
  character,
  artDirectionAnchor,
  onClose,
  onSave,
}: {
  character: Character
  artDirectionAnchor?: string
  onClose: () => void
  onSave: (next: Character) => void
}) {
  const { state } = useModel()
  const adapterCtx = useAdapterContext()
  const [draft, setDraft] = useState({ name: '', visualPrompt: '' })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [busyTurnaround, setBusyTurnaround] = useState(false)

  const variations = character.variations ?? []

  const addVariation = () => {
    if (!draft.name.trim()) return
    const v = createCharacterVariation({ name: draft.name.trim(), visualPrompt: draft.visualPrompt.trim() })
    onSave({ ...character, variations: [...variations, v] })
    setDraft({ name: '', visualPrompt: '' })
  }

  const removeVariation = (id: string) => {
    onSave({ ...character, variations: variations.filter((v) => v.id !== id) })
  }

  const generateVariation = async (v: CharacterVariation) => {
    if (!adapterCtx || !state) return
    setBusyId(v.id)
    try {
      const img = await generateAssetImage(adapterCtx, {
        imageModel: state.currentConfig.imageModel,
        aspect: state.defaultAspectRatio,
        kind: 'character',
        visualPrompt: `${artDirectionAnchor ? `${artDirectionAnchor}, ` : ''}${character.visualPrompt ?? character.name}, ${v.visualPrompt ?? v.name} outfit`,
        referenceImage: character.referenceImage,
      })
      onSave({
        ...character,
        variations: variations.map((x) =>
          x.id === v.id ? { ...x, referenceImage: img, status: 'completed' } : x,
        ),
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleTurnaround = async () => {
    if (!adapterCtx || !state) return
    setBusyTurnaround(true)
    try {
      const img = await generateCharacterTurnaround(adapterCtx, {
        character,
        imageModel: state.currentConfig.imageModel,
        anchor: artDirectionAnchor,
      })
      onSave({ ...character, turnaround: { panels: [], imageUrl: img, status: 'completed' } })
    } finally {
      setBusyTurnaround(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`衣橱 · ${character.name}`} size="md">
      <div className="space-y-3">
        {variations.length === 0 && (
          <p className="text-xs text-text-muted">暂无造型变体。可添加多套造型（日常 / 战斗 / 受伤…），生成时保持面部一致。</p>
        )}
        {variations.map((v) => (
          <div key={v.id} className="flex items-center gap-2 rounded-lg border border-border bg-bg p-2">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-surface-2">
              {v.referenceImage ? (
                <img src={v.referenceImage} alt={v.name} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-text">{v.name}</div>
              <div className="truncate text-[10px] text-text-subtle">{v.visualPrompt || '—'}</div>
            </div>
            <Button size="sm" variant="ghost" loading={busyId === v.id} onClick={() => generateVariation(v)}>
              生成
            </Button>
            <Button size="icon" variant="ghost" title="删除" onClick={() => removeVariation(v.id)}>
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          </div>
        ))}

        <div className="border-t border-border pt-3">
          <Label>九宫格多视角造型</Label>
          {character.turnaround?.imageUrl && (
            <img src={character.turnaround.imageUrl} alt="九宫格造型" className="mb-2 aspect-square w-full rounded" />
          )}
          <Button
            size="sm"
            variant="secondary"
            className="mb-3 w-full"
            loading={busyTurnaround}
            onClick={handleTurnaround}
          >
            {character.turnaround?.imageUrl ? '重生九宫格造型' : '生成九宫格造型'}
          </Button>
        </div>

        <div className="border-t border-border pt-3">
          <Label>添加造型</Label>
          <div className="flex gap-2">
            <Input
              placeholder="造型名（如：战斗装束）"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Button onClick={addVariation}>添加</Button>
          </div>
          <Input
            className="mt-2"
            placeholder="视觉提示词（可选，描述该造型的服饰特征）"
            value={draft.visualPrompt}
            onChange={(e) => setDraft({ ...draft, visualPrompt: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  )
}
