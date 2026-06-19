/**
 * 项目管理 Dashboard
 * —— 漫剧项目列表与创建入口。
 */
import { useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Film, Plus, Rocket, Sparkles, Trash2, Upload } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { exportProjectData, importProjectData } from '@/services/transferService'
import { loadDemoProject } from '@/services/demoData'
import { downloadBlob } from '@/services/utils'
import { Onboarding } from './Onboarding'
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Select,
  Spinner,
  Textarea,
} from './ui'

const VISUAL_STYLES = [
  { value: 'anime', label: '动漫' },
  { value: '2d-animation', label: '2D 动画' },
  { value: '3d-animation', label: '3D 动画' },
  { value: 'live-action', label: '真人实拍' },
  { value: 'oil-painting', label: '油画风' },
  { value: 'cyberpunk', label: '赛博朋克' },
]

const LANGUAGES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  return `${day} 天前`
}

export function Dashboard() {
  const { projects, loading, createProject, refreshProjects, removeProject } = useProject()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    visualStyle: 'anime',
    language: 'zh',
  })
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    try {
      const project = await createProject({
        title: form.title.trim() || '未命名漫剧',
        description: form.description.trim(),
        visualStyle: form.visualStyle,
        language: form.language,
      })
      setCreating(false)
      setForm({ title: '', description: '', visualStyle: 'anime', language: 'zh' })
      navigate(`/workspace/${project.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  const fileRef = useRef<HTMLInputElement>(null)
  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const payload = JSON.parse(await file.text())
      await importProjectData(payload)
      await refreshProjects()
    } catch (err) {
      alert(`导入失败：${err instanceof Error ? err.message : String(err)}`)
    }
    e.target.value = ''
  }
  const handleExport = async (e: MouseEvent, projectId: string, title: string) => {
    e.stopPropagation()
    const payload = await exportProjectData(projectId)
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      `${title}.json`,
    )
  }
  const handleDelete = async (e: MouseEvent, projectId: string, title: string) => {
    e.stopPropagation()
    if (!confirm(`确定删除项目「${title}」及其所有季与集？此操作不可撤销。`)) return
    await removeProject(projectId)
  }

  const handleLoadDemo = async () => {
    const id = await loadDemoProject()
    await refreshProjects()
    navigate(`/workspace/${id}`)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl p-8">
        <Onboarding />
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">我的漫剧项目</h1>
            <p className="mt-1 text-sm text-text-muted">
              从灵感到成片 —— 剧本 · 资产 · 导演台 · 导出的工业化工作流
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImport}
            />
            <Button variant="outline" onClick={handleLoadDemo}>
              <Rocket className="h-4 w-4" /> 加载示例
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> 导入
            </Button>
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> 新建漫剧
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<Film className="h-10 w-10" />}
            title="还没有漫剧项目"
            description="创建你的第一部 AI 漫剧，开启工业化创作流程。"
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Sparkles className="h-4 w-4" /> 创建第一个项目
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="group cursor-pointer transition hover:border-accent hover:shadow-md"
                onClick={() => navigate(`/workspace/${p.id}`)}
              >
                <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-surface-2">
                  {p.coverImage ? (
                    <img src={p.coverImage} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-text-subtle">
                      <Film className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="truncate font-semibold text-text">{p.title}</h3>
                  <p className="mt-1 line-clamp-2 h-9 text-xs text-text-muted">
                    {p.description || '暂无描述'}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-text-subtle">
                    <span>{VISUAL_STYLES.find((s) => s.value === p.visualStyle)?.label ?? p.visualStyle}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatRelative(p.lastModified)}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="导出项目"
                        onClick={(e) => handleExport(e, p.id, p.title)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={p.isDemo ? '示例项目不可删除' : '删除项目'}
                        disabled={p.isDemo}
                        onClick={(e) => handleDelete(e, p.id, p.title)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-danger" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="新建漫剧项目"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>取消</Button>
            <Button variant="primary" loading={submitting} onClick={submit}>
              创建并进入
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>标题</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="给你的漫剧起个名字"
              autoFocus
            />
          </div>
          <div>
            <Label>简介</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="一句话描述这个故事（可选）"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>视觉风格</Label>
              <Select
                value={form.visualStyle}
                onChange={(e) => setForm({ ...form, visualStyle: e.target.value })}
              >
                {VISUAL_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>语言</Label>
              <Select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
