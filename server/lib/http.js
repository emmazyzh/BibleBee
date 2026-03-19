export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

export async function readJsonRequest(request) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return request.json()
  }

  const raw = await request.text()
  return raw ? JSON.parse(raw) : {}
}

export function jsonError(c, error, fallbackMessage) {
  const statusCode = error instanceof ApiError ? error.statusCode : 500
  return c.json({ ok: false, error: error.message || fallbackMessage }, statusCode)
}
