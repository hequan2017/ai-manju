/**
 * 全局顶部导航栏
 */
import { useNavigate } from 'react-router-dom'
import { Clapperboard, Globe, LogIn, LogOut, Moon, Settings, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/contexts/I18nContext'
import { Button, IconButton } from './ui'

export function TopBar() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const { locale, setLocale, t } = useI18n()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg-elevated px-4">
      <button
        className="flex items-center gap-2 focus-visible:outline-none"
        onClick={() => navigate('/')}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-danger text-white">
          <Clapperboard className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold text-text">{t('login.title')}</span>
      </button>

      <div className="flex items-center gap-1">
        {user ? (
          <>
            <span className="hidden text-xs text-text-muted sm:inline">{user.username}</span>
            <IconButton
              icon={<LogOut className="h-4 w-4" />}
              label={t('top.logout')}
              onClick={() => void logout()}
            />
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => navigate('/login')}>
            <LogIn className="h-4 w-4" /> {t('top.login')}
          </Button>
        )}
        <IconButton
          icon={<Globe className="h-4 w-4" />}
          label={t('top.language')}
          onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
        />
        <IconButton
          icon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          label={t('top.theme')}
          onClick={toggle}
        />
        <IconButton
          icon={<Settings className="h-4 w-4" />}
          label={t('top.settings')}
          onClick={() => navigate('/settings')}
        />
      </div>
    </header>
  )
}
