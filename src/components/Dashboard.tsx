/**
 * 项目管理 Dashboard
 * —— 漫剧项目列表与创建入口。
 */
import { useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Download, Film, Pencil, Plus, Rocket, Sparkles, Trash2, Upload } from 'lucide-react'
import { useProject } from '@/contexts/ProjectContext'
import { useI18n } from '@/contexts/I18nContext'
import { exportProjectData, importProjectData } from '@/services/transferService'
import { loadDemoProject } from '@/services/demoData'
import { downloadBlob } from '@/services/utils'
import type { ManjuProject } from '@/types'
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
  { value: 'anime', key: 'style.anime' },
  { value: '2d-animation', key: 'style.2d' },
  { value: '3d-animation', key: 'style.3d' },
  { value: 'live-action', key: 'style.live' },
  { value: 'oil-painting', key: 'style.oil' },
  { value: 'cyberpunk', key: 'style.cyber' },
]

const LANGUAGES = [
  { value: 'zh', key: 'lang.zh' },
  { value: 'en', key: 'lang.en' },
  { value: 'ja', key: 'lang.ja' },
]

export function Dashboard() {
  const { projects, loading, createProject, updateProject, refreshProjects, removeProject } = useProject()
  const { t } = useI18n()
  const navigate = useNavigate()

  const formatRelative = (ts: number): string => {
    const diff = Date.now() - ts
    const min = Math.floor(diff / 60000)
    if (min < 1) return t('time.justNow')
    if (min < 60) return t('time.minAgo', { n: min })
    const hr = Math.floor(min / 60)
    if (hr < 24) return t('time.hourAgo', { n: hr })
    const day = Math.floor(hr / 24)
    return t('time.dayAgo', { n: day })
  }
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
        title: form.title.trim() || t('dashboard.untitled'),
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
      alert(t('dashboard.importFail', { msg: err instanceof Error ? err.message : String(err) }))
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
    if (!confirm(t('dashboard.deleteConfirmTitle', { title }))) return
    await removeProject(projectId)
  }

  const handleRenameProject = async (e: MouseEvent, project: ManjuProject) => {
    e.stopPropagation()
    const title = prompt(t('dashboard.titlePrompt'), project.title)
    if (title && title.trim()) await updateProject({ ...project, title: title.trim() })
  }

  const handleDuplicateProject = async (e: MouseEvent, id: string) => {
    e.stopPropagation()
    const payload = await exportProjectData(id)
    await importProjectData(payload)
    await refreshProjects()
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
            <h1 className="text-2xl font-bold text-text">{t('nav.projects')}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {t('nav.subtitle')}
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
              <Rocket className="h-4 w-4" /> {t('nav.demo')}
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> {t('nav.import')}
            </Button>
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> {t('nav.new')}
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
            title={t('dashboard.empty.title')}
            description={t('dashboard.empty.desc')}
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Sparkles className="h-4 w-4" /> {t('dashboard.empty.action')}
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
                    {p.description || t('dashboard.noDesc')}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-text-subtle">
                    <span>{(() => { const s = VISUAL_STYLES.find((s) => s.value === p.visualStyle); return s ? t(s.key) : p.visualStyle })()}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatRelative(p.lastModified)}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={t('dashboard.copyProject')}
                        onClick={(e) => handleDuplicateProject(e, p.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={t('dashboard.renameProject')}
                        onClick={(e) => handleRenameProject(e, p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={t('dashboard.exportProject')}
                        onClick={(e) => handleExport(e, p.id, p.title)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title={p.isDemo ? t('dashboard.demoNoDelete') : t('dashboard.deleteProject')}
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
        title={t('dashboard.create.title')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" loading={submitting} onClick={submit}>
              {t('dashboard.create.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>{t('dashboard.create.titleLabel')}</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('dashboard.titlePh')}
              autoFocus
            />
          </div>
          <div>
            <Label>{t('dashboard.create.intro')}</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('dashboard.introPh')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('dashboard.create.style')}</Label>
              <Select
                value={form.visualStyle}
                onChange={(e) => setForm({ ...form, visualStyle: e.target.value })}
              >
                {VISUAL_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{t(s.key)}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>{t('dashboard.create.lang')}</Label>
              <Select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{t(l.key)}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
