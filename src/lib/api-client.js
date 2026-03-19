const vercelAppUrl = normalizeBaseUrl(import.meta.env.VITE_VERCEL_APP_URL)
const cloudflareAppUrl = normalizeBaseUrl(import.meta.env.VITE_CLOUDFLARE_APP_URL)
const configuredPrimaryBaseUrl = normalizeBaseUrl(import.meta.env.VITE_PRIMARY_API_BASE_URL)
const configuredFallbackBaseUrl = normalizeBaseUrl(import.meta.env.VITE_FALLBACK_API_BASE_URL)
let tokenProvider = null

function normalizeBaseUrl(value) {
  if (!value || typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/\/+$/, '')
}

function getCurrentOrigin() {
  if (typeof window === 'undefined') {
    return ''
  }

  return normalizeBaseUrl(window.location.origin)
}

function buildAbsoluteUrl(baseUrl, path) {
  if (!baseUrl) {
    return path
  }

  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

function dedupeBaseUrls(baseUrls) {
  return Array.from(new Set(baseUrls.filter(Boolean)))
}

function isCrossOriginRequest(requestUrl) {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return new URL(requestUrl, window.location.origin).origin !== window.location.origin
  } catch {
    return false
  }
}

function shouldRetryWithFallback(error) {
  if (!error || typeof error !== 'object') {
    return false
  }

  if (error.name === 'TypeError') {
    return true
  }

  return error.retryable === true
}

export function getApiBaseUrls() {
  const currentOrigin = getCurrentOrigin()

  if (configuredPrimaryBaseUrl || configuredFallbackBaseUrl) {
    return dedupeBaseUrls([
      configuredPrimaryBaseUrl || currentOrigin,
      configuredFallbackBaseUrl,
    ])
  }

  if (currentOrigin && cloudflareAppUrl && currentOrigin === cloudflareAppUrl) {
    return dedupeBaseUrls([currentOrigin, vercelAppUrl])
  }

  if (currentOrigin && vercelAppUrl && currentOrigin === vercelAppUrl) {
    return dedupeBaseUrls([currentOrigin, cloudflareAppUrl])
  }

  return dedupeBaseUrls([currentOrigin, cloudflareAppUrl, vercelAppUrl])
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
  const baseUrls = getApiBaseUrls()
  const errors = []

  for (const baseUrl of baseUrls) {
    const requestUrl = buildAbsoluteUrl(baseUrl, path)
    const authorization = await getAuthorizationHeaderValue()
    const isCrossOrigin = isCrossOriginRequest(requestUrl)

    try {
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
        ...(options?.headers || {}),
      }

      const response = await fetch(requestUrl, {
        credentials: isCrossOrigin ? 'omit' : 'include',
        ...options,
        headers: requestHeaders,
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        const error = new Error(payload.error || '请求失败，请稍后重试')
        error.status = response.status
        error.retryable = response.status >= 500
        throw error
      }

      return payload
    } catch (error) {
      errors.push(error)

      if (!shouldRetryWithFallback(error)) {
        throw error
      }
    }
  }

  throw errors[errors.length - 1] || new Error('请求失败，请稍后重试')
}
