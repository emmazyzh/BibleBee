let tokenProvider = null

export function getApiBaseUrls() {
  return ['']
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
  const isBrowser = typeof window !== 'undefined'
  const requestUrl = isBrowser ? new URL(path, window.location.origin) : null
  const authorization = await getAuthorizationHeaderValue()
  const method = String(options?.method || 'GET').toUpperCase()
  const shouldSendJsonContentType = method !== 'GET' && method !== 'HEAD'
  const response = await fetch(requestUrl ? requestUrl.toString() : path, {
    credentials: 'include',
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
