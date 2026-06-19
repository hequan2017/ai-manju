/**
 * 阶段五：提示词管理
 * —— 展示运镜/景别参考库（点击复制），编辑可复用的默认提示词模板（持久化于 kv）。
 */
import { useEffect, useState } from 'react'
import { Camera, Check, Copy, Settings2 } from 'lucide-react'
import { kvGet, kvSet } from '@/services/db'
import {
  CAMERA_MOVEMENTS,
  DEFAULT_PROMPT_TEMPLATES,
  SHOT_SIZES,
  type PromptTemplateConfig,
} from '@/services/promptTemplateService'
import { useAlert } from '@/contexts/AlertContext'
import { Badge, Card, CardBody, CardHeader, Label, Textarea } from '../ui'

const KV_KEY = 'promptTemplates'

export function StagePrompts() {
  const { alert } = useAlert()
  const [tpl, setTpl] = useState<PromptTemplateConfig>(DEFAULT_PROMPT_TEMPLATES)

  useEffect(() => {
    kvGet<PromptTemplateConfig>(KV_KEY).then((saved) => {
      if (saved) setTpl({ ...DEFAULT_PROMPT_TEMPLATES, ...saved })
    })
  }, [])

  const update = (patch: Partial<PromptTemplateConfig>) => {
    const next = { ...tpl, ...patch }
    setTpl(next)
    void kvSet(KV_KEY, next)
  }

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text)
    alert('已复制', 'success')
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <span className="flex items-center gap-2 text-sm font-medium text-text">
            <Camera className="h-4 w-4 text-accent" /> 运镜参考库（点击复制）
          </span>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {CAMERA_MOVEMENTS.map((c) => (
              <button
                key={c.value}
                onClick={() => copy(c.value)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-1 text-xs text-text hover:border-accent"
              >
                <Copy className="h-3 w-3 text-text-subtle" /> {c.label}
                <span className="font-mono text-text-subtle">{c.value}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {SHOT_SIZES.map((s) => (
              <Badge key={s.value} tone="default">
                {s.label} <span className="font-mono">{s.value}</span>
              </Badge>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="flex items-center gap-2 text-sm font-medium text-text">
            <Settings2 className="h-4 w-4 text-accent" /> 可编辑提示词模板
          </span>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label>分镜规划系统提示词</Label>
            <Textarea rows={2} value={tpl.storyboardSystem} onChange={(e) => update({ storyboardSystem: e.target.value })} />
          </div>
          <div>
            <Label>关键帧一致性引导词（注入每张关键帧）</Label>
            <Textarea rows={2} value={tpl.keyframeGuide} onChange={(e) => update({ keyframeGuide: e.target.value })} />
          </div>
          <div>
            <Label>视频提示词前缀</Label>
            <Textarea rows={2} value={tpl.videoPromptPrefix} onChange={(e) => update({ videoPromptPrefix: e.target.value })} />
          </div>
          <div>
            <Label>默认负面提示词</Label>
            <Textarea rows={2} value={tpl.negativePrompt} onChange={(e) => update({ negativePrompt: e.target.value })} />
          </div>
          <p className="flex items-center gap-1 text-xs text-text-subtle">
            <Check className="h-3 w-3 text-success" /> 模板自动保存于本地，将在后续生成流程中注入。
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
