import { ApiError } from '../../server/lib/http.js'
import memorizationHandler from '../../server/routes/memorization/index.js'
import memorizationReviewHandler from '../../server/routes/memorization/review.js'
import { sendError } from '../_utils.js'

function getRouteParts(req) {
  const rawRoute = req.query?.route
  if (Array.isArray(rawRoute)) {
    return rawRoute
  }
  if (typeof rawRoute === 'string' && rawRoute) {
    return [rawRoute]
  }
  return []
}

export default async function handler(req, res) {
  try {
    const method = (req.method || 'GET').toUpperCase()
    const routeParts = getRouteParts(req)

    if (method === 'GET' && routeParts.length === 0) {
      return memorizationHandler(req, res)
    }

    if (method === 'POST' && routeParts.length === 1 && routeParts[0] === 'review') {
      return memorizationReviewHandler(req, res)
    }

    throw new ApiError(404, 'Not found')
  } catch (error) {
    return sendError(res, error, 'Not found')
  }
}
