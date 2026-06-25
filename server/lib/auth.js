import { createClerkClient } from '@clerk/backend'
import { readEnv, readEnvList, requireEnv } from './env.js'

function normalizeUrl(value) {
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\/+$/, '') : ''
}

export function getAuthorizedParties(bindings, request) {
  const requestOrigin = request ? normalizeUrl(new URL(request.url).origin) : ''
  const headerOrigin = request ? normalizeUrl(request.headers.get('origin')) : ''

  return Array.from(new Set([
    ...readEnvList('FRONTEND_ORIGINS', bindings).map(normalizeUrl),
    normalizeUrl(readEnv('VITE_VERCEL_APP_URL', bindings)),
    requestOrigin,
    headerOrigin,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ].filter(Boolean)))
}

export function getClerkClient(bindings) {
  const publishableKey =
    readEnv('CLERK_PUBLISHABLE_KEY', bindings) ||
    readEnv('VITE_CLERK_PUBLISHABLE_KEY', bindings)

  if (!publishableKey) {
    throw new Error('Clerk publishable key is not set')
  }

  return createClerkClient({
    secretKey: requireEnv('CLERK_SECRET_KEY', bindings),
    publishableKey,
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
