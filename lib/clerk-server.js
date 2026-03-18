import { createClerkClient } from '@clerk/backend'

function getRequiredEnv(name) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is not set`)
  }

  return value
}

function toAbsoluteUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http'
  const host = req.headers.host || 'localhost:3000'
  const path = req.url || '/'

  return new URL(path, `${proto}://${host}`)
}

function toHeaders(req) {
  const headers = new Headers()

  Object.entries(req.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => headers.append(key, item))
      return
    }

    if (typeof value === 'string') {
      headers.set(key, value)
    }
  })

  return headers
}

export function getClerkClient() {
  return createClerkClient({
    secretKey: getRequiredEnv('CLERK_SECRET_KEY'),
    publishableKey: getRequiredEnv('VITE_CLERK_PUBLISHABLE_KEY'),
  })
}

export async function authenticateApiRequest(req) {
  const clerkClient = getClerkClient()
  const request = new Request(toAbsoluteUrl(req), {
    method: req.method || 'GET',
    headers: toHeaders(req),
  })

  const requestState = await clerkClient.authenticateRequest(request)
  const auth = requestState.toAuth()

  return {
    isAuthenticated: auth.isAuthenticated,
    userId: auth.userId,
    sessionId: auth.sessionId,
  }
}
