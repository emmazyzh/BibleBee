import { ApiError } from '../server/lib/http.js'

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
