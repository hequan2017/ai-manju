/**
 * 镜头工作卡
 * —— 单镜头的完整创作单元：首帧 / 尾帧生成、视频片段生成（含轮询进度）、配音生成与播放。
 */
import { useState } from 'react'
import {
  AlertTriangle,
  Copy,
  Film,
  ImageOff,
  LayoutGrid,
  Loader2,
  Pencil,
  Trash2,
  Volume2,
  Wand2,
} from 'lucide-react'
import { useShotActions } from '@/hooks/useShotActions'
import { useVideoSrc } from '@/hooks/useVideoSrc'
import { useI18n } from '@/contexts/I18nContext'
import { assessShotQuality } from '@/services/qualityAssessmentService'
import type { Keyframe, Shot } from '@/types'
import { Badge, Button, Card, IconButton, Label } from '../ui'

export function ShotCard({ shot }: { shot: Shot }) {
  const { t } = useI18n()
  const {
    sd,
    busy,
    videoStatus,
    error,
    supportsEndFrame,
    generateStart,
    generateEnd,
    generateVideoClip,
    generateDubbing,
    generateNineGrid,
    patchShot,
    duplicateShot,
    removeShot,
  } = useShotActions(shot)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    actionSummary: shot.actionSummary,
    dialogue: shot.dialogue ?? '',
    shotSize: shot.shotSize ?? '',
    cameraMovement: shot.cameraMovement ?? '',
  })
  const [draftCharIds, setDraftCharIds] = useState<string[]>(shot.characters)
  const videoSrc = useVideoSrc(shot.interval?.videoUrl)
  const qa = sd ? assessShotQuality(shot, sd) : null

  const sceneName = sd?.scenes.find((s) => s.id === shot.sceneId)?.name ?? '—'
  const start = shot.keyframes.find((k) => k.type === 'start')
  const end = shot.keyframes.find((k) => k.type === 'end')

  const [dubText, setDubText] = useState(shot.dialogue ?? shot.actionSummary)
  const [dubMode, setDubMode] = useState<'narration' | 'dialogue'>(
    shot.dialogue ? 'dialogue' : 'narration',
  )

  return (
    <Card className="overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2">
        <Badge tone="accent">#{shot.index}</Badge>
        <span className="truncate text-xs text-text-muted">{sceneName}</span>
        <div className="ml-auto flex items-center gap-1">
          {qa && (
            <Badge tone={qa.grade === 'pass' ? 'success' : qa.grade === 'warning' ? 'warning' : 'danger'}>
              {qa.score}
            </Badge>
          )}
          {shot.shotSize && <Badge>{shot.shotSize}</Badge>}
          {shot.cameraMovement && <Badge>{shot.cameraMovement}</Badge>}
          <IconButton icon={<Copy className="h-3 w-3" />} label={t('shot.duplicate')} className="h-6 w-6" onClick={duplicateShot} />
          <IconButton
            icon={<Trash2 className="h-3 w-3" />}
            label={t('shot.remove')}
            className="h-6 w-6"
            onClick={() => { if (confirm(t('shot.deleteConfirm'))) removeShot() }}
          />
        </div>
      </div>

      <div className="space-y-3 p-3">
        {/* 帧 */}
        <div className={`grid gap-2 ${supportsEndFrame ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <FrameSlot
            label={t('shot.firstFrame')}
            kf={start}
            busy={busy.start}
            onGenerate={generateStart}
          />
          {supportsEndFrame && (
            <FrameSlot label={t('shot.endFrame')} kf={end} busy={busy.end} onGenerate={generateEnd} />
          )}
        </div>

        {/* 动作 / 台词 */}
        <div>
          <div className="flex items-start gap-1">
            <p className="flex-1 text-sm text-text">{shot.actionSummary}</p>
            <IconButton
              icon={<Pencil className="h-3 w-3" />}
              label={t('shot.editShot')}
              className="h-6 w-6"
              onClick={() => setEditing((v) => !v)}
            />
          </div>
          {shot.dialogue && !editing && (
            <p className="mt-1 text-xs italic text-text-muted">「{shot.dialogue}」</p>
          )}
          {editing && (
            <div className="mt-2 space-y-2 rounded-lg border border-border bg-bg p-2">
              <textarea
                rows={2}
                value={draft.actionSummary}
                onChange={(e) => setDraft({ ...draft, actionSummary: e.target.value })}
                className="w-full resize-y rounded border border-border bg-bg px-2 py-1 text-xs text-text focus:border-accent focus:outline-none"
                placeholder={t('shot.action')}
              />
              <input
                value={draft.dialogue}
                onChange={(e) => setDraft({ ...draft, dialogue: e.target.value })}
                className="w-full rounded border border-border bg-bg px-2 py-1 text-xs text-text focus:border-accent focus:outline-none"
                placeholder={t('shot.dialogue')}
              />
              <div className="flex gap-2">
                <input
                  value={draft.shotSize}
                  onChange={(e) => setDraft({ ...draft, shotSize: e.target.value })}
                  className="flex-1 rounded border border-border bg-bg px-2 py-1 text-xs text-text focus:border-accent focus:outline-none"
                  placeholder={t('shot.shotSizePh')}
                />
                <input
                  value={draft.cameraMovement}
                  onChange={(e) => setDraft({ ...draft, cameraMovement: e.target.value })}
                  className="flex-1 rounded border border-border bg-bg px-2 py-1 text-xs text-text focus:border-accent focus:outline-none"
                  placeholder={t('shot.cameraPh')}
                />
              </div>
              <div>
                <Label>{t('shot.cast')}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {sd?.characters.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-text"
                    >
                      <input
                        type="checkbox"
                        checked={draftCharIds.includes(c.id)}
                        onChange={(e) =>
                          setDraftCharIds((prev) =>
                            e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id),
                          )
                        }
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    patchShot((s) => ({
                      ...s,
                      actionSummary: draft.actionSummary,
                      dialogue: draft.dialogue,
                      shotSize: draft.shotSize,
                      cameraMovement: draft.cameraMovement,
                      characters: draftCharIds,
                    }))
                    setEditing(false)
                  }}
                >
                  {t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 视频 */}
        <div className="rounded-lg border border-border bg-bg p-2">
          {videoSrc ? (
            <video src={videoSrc} controls className="aspect-video w-full rounded" />
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary" loading={busy.video} onClick={generateVideoClip}>
                <Film className="h-4 w-4" /> {t('shot.genVideo')}
              </Button>
              {busy.video && videoStatus && (
                <span className="text-xs text-text-muted">{t('shot.statusPrefix')}{videoStatus}…</span>
              )}
              {!busy.video && !supportsEndFrame && (
                <span className="text-xs text-text-subtle">{t('shot.firstFrameOnly')}</span>
              )}
            </div>
          )}
        </div>

        {/* 九宫格构图 */}
        <div className="rounded-lg border border-border bg-bg p-2">
          <div className="mb-1.5 flex items-center gap-1 text-xs font-medium text-text-muted">
            <LayoutGrid className="h-3.5 w-3.5" /> {t('shot.ninegrid')}
          </div>
          {shot.nineGrid?.imageUrl && (
            <img src={shot.nineGrid.imageUrl} alt={t('shot.ninegrid')} className="mb-1 aspect-square w-full rounded" />
          )}
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            loading={busy.ninegrid}
            onClick={() => generateNineGrid(9)}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> {shot.nineGrid?.imageUrl ? t('shot.regenNinegrid') : t('shot.genNinegrid')}
          </Button>
        </div>

        {/* 配音 */}
        <div className="rounded-lg border border-border bg-bg p-2">
          <div className="mb-1.5 flex items-center gap-1 text-xs font-medium text-text-muted">
            <Volume2 className="h-3.5 w-3.5" /> {t('shot.dubbing')}
          </div>
          <textarea
            rows={2}
            value={dubText}
            onChange={(e) => setDubText(e.target.value)}
            className="w-full resize-y rounded border border-border bg-bg px-2 py-1 text-xs text-text focus:border-accent focus:outline-none"
            placeholder={t('shot.dubPlaceholder')}
          />
          <div className="mt-1.5 flex items-center gap-2">
            <select
              value={dubMode}
              onChange={(e) => setDubMode(e.target.value as 'narration' | 'dialogue')}
              className="h-7 rounded border border-border bg-bg px-1 text-xs text-text"
            >
              <option value="narration">{t('shot.narration')}</option>
              <option value="dialogue">{t('shot.dialogueOpt')}</option>
            </select>
            <Button
              size="sm"
              variant="secondary"
              loading={busy.dubbing}
              onClick={() => generateDubbing(dubText, dubMode)}
            >
              <Wand2 className="h-3.5 w-3.5" /> {shot.dubbing?.audioUrl ? t('shot.redub') : t('shot.genDubbing')}
            </Button>
          </div>
          {shot.dubbing?.audioUrl && (
            <audio src={shot.dubbing.audioUrl} controls className="mt-2 w-full" />
          )}
        </div>

        {error && (
          <div className="flex items-start gap-1.5 rounded border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="break-all">{error}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

function FrameSlot({
  label,
  kf,
  busy,
  onGenerate,
}: {
  label: string
  kf?: Keyframe
  busy: boolean
  onGenerate: () => void
}) {
  const { t } = useI18n()
  return (
    <div>
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-surface-2">
        {kf?.imageUrl ? (
          <img src={kf.imageUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-text-subtle">
            {busy || kf?.status === 'generating' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImageOff className="h-5 w-5" />
            )}
          </div>
        )}
        <span className="absolute left-1 top-1 rounded bg-black/50 px-1 text-[10px] text-white">
          {label}
        </span>
      </div>
      <Button
        size="sm"
        variant={kf?.imageUrl ? 'ghost' : 'primary'}
        className="mt-1.5 w-full"
        loading={busy}
        onClick={onGenerate}
      >
        {kf?.imageUrl ? t('shot.regen') : `${t('common.generate')}${label}`}
      </Button>
    </div>
  )
}
