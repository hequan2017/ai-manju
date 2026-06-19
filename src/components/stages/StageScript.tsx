/**
 * 阶段一：剧本与分镜
 * —— 原始故事文本 → AI 拆解为结构化剧本（角色/场景/道具/故事节拍/美术指导），
 *   并基于节拍与目标时长规划镜头序列。
 */
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Camera,
  Clapperboard,
  FlaskConical,
  MapPin,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { useAdapterContext, useModel } from '@/contexts/ModelContext'
import { continueScript, generateShots, parseScript, rewriteScript } from '@/services/scriptService'
import { applyAssetMatches } from '@/services/assetMatchService'
import { promoteAssetsToLibrary } from '@/services/assetLibraryService'
import type { AssetRef, ScriptData, Shot } from '@/types'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Label,
  Select,
  Spinner,
  Textarea,
} from '../ui'

const DURATIONS = ['30s', '60s', '90s', '3min', '5min']

export function StageScript() {
  const { currentEpisode, currentProject, updateProject, patchEpisode } = useProject()
  const { state } = useModel()
  const adapterCtx = useAdapterContext()

  const [rawDraft, setRawDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (currentEpisode) setRawDraft(currentEpisode.rawScript)
  }, [currentEpisode?.id])

  if (!currentEpisode) {
    return <EmptyState title="请先选择一集" description="在左侧选择或创建一集后再开始剧本创作。" />
  }

  const sd = currentEpisode.scriptData
  const chatModel = state?.currentConfig.chatModel

  const handleParse = async () => {
    if (!rawDraft.trim()) {
      setError('请先输入故事或剧本内容')
      return
    }
    if (!adapterCtx || !chatModel) {
      setError('模型未就绪，请先在「模型配置」中完成配置')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await patchEpisode(currentEpisode.id, (e) => ({
        ...e,
        rawScript: rawDraft,
        isParsingScript: true,
      }))
      const baseScript = await parseScript(adapterCtx, {
        rawScript: rawDraft,
        language: currentEpisode.language,
        visualStyle: currentEpisode.visualStyle,
        targetDuration: currentEpisode.targetDuration,
        chatModel,
      })
      const shots = await generateShots(adapterCtx, {
        scriptData: baseScript,
        targetDuration: currentEpisode.targetDuration,
        chatModel,
      })
      // 匹配已有库资产 + 提升新资产到项目库，建立跨集同步引用
      let scriptData = baseScript
      let refs: { characterRefs: AssetRef[]; sceneRefs: AssetRef[]; propRefs: AssetRef[] } = {
        characterRefs: [],
        sceneRefs: [],
        propRefs: [],
      }
      if (currentProject) {
        const applied = applyAssetMatches(baseScript, currentProject)
        const promoted = promoteAssetsToLibrary(applied.scriptData, currentProject)
        await updateProject(promoted.project)
        scriptData = promoted.scriptData
        refs = {
          characterRefs: promoted.characterRefs,
          sceneRefs: promoted.sceneRefs,
          propRefs: promoted.propRefs,
        }
      }
      await patchEpisode(currentEpisode.id, (e) => ({
        ...e,
        scriptData,
        shots,
        ...refs,
        isParsingScript: false,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      await patchEpisode(currentEpisode.id, (e) => ({ ...e, isParsingScript: false })).catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  const handleContinue = async () => {
    if (!adapterCtx || !chatModel) return setError('模型未就绪，请先配置')
    if (!rawDraft.trim()) return setError('请先输入剧本内容')
    setAiBusy(true)
    setError(null)
    try {
      const more = await continueScript(adapterCtx, { rawScript: rawDraft, maxChars: 600, chatModel })
      setRawDraft((prev) => `${prev}\n\n${more}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setAiBusy(false)
    }
  }

  const handleRewrite = async () => {
    if (!adapterCtx || !chatModel) return setError('模型未就绪，请先配置')
    if (!rawDraft.trim()) return setError('请先输入剧本内容')
    const instruction = prompt('请输入改写指令（如：增加悬念、改为喜剧风格、加快节奏）')
    if (!instruction) return
    setAiBusy(true)
    setError(null)
    try {
      const result = await rewriteScript(adapterCtx, { rawScript: rawDraft, instruction, chatModel })
      setRawDraft(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="break-all">{error}</span>
        </div>
      )}

      {/* 剧本输入 */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-text">
            <Clapperboard className="h-4 w-4 text-accent" /> 故事 / 剧本输入
          </span>
          <div className="flex items-center gap-2">
            <Label className="mb-0">目标时长</Label>
            <Select
              className="h-8 w-24"
              value={currentEpisode.targetDuration}
              onChange={(e) =>
                patchEpisode(currentEpisode.id, (ep) => ({ ...ep, targetDuration: e.target.value }))
              }
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>
        </CardHeader>
        <CardBody>
          <Textarea
            rows={10}
            value={rawDraft}
            onChange={(e) => setRawDraft(e.target.value)}
            onBlur={() =>
              rawDraft !== currentEpisode.rawScript &&
              patchEpisode(currentEpisode.id, (ep) => ({ ...ep, rawScript: rawDraft }))
            }
            placeholder="粘贴你的小说、故事大纲或剧本。AI 会自动拆解为角色、场景、道具，并规划分镜……"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-text-subtle">
              语言 {currentEpisode.language} · 风格 {currentEpisode.visualStyle} · 模型 {chatModel?.modelName ?? '未配置'}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" loading={aiBusy} onClick={handleContinue} disabled={!chatModel}>
                续写
              </Button>
              <Button variant="outline" size="sm" loading={aiBusy} onClick={handleRewrite} disabled={!chatModel}>
                改写
              </Button>
              <Button variant="primary" loading={busy} onClick={handleParse} disabled={!chatModel}>
                <Wand2 className="h-4 w-4" /> {sd ? '重新拆解' : 'AI 拆解剧本'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {busy && !sd && (
        <Card>
          <CardBody className="flex items-center justify-center gap-3 py-12 text-text-muted">
            <Spinner /> AI 正在拆解剧本与规划分镜，请稍候……
          </CardBody>
        </Card>
      )}

      {sd && <ScriptResult scriptData={sd} shots={currentEpisode.shots} />}
    </div>
  )
}

function ScriptResult({ scriptData, shots }: { scriptData: ScriptData; shots: Shot[] }) {
  const charName = (id: string) => scriptData.characters.find((c) => c.id === id)?.name ?? '?'
  const ad = scriptData.artDirection

  return (
    <div className="space-y-4">
      {/* 概要 */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-text">{scriptData.title}</h2>
            {scriptData.genre && <Badge tone="accent">{scriptData.genre}</Badge>}
          </div>
          <p className="mt-1 text-sm text-text-muted">{scriptData.logline}</p>
        </CardBody>
      </Card>

      {/* 美术指导 */}
      {ad && (
        <Card>
          <CardHeader>
            <span className="flex items-center gap-2 text-sm font-medium text-text">
              <Sparkles className="h-4 w-4 text-accent" /> 美术指导（统一视觉风格）
            </span>
          </CardHeader>
          <CardBody className="space-y-2">
            {ad.consistencyAnchors && (
              <p className="text-sm text-text">{ad.consistencyAnchors}</p>
            )}
            {ad.moodKeywords?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ad.moodKeywords.map((k, i) => (
                  <Badge key={i}>{k}</Badge>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 角色 */}
        <Card>
          <CardHeader>
            <span className="flex items-center gap-2 text-sm font-medium text-text">
              <Users className="h-4 w-4 text-accent" /> 角色（{scriptData.characters.length}）
            </span>
          </CardHeader>
          <CardBody className="space-y-3">
            {scriptData.characters.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-bg p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text">{c.name}</span>
                  {c.gender && <span className="text-xs text-text-subtle">{c.gender}</span>}
                  {c.age && <span className="text-xs text-text-subtle">{c.age}</span>}
                </div>
                {c.personality && <p className="mt-1 text-xs text-text-muted">{c.personality}</p>}
                {c.visualPrompt && (
                  <p className="mt-1 line-clamp-2 font-mono text-xs text-text-subtle">{c.visualPrompt}</p>
                )}
              </div>
            ))}
          </CardBody>
        </Card>

        {/* 场景 */}
        <Card>
          <CardHeader>
            <span className="flex items-center gap-2 text-sm font-medium text-text">
              <MapPin className="h-4 w-4 text-accent" /> 场景（{scriptData.scenes.length}）
            </span>
          </CardHeader>
          <CardBody className="space-y-3">
            {scriptData.scenes.map((s) => (
              <div key={s.id} className="rounded-lg border border-border bg-bg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text">{s.name}</span>
                  {[s.location, s.time].filter(Boolean).join(' · ') && (
                    <span className="text-xs text-text-subtle">{[s.location, s.time].filter(Boolean).join(' · ')}</span>
                  )}
                </div>
                {s.atmosphere && <p className="mt-1 text-xs text-text-muted">{s.atmosphere}</p>}
              </div>
            ))}
          </CardBody>
        </Card>

        {/* 道具 */}
        <Card>
          <CardHeader>
            <span className="flex items-center gap-2 text-sm font-medium text-text">
              <FlaskConical className="h-4 w-4 text-accent" /> 道具（{scriptData.props.length}）
            </span>
          </CardHeader>
          <CardBody>
            {scriptData.props.length === 0 ? (
              <p className="text-xs text-text-subtle">本集无需特殊道具</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {scriptData.props.map((p) => (
                  <span key={p.id} className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text">
                    {p.name}
                    {p.category && <span className="ml-1 text-text-subtle">· {p.category}</span>}
                  </span>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* 镜头 */}
        <Card>
          <CardHeader>
            <span className="flex items-center gap-2 text-sm font-medium text-text">
              <Camera className="h-4 w-4 text-accent" /> 分镜（{shots.length}）
            </span>
          </CardHeader>
          <CardBody className="space-y-2">
            {shots.map((shot) => (
              <div key={shot.id} className="rounded-lg border border-border bg-bg p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">#{shot.index}</Badge>
                  {shot.shotSize && <span className="text-xs text-text-subtle">{shot.shotSize}</span>}
                  {shot.cameraMovement && (
                    <span className="text-xs text-text-subtle">· {shot.cameraMovement}</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-text">{shot.actionSummary}</p>
                {shot.dialogue && <p className="mt-1 text-xs italic text-text-muted">「{shot.dialogue}」</p>}
                {shot.characters.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {shot.characters.map((id) => (
                      <Badge key={id}>{charName(id)}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <p className="pt-1 text-xs text-text-subtle">
              进入「资产」阶段生成定妆图与场景图，再至「导演台」制作关键帧与视频。
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
