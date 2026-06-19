/**
 * 全局顶部导航栏
 */
import { useNavigate } from 'react-router-dom'
import { Clapperboard, LogIn, LogOut, Moon, Settings, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button, IconButton } from './ui'

export function TopBar() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg-elevated px-4">
      <button
        className="flex items-center gap-2 focus-visible:outline-none"
        onClick={() => navigate('/')}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-danger text-white">
          <Clapperboard className="h-5 w-5" />
        </span>
        <span className="text-sm font-semibold text-text">AI 漫剧平台</span>
      </button>

      <div className="flex items-center gap-1">
        {user ? (
          <>
            <span className="hidden text-xs text-text-muted sm:inline">{user.username}</span>
            <IconButton
              icon={<LogOut className="h-4 w-4" />}
              label="退出登录"
              onClick={() => void logout()}
            />
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => navigate('/login')}>
            <LogIn className="h-4 w-4" /> 登录
          </Button>
        )}
        <IconButton
          icon={theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          label="切换主题"
          onClick={toggle}
        />
        <IconButton
          icon={<Settings className="h-4 w-4" />}
          label="模型配置"
          onClick={() => navigate('/settings')}
        />
      </div>
    </header>
  )
}
