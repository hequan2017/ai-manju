/**
 * 应用根组件
 * —— Provider 组装 + 路由 + 全局布局。
 */
import { Navigate, Route, Routes } from 'react-router-dom'
import { AlertProvider } from '@/contexts/AlertContext'
import { ModelProvider } from '@/contexts/ModelContext'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Dashboard } from '@/components/Dashboard'
import { Settings } from '@/components/Settings'
import { TopBar } from '@/components/TopBar'
import { Workspace } from '@/components/Workspace'

export default function App() {
  return (
    <ThemeProvider>
      <ModelProvider>
        <ProjectProvider>
          <AlertProvider>
            <div className="flex h-full flex-col">
              <TopBar />
              <main className="flex-1 overflow-hidden">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/workspace/:projectId" element={<Workspace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </AlertProvider>
        </ProjectProvider>
      </ModelProvider>
    </ThemeProvider>
  )
}
