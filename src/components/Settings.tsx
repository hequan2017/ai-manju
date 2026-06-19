/**
 * 模型配置页
 * —— 供应商管理、全局 API Key、四类模型选择与默认比例。
 *   所有变更经 ModelContext 不可变更新并自动持久化。
 */
import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Server,
  Trash2,
} from 'lucide-react'
import { useModel } from '@/contexts/ModelContext'
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
          <Server className="h-5 w-5 text-accent" /> 模型配置
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          配置 OpenAI 兼容协议的 AI 供应商与模型。漫剧工作流会调用对话、图像、视频、语音四类模型。
        </p>
      </header>

      <NewApiAccountCard />

      {/* 全局 API Key */}
      <Card>
        <CardHeader>
          <span className="flex items-center gap-2 text-sm font-medium text-text">
            <KeyRound className="h-4 w-4" /> 全局 API Key
          </span>
        </CardHeader>
        <CardBody>
          <p className="mb-2 text-xs text-text-muted">
            当供应商未单独配置 Key 时，回退使用此全局 Key。
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
          <span className="text-sm font-medium text-text">当前生效模型</span>
        </CardHeader>
        <CardBody className="space-y-5">
          <ModelField
            kind="chat"
            label="对话模型（剧本分析 / 提示词）"
            providerId={config.chatModel.providerId}
            modelName={config.chatModel.modelName}
            onChange={(providerId, modelName) =>
              patchConfig({ chatModel: { providerId, modelName, endpoint: config.chatModel.endpoint } })
            }
          />
          <ModelField
            kind="image"
            label="图像模型（关键帧 / 定妆图）"
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
            label="视频模型（帧间插值）"
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
            label="语音模型（配音）"
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
          <span className="text-sm font-medium text-text">默认画面比例</span>
        </CardHeader>
        <CardBody>
          <Select
            className="max-w-xs"
            value={state.defaultAspectRatio}
            onChange={(e) =>
              update((s) => ({ ...s, defaultAspectRatio: e.target.value as AspectRatio }))
            }
          >
            <option value="9:16">9:16 竖屏（短剧/漫剧）</option>
            <option value="16:9">16:9 横屏</option>
            <option value="1:1">1:1 方形</option>
          </Select>
        </CardBody>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------- 子组件

function ImageTypeSelect() {
  const { state, update } = useModel()
  if (!state) return null
  const config = state.currentConfig
  return (
    <div>
      <Label>API 形态</Label>
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
        <option value="openai">OpenAI 兼容</option>
        <option value="gemini">Gemini 原生</option>
      </Select>
    </div>
  )
}

function VideoTypeSelect() {
  const { state, update } = useModel()
  if (!state) return null
  const config = state.currentConfig
  return (
    <div>
      <Label>调度类型</Label>
      <Select
        className="max-w-xs"
        value={config.videoModel.type}
        onChange={(e) =>
          update((s) => ({
            ...s,
            currentConfig: {
              ...s.currentConfig,
              videoModel: { ...s.currentConfig.videoModel, type: e.target.value as 'sora' | 'veo' },
            },
          }))
        }
      >
        <option value="seedance">字节 Seedance（火山，异步）</option>
        <option value="veo">通用同步 (veo)</option>
        <option value="sora">OpenAI Sora（异步）</option>
      </Select>
    </div>
  )
}

function ProvidersCard() {
  const { state, update } = useModel()
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
        <span className="text-sm font-medium text-text">供应商</span>
        <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> 新增
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        <div>
          <Label>主流供应商预设（一键添加）</Label>
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
        title="新增供应商"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>取消</Button>
            <Button variant="primary" onClick={submitNew}>创建</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label>名称</Label>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="如：OpenAI / AntSK" />
          </div>
          <div>
            <Label>Base URL</Label>
            <Input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="https://api.example.com" />
          </div>
          <div>
            <Label>API Key（可选，留空使用全局）</Label>
            <Input type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder="sk-..." />
          </div>
        </div>
      </Modal>
    </Card>
  )
}

function ProviderRow({ provider, update }: { provider: ModelProvider; update: ModelUpdate }) {
  const [show, setShow] = useState(false)

  const handleDelete = () => {
    if (provider.isBuiltIn) return
    if (!confirm(`确定删除供应商「${provider.name}」？`)) return
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
          {provider.isDefault && <Badge tone="accent">默认</Badge>}
          {provider.isBuiltIn && <Badge>内置</Badge>}
        </div>
        <div className="mt-0.5 truncate font-mono text-xs text-text-subtle">{provider.baseUrl}</div>
      </div>
      <div className="w-44">
        <CommitInput
          type={show ? 'text' : 'password'}
          value={provider.apiKey ?? ''}
          placeholder="未配置 Key"
          onCommit={(v) => update((s) => upsertProvider(s, { ...provider, apiKey: v || undefined }))}
        />
      </div>
      <Button size="icon" variant="ghost" title={show ? '隐藏' : '显示'} onClick={() => setShow((v) => !v)}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      {!provider.isDefault && (
        <Button size="icon" variant="ghost" title="设为默认" onClick={() => update((s) => markDefaultProvider(s, provider.id))}>
          <Check className="h-4 w-4" />
        </Button>
      )}
      {!provider.isBuiltIn && (
        <Button size="icon" variant="ghost" title="删除" onClick={handleDelete}>
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
  const suggestions = suggestModels(kind)
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
        <Label>模型名</Label>
        <CommitInput
          value={modelName}
          placeholder="model name"
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
