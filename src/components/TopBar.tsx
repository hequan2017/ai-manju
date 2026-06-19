/**
 * 全局顶部导航栏
 */
import { useNavigate } from 'react-router-dom'
import { Moon, Settings, Sun, Clapperboard } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { IconButton } from './ui'

export function TopBar() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

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
