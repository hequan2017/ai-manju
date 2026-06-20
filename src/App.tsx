/**
 * 应用根组件
 * —— Provider 组装 + new-api 登录守卫 + 路由。
 *   Workspace / Settings 体积较大且非首屏，按路由懒加载以减小首屏主包。
 */
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AlertProvider } from '@/contexts/AlertContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { I18nProvider } from '@/contexts/I18nContext'
import { ModelProvider } from '@/contexts/ModelContext'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Dashboard } from '@/components/Dashboard'
import { LoginPage } from '@/components/LoginPage'
import { TopBar } from '@/components/TopBar'
import { Spinner } from '@/components/ui'

// 命名导出 → 映射为 default 供 lazy 使用
const Settings = lazy(() => import('@/components/Settings').then((m) => ({ default: m.Settings })))
const Workspace = lazy(() => import('@/components/Workspace').then((m) => ({ default: m.Workspace })))

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
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/workspace/:projectId" element={<Workspace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ModelProvider>
          <AuthProvider>
            <ProjectProvider>
              <AlertProvider>
                <AppShell />
              </AlertProvider>
            </ProjectProvider>
          </AuthProvider>
        </ModelProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}
