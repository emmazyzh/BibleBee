let tokenProvider = null
const configuredApiBaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).trim().replace(/\/+$/, '')
    : ''

export function getApiBaseUrls() {
  return [configuredApiBaseUrl || '']
}

export function setApiTokenProvider(provider) {
  tokenProvider = typeof provider === 'function' ? provider : null
}

async function getAuthorizationHeaderValue() {
  if (!tokenProvider) {
    return ''
  }

  const token = await tokenProvider()
  return token ? `Bearer ${token}` : ''
}

export async function fetchApiJson(path, options) {
  const apiBaseUrl = configuredApiBaseUrl
  const isBrowser = typeof window !== 'undefined'
  const requestUrl = isBrowser
    ? new URL(apiBaseUrl ? `${apiBaseUrl}${path}` : path, window.location.origin)
    : null
  const isSameOrigin = !requestUrl || requestUrl.origin === window.location.origin
  const authorization = isSameOrigin ? '' : await getAuthorizationHeaderValue()
  const method = String(options?.method || 'GET').toUpperCase()
  const shouldSendJsonContentType = method !== 'GET' && method !== 'HEAD'
  const response = await fetch(requestUrl ? requestUrl.toString() : path, {
    credentials: isSameOrigin ? 'include' : 'omit',
    ...options,
    headers: {
      ...(shouldSendJsonContentType ? { 'Content-Type': 'application/json' } : {}),
      ...(authorization ? { Authorization: authorization } : {}),
      ...(options?.headers || {}),
    },
  })

  const rawText = await response.text()
  let payload = {}

  if (rawText) {
    try {
      payload = JSON.parse(rawText)
    } catch {
      payload = {}
    }
  }

  if (!response.ok) {
    const detail = payload.error || rawText.slice(0, 200) || '请求失败，请稍后重试'
    const error = new Error(`HTTP ${response.status}: ${detail}`)
    error.status = response.status
    error.responseText = rawText
    throw error
  }

  return payload
}
