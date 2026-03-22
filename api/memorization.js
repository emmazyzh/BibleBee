import { ApiError } from '../server/lib/http.js'
import memorizationHandler from '../server/routes/memorization/index.js'
import memorizationReviewHandler from '../server/routes/memorization/review.js'
import { sendError } from './_utils.js'

function normalizePathname(url) {
  return new URL(url || '/api/memorization', 'http://localhost').pathname.replace(/\/+$/, '') || '/'
}

export default async function handler(req, res) {
  try {
    const method = (req.method || 'GET').toUpperCase()
    const pathname = normalizePathname(req.url)

    if (method === 'GET' && pathname === '/api/memorization') {
      return memorizationHandler(req, res)
    }

    if (method === 'POST' && pathname === '/api/memorization/review') {
      return memorizationReviewHandler(req, res)
    }

    throw new ApiError(404, 'Not found')
  } catch (error) {
    return sendError(res, error, 'Not found')
  }
}
