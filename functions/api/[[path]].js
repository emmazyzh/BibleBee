const DEFAULT_API_PROXY_TARGET = 'https://bible-bee.vercel.app'

function buildProxyUrl(requestUrl, env) {
  const incomingUrl = new URL(requestUrl)
  const targetOrigin = String(env?.API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET).trim().replace(/\/+$/, '')
  const targetUrl = new URL(`${targetOrigin}${incomingUrl.pathname}${incomingUrl.search}`)
  return targetUrl
}

function cloneHeaders(requestHeaders) {
  const headers = new Headers(requestHeaders)
  headers.delete('host')
  headers.delete('cf-connecting-ip')
  headers.delete('cf-ipcountry')
  headers.delete('cf-ray')
  headers.delete('x-forwarded-proto')
  headers.delete('x-forwarded-host')
  headers.delete('x-forwarded-port')
  return headers
}

export async function onRequest(context) {
  const { request, env } = context
  const method = (request.method || 'GET').toUpperCase()
  const targetUrl = buildProxyUrl(request.url, env)
  const headers = cloneHeaders(request.headers)

  headers.set('x-forwarded-host', new URL(request.url).host)
  headers.set('x-forwarded-proto', new URL(request.url).protocol.replace(':', ''))

  const init = {
    method,
    headers,
    redirect: 'manual',
  }

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = request.body
  }

  return fetch(targetUrl.toString(), init)
}
