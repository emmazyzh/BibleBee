let tokenProvider = null

export function getApiBaseUrls() {
  return ['']
}

export function setApiTokenProvider(provider) {
  tokenProvider = typeof provider === 'function' ? provider : null
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function getAuthorizationHeaderValue() {
  if (!tokenProvider) {
    return ''
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = await tokenProvider()

    if (token) {
      return `Bearer ${token}`
    }

    if (attempt < 4 && typeof window !== 'undefined') {
      await delay(120 * (attempt + 1))
    }
  }

  return ''
}

export async function fetchApiJson(path, options) {
  const isBrowser = typeof window !== 'undefined'
  const requestUrl = isBrowser ? new URL(path, window.location.origin) : null
  const method = String(options?.method || 'GET').toUpperCase()
  const shouldSendJsonContentType = method !== 'GET' && method !== 'HEAD'
  const executeRequest = async (forceFreshToken = false) => {
    const authorization = await getAuthorizationHeaderValue()

    return fetch(requestUrl ? requestUrl.toString() : path, {
      credentials: 'include',
      ...options,
      headers: {
        ...(shouldSendJsonContentType ? { 'Content-Type': 'application/json' } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
        ...(options?.headers || {}),
        ...(forceFreshToken ? { 'Cache-Control': 'no-store' } : {}),
      },
    })
  }

  let response = await executeRequest()

  if (response.status === 401 && tokenProvider) {
    response = await executeRequest(true)
  }

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
