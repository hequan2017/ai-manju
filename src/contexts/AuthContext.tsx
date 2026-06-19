/**
 * Auth Context（new-api 对接）
 * —— 管理 new-api 会话、用户、令牌与选中的 API Key。
 *   baseUrl 独立持久化（登录前可填）；选中 Key 后自动同步到 ModelContext，
 *   使所有 AI 适配器调用自动走 new-api 网关。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { kvGet, kvSet } from '@/services/db'
import * as newApi from '@/services/newApiClient'
import type { NewApiSession, NewApiToken, NewApiUser } from '@/services/newApiClient'
import { useModel } from '@/contexts/ModelContext'

const KV_BASEURL = 'newapi_baseurl'
const KV_SESSION = 'newapi_session'
const KV_KEY = 'newapi_key'
const NEWAPI_PROVIDER_ID = 'newapi'

interface AuthContextValue {
  baseUrl: string
  session: NewApiSession | null
  user: NewApiUser | null
  tokens: NewApiToken[]
  selectedKey: string | null
  initializing: boolean
  setBaseUrl: (url: string) => void
  login: (username: string, password: string, urlOverride?: string) => Promise<void>
  register: (username: string, password: string, urlOverride?: string) => Promise<void>
  logout: () => Promise<void>
  refreshTokens: () => Promise<void>
  selectKey: (key: string) => void
  revealKey: (tokenId: number) => Promise<string>
  createToken: (name: string) => Promise<void>
  fetchModels: () => Promise<string[]>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { update: modelUpdate } = useModel()
  const [baseUrl, setBaseUrlState] = useState('')
  const [session, setSession] = useState<NewApiSession | null>(null)
  const [user, setUser] = useState<NewApiUser | null>(null)
  const [tokens, setTokens] = useState<NewApiToken[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)

  const setBaseUrl = useCallback((url: string) => {
    setBaseUrlState(url)
    void kvSet(KV_BASEURL, url)
  }, [])

  const refreshTokens = useCallback(async () => {
    if (!session) return
    setTokens(await newApi.fetchTokens(session))
  }, [session])

  const login = useCallback(
    async (username: string, password: string, urlOverride?: string) => {
      const url = (urlOverride ?? baseUrl).trim()
      if (!url) throw new Error('请先填写 new-api 地址')
      const result = await newApi.login(url, username, password)
      setBaseUrl(url)
      setSession(result.session)
      setUser(result.user)
      await kvSet(KV_SESSION, result.session)
      setTokens(await newApi.fetchTokens(result.session))
    },
    [baseUrl, setBaseUrl],
  )

  const register = useCallback(
    async (username: string, password: string, urlOverride?: string) => {
      const url = (urlOverride ?? baseUrl).trim()
      if (!url) throw new Error('请先填写 new-api 地址')
      await newApi.register(url, username, password)
      await login(username, password, url)
    },
    [baseUrl, login],
  )

  const logout = useCallback(async () => {
    if (session) await newApi.logout(session)
    setSession(null)
    setUser(null)
    setTokens([])
    setSelectedKey(null)
    await kvSet(KV_KEY, '')
  }, [session])

  const selectKey = useCallback((key: string) => {
    setSelectedKey(key)
    void kvSet(KV_KEY, key)
  }, [])

  const revealKey = useCallback(
    async (tokenId: number) => {
      if (!session) throw new Error('未登录')
      return newApi.fetchTokenKey(session, tokenId)
    },
    [session],
  )

  const createToken = useCallback(
    async (name: string) => {
      if (!session) return
      await newApi.createToken(session, name)
      await refreshTokens()
    },
    [session, refreshTokens],
  )

  const fetchModels = useCallback(async () => {
    if (!session) return []
    return newApi.fetchAvailableModels(session)
  }, [session])

  // 启动：恢复 baseUrl/session/key，校验会话
  useEffect(() => {
    void (async () => {
      const savedUrl = await kvGet<string>(KV_BASEURL)
      const savedSession = await kvGet<NewApiSession>(KV_SESSION)
      const savedKey = await kvGet<string>(KV_KEY)
      if (savedUrl) setBaseUrlState(savedUrl)
      if (savedSession?.accessToken) {
        setSession(savedSession)
        try {
          setUser(await newApi.fetchSelf(savedSession))
          setTokens(await newApi.fetchTokens(savedSession))
        } catch {
          /* access_token 失效，需重新登录 */
        }
      }
      if (savedKey) setSelectedKey(savedKey)
      setInitializing(false)
    })()
  }, [])

  // 选中 Key + 会话就绪 → 同步到 ModelContext（new-api 供应商 + 全局凭证）
  useEffect(() => {
    if (!selectedKey || !session?.baseUrl) return
    modelUpdate((s) => {
      const providers = s.providers.some((p) => p.id === NEWAPI_PROVIDER_ID)
        ? s.providers.map((p) =>
            p.id === NEWAPI_PROVIDER_ID ? { ...p, baseUrl: session.baseUrl, isDefault: true } : { ...p, isDefault: false },
          )
        : [
            ...s.providers.map((p) => ({ ...p, isDefault: false })),
            { id: NEWAPI_PROVIDER_ID, name: 'new-api', baseUrl: session.baseUrl, isDefault: true },
          ]
      return {
        ...s,
        providers,
        globalApiKey: selectedKey,
        currentConfig: {
          chatModel: { ...s.currentConfig.chatModel, providerId: NEWAPI_PROVIDER_ID },
          imageModel: { ...s.currentConfig.imageModel, providerId: NEWAPI_PROVIDER_ID },
          videoModel: { ...s.currentConfig.videoModel, providerId: NEWAPI_PROVIDER_ID },
          audioModel: { ...s.currentConfig.audioModel, providerId: NEWAPI_PROVIDER_ID },
        },
      }
    })
  }, [selectedKey, session?.baseUrl, modelUpdate])

  const value: AuthContextValue = {
    baseUrl,
    session,
    user,
    tokens,
    selectedKey,
    initializing,
    setBaseUrl,
    login,
    register,
    logout,
    refreshTokens,
    selectKey,
    revealKey,
    createToken,
    fetchModels,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
