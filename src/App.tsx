/**
 * 应用根组件
 * —— Provider 组装 + new-api 登录守卫 + 路由。
 */
import { type ReactNode } from 'react'
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
  const { session, initializing } = useAuth()
  const { pathname } = useLocation()

  if (initializing) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const isLogin = pathname === '/login'
  const guard = (el: ReactNode) => (session ? el : <Navigate to="/login" replace />)

  return (
    <div className="flex h-full flex-col">
      {!isLogin && session && <TopBar />}
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/" element={guard(<Dashboard />)} />
          <Route path="/settings" element={guard(<Settings />)} />
          <Route path="/workspace/:projectId" element={guard(<Workspace />)} />
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
