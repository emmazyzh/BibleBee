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
  const response = await fetch(requestUrl ? requestUrl.toString() : path, {
    credentials: isSameOrigin ? 'include' : 'omit',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
      ...(options?.headers || {}),
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload.error || '请求失败，请稍后重试')
    error.status = response.status
    throw error
  }

  return payload
}
