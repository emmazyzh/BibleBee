import { createClerkClient } from '@clerk/backend'
import { readEnv, readEnvList, requireEnv } from './env.js'

function normalizeUrl(value) {
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\/+$/, '') : ''
}

export function getAuthorizedParties(bindings, request) {
  const requestOrigin = request ? normalizeUrl(new URL(request.url).origin) : ''

  return Array.from(new Set([
    ...readEnvList('FRONTEND_ORIGINS', bindings).map(normalizeUrl),
    normalizeUrl(readEnv('VITE_CLOUDFLARE_APP_URL', bindings)),
    normalizeUrl(readEnv('VITE_VERCEL_APP_URL', bindings)),
    normalizeUrl(readEnv('VITE_PRIMARY_API_BASE_URL', bindings)),
    normalizeUrl(readEnv('VITE_FALLBACK_API_BASE_URL', bindings)),
    requestOrigin,
    'http://localhost:8787',
    'http://localhost:8788',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4010',
    'http://localhost:5173',
    'http://localhost:5174',
  ].filter(Boolean)))
}

export function getClerkClient(bindings) {
  return createClerkClient({
    secretKey: requireEnv('CLERK_SECRET_KEY', bindings),
    publishableKey: requireEnv('VITE_CLERK_PUBLISHABLE_KEY', bindings),
  })
}

export async function authenticateRequest(request, bindings) {
  const clerkClient = getClerkClient(bindings)
  const jwtKey = readEnv('CLERK_JWT_KEY', bindings)
  const requestState = await clerkClient.authenticateRequest(request, {
    authorizedParties: getAuthorizedParties(bindings, request),
    ...(jwtKey ? { jwtKey } : {}),
  })
  const auth = requestState.toAuth()

  return {
    isAuthenticated: auth.isAuthenticated,
    userId: auth.userId,
    sessionId: auth.sessionId,
  }
}
