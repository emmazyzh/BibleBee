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
  const isSameOrigin = !requestUrl || requestUrl.origin === window.location.origin
  const authorization = isSameOrigin ? '' : await getAuthorizationHeaderValue()
  const response = await fetch(path, {
    credentials: 'include',
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
