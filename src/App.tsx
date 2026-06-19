/**
 * 应用根组件
 * —— Provider 组装 + new-api 登录守卫 + 路由。
 */
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AlertProvider } from '@/contexts/AlertContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ModelProvider } from '@/contexts/ModelContext'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Dashboard } from '@/components/Dashboard'
import { LoginPage } from '@/components/LoginPage'
import { Settings } from '@/components/Settings'
import { TopBar } from '@/components/TopBar'
import { Workspace } from '@/components/Workspace'
import { Spinner } from '@/components/ui'

function AppShell() {
  const { initializing } = useAuth()
  const { pathname } = useLocation()

  if (initializing) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // 不强制登录：未登录可浏览/编辑，仅在 AI 调用时验证凭证
  const isLogin = pathname === '/login'

  return (
    <div className="flex h-full flex-col">
      {!isLogin && <TopBar />}
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/workspace/:projectId" element={<Workspace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ModelProvider>
        <AuthProvider>
          <ProjectProvider>
            <AlertProvider>
              <AppShell />
            </AlertProvider>
          </ProjectProvider>
        </AuthProvider>
      </ModelProvider>
    </ThemeProvider>
  )
}
