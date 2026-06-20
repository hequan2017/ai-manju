/**
 * 模型配置页
 * —— 供应商管理、全局 API Key、四类模型选择与默认比例。
 *   所有变更经 ModelContext 不可变更新并自动持久化。
 */
import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import {
  BookOpen,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Server,
  Trash2,
} from 'lucide-react'
import { useModel } from '@/contexts/ModelContext'
import { useI18n } from '@/contexts/I18nContext'
import { useAuth } from '@/contexts/AuthContext'
import { NewApiAccountCard } from './NewApiAccountCard'
import {
  markDefaultProvider,
  removeProvider,
  upsertProvider,
} from '@/services/modelService'
import { uid } from '@/services/utils'
import { MODEL_PRESETS, suggestModels } from '@/services/modelPresets'
import type {
  AspectRatio,
  ImageModelConfig,
  ModelConfig,
  ModelManagerState,
  ModelProvider,
} from '@/types'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Label,
  Modal,
  Select,
  Spinner,
} from './ui'

type ModelUpdate = (mutator: (s: ModelManagerState) => ModelManagerState) => void

/** 失焦提交的受控输入：编辑期保持本地草稿，失焦时一次性提交，避免逐字持久化 */
function CommitInput({
  value,
  onCommit,
  ...rest
}: {
  value: string
  onCommit: (v: string) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'>) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      {...rest}
    />
  )
}

export function Settings() {
  const { state, update } = useModel()
  const { t } = useI18n()

  if (!state) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const config = state.currentConfig
  const patchConfig = (patch: Partial<ModelConfig>) =>
    update((s) => ({ ...s, currentConfig: { ...s.currentConfig, ...patch } }))

  return (
    <div className="mx-auto h-full max-w-4xl space-y-6 overflow-y-auto p-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-text">
          <Server className="h-5 w-5 text-accent" /> {t('settings.title')}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {t('settings.desc')}
        </p>
        <a
          href="https://docs.newapi.pro"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <BookOpen className="h-3.5 w-3.5" /> new-api 接口文档
        </a>
      </header>

      <NewApiAccountCard />

      {/* 全局 API Key */}
      <Card>
        <CardHeader>
          <span className="flex items-center gap-2 text-sm font-medium text-text">
            <KeyRound className="h-4 w-4" /> {t('settings.globalKey')}
          </span>
        </CardHeader>
        <CardBody>
          <p className="mb-2 text-xs text-text-muted">
            {t('settings.globalKeyDesc')}
          </p>
          <CommitInput
            type="password"
            value={state.globalApiKey ?? ''}
            placeholder="sk-..."
            onCommit={(v) => update((s) => ({ ...s, globalApiKey: v }))}
          />
        </CardBody>
      </Card>

      <ProvidersCard />

      {/* 当前模型 */}
      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-text">{t('settings.currentModel')}</span>
        </CardHeader>
        <CardBody className="space-y-5">
          <ModelField
            kind="chat"
            label={t('settings.chat')}
            providerId={config.chatModel.providerId}
            modelName={config.chatModel.modelName}
            onChange={(providerId, modelName) =>
              patchConfig({ chatModel: { providerId, modelName, endpoint: config.chatModel.endpoint } })
            }
          />
          <ModelField
            kind="image"
            label={t('settings.image')}
            providerId={config.imageModel.providerId}
            modelName={config.imageModel.modelName}
            onChange={(providerId, modelName) =>
              patchConfig({
                imageModel: {
                  providerId,
                  modelName,
                  type: config.imageModel.type,
                  endpoint: config.imageModel.endpoint,
                },
              })
            }
            extra={<ImageTypeSelect />}
          />
          <ModelField
            kind="video"
            label={t('settings.video')}
            providerId={config.videoModel.providerId}
            modelName={config.videoModel.modelName}
            onChange={(providerId, modelName) =>
              patchConfig({
                videoModel: {
                  providerId,
                  modelName,
                  type: config.videoModel.type,
                  endpoint: config.videoModel.endpoint,
                },
              })
            }
            extra={<VideoTypeSelect />}
          />
          <ModelField
            kind="audio"
            label={t('settings.audio')}
            providerId={config.audioModel.providerId}
            modelName={config.audioModel.modelName}
            onChange={(providerId, modelName) =>
              patchConfig({ audioModel: { providerId, modelName, endpoint: config.audioModel.endpoint } })
            }
          />
        </CardBody>
      </Card>

      {/* 默认比例 */}
      <Card>
        <CardHeader>
          <span className="text-sm font-medium text-text">{t('settings.aspect')}</span>
        </CardHeader>
        <CardBody>
          <Select
            className="max-w-xs"
            value={state.defaultAspectRatio}
            onChange={(e) =>
              update((s) => ({ ...s, defaultAspectRatio: e.target.value as AspectRatio }))
            }
          >
            <option value="9:16">{t('settings.aspect916')}</option>
            <option value="16:9">{t('settings.aspect169')}</option>
            <option value="1:1">{t('settings.aspect11')}</option>
          </Select>
        </CardBody>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------- 子组件

function ImageTypeSelect() {
  const { state, update } = useModel()
  const { t } = useI18n()
  if (!state) return null
  const config = state.currentConfig
  return (
    <div>
      <Label>{t('settings.imageType')}</Label>
      <Select
        className="max-w-xs"
        value={config.imageModel.type ?? 'openai'}
        onChange={(e) =>
          update((s) => ({
            ...s,
            currentConfig: {
              ...s.currentConfig,
              imageModel: { ...s.currentConfig.imageModel, type: e.target.value as ImageModelConfig['type'] },
            },
          }))
        }
      >
        <option value="openai">{t('settings.imageTypeOpenai')}</option>
        <option value="gemini">{t('settings.imageTypeGemini')}</option>
      </Select>
    </div>
  )
}

function VideoTypeSelect() {
  const { state, update } = useModel()
  const { t } = useI18n()
  if (!state) return null
  const config = state.currentConfig
  return (
    <div>
      <Label>{t('settings.videoType')}</Label>
      <Select
        className="max-w-xs"
        value={config.videoModel.type}
        onChange={(e) =>
          update((s) => ({
            ...s,
            currentConfig: {
              ...s.currentConfig,
              videoModel: { ...s.currentConfig.videoModel, type: e.target.value as 'sora' | 'veo' | 'seedance' },
            },
          }))
        }
      >
        <option value="seedance">{t('settings.videoTypeSeedance')}</option>
        <option value="veo">{t('settings.videoTypeVeo')}</option>
        <option value="sora">{t('settings.videoTypeSora')}</option>
      </Select>
    </div>
  )
}

function ProvidersCard() {
  const { state, update } = useModel()
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ name: '', baseUrl: '', apiKey: '' })
  if (!state) return null

  const submitNew = () => {
    if (!draft.name.trim() || !draft.baseUrl.trim()) return
    update((s) =>
      upsertProvider(s, {
        id: uid(),
        name: draft.name.trim(),
        baseUrl: draft.baseUrl.trim(),
        apiKey: draft.apiKey.trim() || undefined,
      }),
    )
    setDraft({ name: '', baseUrl: '', apiKey: '' })
    setAdding(false)
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <span className="text-sm font-medium text-text">{t('settings.provider')}</span>
        <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> {t('settings.addProvider')}
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        <div>
          <Label>{t('settings.providerPreset')}</Label>
          <div className="flex flex-wrap gap-2">
            {MODEL_PRESETS.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant="outline"
                title={p.description}
                onClick={() =>
                  update((s) =>
                    s.providers.some((x) => x.id === p.id)
                      ? s
                      : upsertProvider(s, { id: p.id, name: p.name, baseUrl: p.baseUrl }),
                  )
                }
              >
                + {p.name}
              </Button>
            ))}
          </div>
        </div>
        {state.providers.map((p) => (
          <ProviderRow key={p.id} provider={p} update={update} />
        ))}
      </CardBody>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title={t('settings.addProviderTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={submitNew}>{t('settings.create')}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>{t('settings.providerName')}</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t('settings.providerNamePh')} />
          </div>
          <div>
            <Label>{t('settings.baseUrl')}</Label>
            <Input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder={t('settings.baseUrlPh')} />
          </div>
          <div>
            <Label>{t('settings.providerKey')}</Label>
            <Input type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder="sk-..." />
          </div>
        </div>
      </Modal>
    </Card>
  )
}

function ProviderRow({ provider, update }: { provider: ModelProvider; update: ModelUpdate }) {
  const [show, setShow] = useState(false)
  const { t } = useI18n()

  const handleDelete = () => {
    if (provider.isBuiltIn) return
    if (!confirm(t('settings.deleteProviderConfirm', { name: provider.name }))) return
    try {
      update((s) => removeProvider(s, provider.id))
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-bg p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text">{provider.name}</span>
          {provider.isDefault && <Badge tone="accent">{t('settings.default')}</Badge>}
          {provider.isBuiltIn && <Badge>{t('settings.builtin')}</Badge>}
        </div>
        <div className="mt-0.5 truncate font-mono text-xs text-text-subtle">{provider.baseUrl}</div>
      </div>
      <div className="w-44">
        <CommitInput
          type={show ? 'text' : 'password'}
          value={provider.apiKey ?? ''}
          placeholder={t('settings.masked')}
          onCommit={(v) => update((s) => upsertProvider(s, { ...provider, apiKey: v || undefined }))}
        />
      </div>
      <Button size="icon" variant="ghost" title={show ? t('settings.hide') : t('settings.show')} onClick={() => setShow((v) => !v)}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      {!provider.isDefault && (
        <Button size="icon" variant="ghost" title={t('settings.setDefault')} onClick={() => update((s) => markDefaultProvider(s, provider.id))}>
          <Check className="h-4 w-4" />
        </Button>
      )}
      {!provider.isBuiltIn && (
        <Button size="icon" variant="ghost" title={t('common.delete')} onClick={handleDelete}>
          <Trash2 className="h-4 w-4 text-danger" />
        </Button>
      )}
    </div>
  )
}

function ModelField({
  kind,
  label,
  providerId,
  modelName,
  onChange,
  extra,
}: {
  kind: 'chat' | 'image' | 'video' | 'audio'
  label: string
  providerId: string
  modelName: string
  onChange: (providerId: string, modelName: string) => void
  extra?: ReactNode
}) {
  const { state } = useModel()
  const { t } = useI18n()
  const { session, fetchModels } = useAuth()
  const [apiModels, setApiModels] = useState<string[]>([])
  useEffect(() => {
    if (!session) {
      setApiModels([])
      return
    }
    fetchModels().then(setApiModels).catch(() => setApiModels([]))
  }, [session, fetchModels])
  const suggestions = [...new Set([...apiModels, ...suggestModels(kind)])]
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.2fr]">
      <div>
        <Label>{label}</Label>
        <Select value={providerId} onChange={(e) => onChange(e.target.value, modelName)}>
          {state?.providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>{t('settings.modelName')}</Label>
        <CommitInput
          value={modelName}
          placeholder={t('settings.modelNamePh')}
          list={`${kind}-model-suggestions`}
          onCommit={(v) => onChange(providerId, v)}
        />
        <datalist id={`${kind}-model-suggestions`}>
          {suggestions.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      {extra && <div className="sm:col-span-2">{extra}</div>}
    </div>
  )
}
