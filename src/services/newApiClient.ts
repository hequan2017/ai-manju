/**
 * new-api 官方接口客户端（按源码 f7dae5cb 核对）
 * —— 对接 new-api（QuantumNous/new-api）的用户系统与令牌管理。
 *
 * 鉴权要点（与 OpenAI 兼容端点不同，勿混）：
 *   · 管理接口（/api/user/*, /api/token/*）：必须带 `New-Api-User: <userId>` 头，
 *     且 Authorization 用「裸 access_token」（不带 Bearer）。
 *   · OpenAI 兼容端点（/v1/*）：用 `Authorization: Bearer sk-xxx`。
 *   · 令牌列表的 key 是脱敏的，明文需 `POST /api/token/:id/key`，前端拼 `sk-`。
 *   · 统一响应 { success, message, data }，success:false 时 HTTP 仍 200。
 *   · 登录响应 data 含 { id }；access_token 由 GET /api/user/token 换取。
 */
import { parseJsonResponse } from './utils'

export interface NewApiUser {
  id: number
  username: string
  display_name: string
  role: number
  status: number
  group: string
  quota: number
  used_quota: number
  email?: string
}

export interface NewApiToken {
  id: number
  user_id: number
  key: string // 脱敏，不可直接用于调用
  status: number // 1启用 2禁用 3过期 4耗尽
  name: string
  expired_time: number
  remain_quota: number
  unlimited_quota: boolean
  used_quota: number
}

/** 会话：跨域免 cookie 的关键三件套 */
export interface NewApiSession {
  baseUrl: string
  userId: number
  accessToken: string
}

interface ApiResult<T> {
  success: boolean
  message: string
  data: T
}
interface PageInfo<T> {
  page: number
  page_size: number
  total: number
  items: T[]
}

function normalizeBase(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '')
}

/** 管理接口调用：access_token + New-Api-User 头（免 cookie） */
async function apiCall<T>(s: NewApiSession, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${normalizeBase(s.baseUrl)}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: s.accessToken, // 裸 access_token，不带 Bearer
      'New-Api-User': String(s.userId), // 管理接口强制
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (res.status === 401) throw new Error('未登录或访问令牌已失效')
  const data = await parseJsonResponse<ApiResult<T>>(res)
  if (!data.success) throw new Error(data.message || `请求失败 (${res.status})`)
  return data.data
}

/** 登录：用 cookie session 换取 access_token，返回会话 + 用户 */
export async function login(
  baseUrl: string,
  username: string,
  password: string,
): Promise<{ session: NewApiSession; user: NewApiUser }> {
  const base = normalizeBase(baseUrl)
  // 1. 登录（写 session cookie）
  const loginRes = await fetch(`${base}/api/user/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const loginData = await parseJsonResponse<ApiResult<{ id: number; require_2fa?: boolean }>>(loginRes)
  if (!loginData.success) throw new Error(loginData.message || '登录失败')
  if (loginData.data?.require_2fa) throw new Error('该账号开启了两步验证，暂不支持')
  const userId = loginData.data.id

  // 2. 换 access_token（凭 session cookie + New-Api-User）
  const tokenRes = await fetch(`${base}/api/user/token`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'New-Api-User': String(userId) },
  })
  const tokenData = await parseJsonResponse<ApiResult<string>>(tokenRes)
  if (!tokenData.success) throw new Error(tokenData.message || '获取访问令牌失败')

  const session: NewApiSession = { baseUrl: base, userId, accessToken: tokenData.data }
  const user = await fetchSelf(session)
  return { session, user }
}

/** 注册（匿名） */
export async function register(baseUrl: string, username: string, password: string): Promise<void> {
  const res = await fetch(`${normalizeBase(baseUrl)}/api/user/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await parseJsonResponse<ApiResult<boolean>>(res)
  if (!data.success) throw new Error(data.message || '注册失败')
}

/** 当前用户：GET /api/user/self */
export async function fetchSelf(s: NewApiSession): Promise<NewApiUser> {
  return apiCall<NewApiUser>(s, '/api/user/self')
}

/** 令牌列表：GET /api/token/（data 为 PageInfo） */
export async function fetchTokens(s: NewApiSession): Promise<NewApiToken[]> {
  const page = await apiCall<PageInfo<NewApiToken>>(s, '/api/token/?p=1&page_size=100')
  return page.items ?? []
}

/** 取令牌明文 key（脱敏不可用），返回拼好 sk- 前缀的完整 Key */
export async function fetchTokenKey(s: NewApiSession, tokenId: number): Promise<string> {
  const data = await apiCall<{ key: string }>(s, `/api/token/${tokenId}/key`, { method: 'POST' })
  return `sk-${data.key}`
}

/** 创建令牌：POST /api/token/ */
export async function createToken(s: NewApiSession, name: string): Promise<void> {
  await apiCall(s, '/api/token/', {
    method: 'POST',
    body: JSON.stringify({ name, remain_quota: 0, expired_time: -1, unlimited_quota: true }),
  })
}

/** 用户可用模型列表：GET /api/user/models */
export async function fetchAvailableModels(s: NewApiSession): Promise<string[]> {
  return apiCall<string[]>(s, '/api/user/models')
}

/** 退出：GET /api/user/logout */
export async function logout(s: NewApiSession): Promise<void> {
  try {
    await apiCall<boolean>(s, '/api/user/logout')
  } catch {
    /* 忽略：本地清理即可 */
  }
}
