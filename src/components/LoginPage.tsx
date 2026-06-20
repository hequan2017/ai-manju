/**
 * 登录 / 注册页（对接 new-api）
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { Button, Card, CardBody, Input, Label } from './ui'

export function LoginPage() {
  const { baseUrl, setBaseUrl, login, register } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [url, setUrl] = useState(baseUrl)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!url.trim() || !username.trim() || !password.trim()) {
      setError(t('login.fillAll'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      setBaseUrl(url.trim())
      if (mode === 'login') await login(username, password, url.trim())
      else await register(username, password, url.trim())
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardBody className="space-y-4">
          <div className="text-center">
            <h1 className="text-lg font-semibold text-text">{t('login.title')}</h1>
            <p className="text-xs text-text-muted">{t('login.desc')}</p>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
              {error}
            </div>
          )}

          <div>
            <Label>{t('login.url')}</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-new-api.example.com"
              autoFocus
            />
          </div>
          <div>
            <Label>{t('login.username')}</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <Label>{t('login.password')}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>

          <Button variant="primary" className="w-full" loading={busy} onClick={submit}>
            {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {mode === 'login' ? t('login.submit') : t('login.register')}
          </Button>

          <button
            className="w-full text-center text-xs text-text-muted hover:text-text"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? t('login.toRegister') : t('login.toLogin')}
          </button>

          <p className="text-center text-[10px] text-text-subtle">
            {t('login.hint')}
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
