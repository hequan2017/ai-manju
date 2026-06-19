/**
 * 媒体获取服务（CORS 回退）
 * —— 直连失败（签名 URL 跨域）时，回退到本地媒体代理服务器。
 *   代理端点通过 VITE_MEDIA_PROXY_ENDPOINT 配置（见 server/mediaProxyServer.mjs）。
 */
const PROXY_ENDPOINT = import.meta.env.VITE_MEDIA_PROXY_ENDPOINT as string | undefined

export async function fetchMediaWithCorsFallback(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (err) {
    if (PROXY_ENDPOINT) {
      return fetch(`${PROXY_ENDPOINT}?url=${encodeURIComponent(url)}`, init)
    }
    throw err
  }
}
