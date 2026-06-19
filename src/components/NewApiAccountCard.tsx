/**
 * new-api 账户卡片
 * —— 显示登录用户与余额，选用/创建 API 令牌作为模型调用凭证，退出登录。
 */
import { useState } from 'react'
import { LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAlert } from '@/contexts/AlertContext'
import { Badge, Button, Card, CardBody, CardHeader, Input, Label } from './ui'

export function NewApiAccountCard() {
  const { user, tokens, selectedKey, logout, selectKey, revealKey, createToken, refreshTokens } = useAuth()
  const { alert } = useAlert()
  const [newName, setNewName] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  if (!user) return null

  const dollar = (user.quota / 500000).toFixed(2)

  const handleSelect = async (id: number, name: string) => {
    setBusyId(id)
    try {
      const key = await revealKey(id)
      selectKey(key)
      alert(`已选用令牌「${name}」`, 'success')
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err), 'danger')
    } finally {
      setBusyId(null)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await createToken(newName.trim())
      setNewName('')
      alert('令牌已创建', 'success')
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err), 'danger')
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <span className="text-sm font-medium text-text">new-api 账户</span>
        <Button size="sm" variant="ghost" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" /> 退出
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-text">{user.display_name || user.username}</span>
          <span className="text-text-muted">@{user.username}</span>
          <Badge tone="accent">余额 ${dollar}</Badge>
          <Button size="sm" variant="ghost" onClick={() => void refreshTokens()}>
            <RefreshCw className="h-3.5 w-3.5" /> 刷新
          </Button>
        </div>

        <div>
          <Label>API 令牌（选用为模型调用凭证）</Label>
          {selectedKey && (
            <p className="mb-1.5 text-xs text-success">当前凭证：{selectedKey.slice(0, 12)}…</p>
          )}
          {tokens.length === 0 ? (
            <p className="text-xs text-text-muted">暂无令牌，创建一个以调用模型</p>
          ) : (
            <div className="space-y-1.5">
              {tokens.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-bg p-2 text-xs"
                >
                  <span className="flex-1 truncate text-text">{t.name}</span>
                  <span className="font-mono text-text-subtle">{t.key}</span>
                  {t.status !== 1 && <Badge tone="warning">禁用</Badge>}
                  <Button
                    size="sm"
                    variant="primary"
                    loading={busyId === t.id}
                    onClick={() => handleSelect(t.id, t.name)}
                  >
                    选用
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="新令牌名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button onClick={handleCreate}>创建令牌</Button>
        </div>
      </CardBody>
    </Card>
  )
}
