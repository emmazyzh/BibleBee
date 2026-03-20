import { ApiError } from '../server/lib/http.js'
import { readEnvList } from '../server/lib/env.js'

function getHeaderValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return value ?? ''
}

async function readRawBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  return Buffer.concat(chunks)
}

async function getRequestBody(req, { rawBody = false } = {}) {
  if (rawBody && req.rawBody !== undefined) {
    return Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(String(req.rawBody))
  }

  if (req.body !== undefined && req.body !== null && !rawBody) {
    if (Buffer.isBuffer(req.body)) {
      return req.body
    }

    if (typeof req.body === 'string') {
      return req.body
    }

    return JSON.stringify(req.body)
  }

  const raw = await readRawBody(req)
  if (rawBody) {
    return raw
  }

  return raw.length > 0 ? raw : undefined
}

export async function toWebRequest(req, options = {}) {
  const protocol = getHeaderValue(req.headers['x-forwarded-proto']) || 'http'
  const host = getHeaderValue(req.headers.host) || 'localhost'
  const url = new URL(req.url || '/', `${protocol}://${host}`)
  const headers = new Headers()

  Object.entries(req.headers || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      headers.set(key, getHeaderValue(value))
    }
  })

  const method = req.method || 'GET'
  const body = method === 'GET' || method === 'HEAD'
    ? undefined
    : await getRequestBody(req, options)

  return new Request(url, {
    method,
    headers,
    body,
  })
}

export function sendJson(res, payload, statusCode = 200) {
  res.status(statusCode)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.send(JSON.stringify(payload))
}

export function sendError(res, error, fallbackMessage) {
  const statusCode = error instanceof ApiError ? error.statusCode : 500
  return sendJson(res, { ok: false, error: error.message || fallbackMessage }, statusCode)
}

export function getBindings() {
  return process.env
}

function normalizeOrigin(value) {
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\/+$/, '') : ''
}

function getRequestOrigin(req) {
  return normalizeOrigin(getHeaderValue(req.headers?.origin))
}

function getAllowedOrigins(bindings) {
  return Array.from(new Set([
    ...readEnvList('FRONTEND_ORIGINS', bindings).map(normalizeOrigin),
    normalizeOrigin(bindings?.VITE_VERCEL_APP_URL),
    normalizeOrigin(bindings?.VITE_API_BASE_URL),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean)))
}

function isTrustedPreviewOrigin(origin) {
  if (!origin) return false

  try {
    const { hostname, protocol } = new URL(origin)
    if (!/^https?:$/.test(protocol)) return false

    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.pages.dev') ||
      hostname.endsWith('.vercel.app')
    )
  } catch {
    return false
  }
}

function applyCorsHeaders(req, res) {
  const bindings = getBindings()
  const requestOrigin = getRequestOrigin(req)
  const allowedOrigins = getAllowedOrigins(bindings)

  if (requestOrigin && (allowedOrigins.includes(requestOrigin) || isTrustedPreviewOrigin(requestOrigin))) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin)
    res.setHeader('Vary', 'Origin')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export function handleCors(req, res) {
  applyCorsHeaders(req, res)

  if ((req.method || 'GET').toUpperCase() === 'OPTIONS') {
    res.status(204)
    res.end()
    return true
  }

  return false
}
