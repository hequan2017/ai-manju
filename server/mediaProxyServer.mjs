/**
 * 媒体代理服务器
 * —— 绕过签名 URL 的 CORS 限制：前端通过 /api/media-proxy?url=... 下载远端媒体。
 *
 * 启动：node server/mediaProxyServer.mjs  （默认端口 3001）
 * 前端需设置环境变量 VITE_MEDIA_PROXY_ENDPOINT=http://localhost:3001/api/media-proxy
 */
import http from 'node:http'

const PORT = Number(process.env.PORT ?? 3001)
const MAX_BYTES = 200 * 1024 * 1024 // 200MB
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * 简易媒体代理：仅放行 GET，校验协议，限制大小与超时。
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' })
    res.end('Method Not Allowed')
    return
  }
  const url = new URL(req.url, `http://localhost:${PORT}`)
  if (!url.pathname.startsWith('/api/media-proxy')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
    return
  }
  const target = url.searchParams.get('url')
  if (!target) {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('Missing url param')
    return
  }

  let targetUrl
  try {
    targetUrl = new URL(target)
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('Invalid url')
    return
  }
  if (!ALLOWED_PROTOCOLS.has(targetUrl.protocol)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' })
    res.end('Forbidden protocol')
    return
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60_000)
    const upstream = await fetch(targetUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ai-manju-media-proxy/1.0' },
    })
    clearTimeout(timer)

    if (!upstream.ok || !upstream.body) {
      res.writeHead(502, { 'Content-Type': 'text/plain' })
      res.end(`Upstream ${upstream.status}`)
      return
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
    const contentLength = Number(upstream.headers.get('content-length') ?? 0)
    if (contentLength > MAX_BYTES) {
      res.writeHead(413, { 'Content-Type': 'text/plain' })
      res.end('Payload Too Large')
      return
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    })
    const reader = upstream.body.getReader()
    let sent = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      sent += value.byteLength
      if (sent > MAX_BYTES) {
        res.destroy()
        return
      }
      res.write(value)
    }
    res.end()
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end(`Proxy error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

const server = http.createServer(handler)
server.listen(PORT, () => {
  console.log(`[media-proxy] listening on http://localhost:${PORT}`)
})
