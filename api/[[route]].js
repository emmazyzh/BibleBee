import { ApiError } from '../server/lib/http.js'
import memorizationHandler from '../server/routes/memorization/index.js'
import memorizationReviewHandler from '../server/routes/memorization/review.js'
import planDetailHandler from '../server/routes/plans/detail.js'
import plansHandler from '../server/routes/plans/index.js'
import planSelectHandler from '../server/routes/plans/select.js'
import { sendError } from './_utils.js'

function normalizePathname(url) {
  return new URL(url, 'http://localhost').pathname.replace(/\/+$/, '') || '/'
}

export default async function handler(req, res) {
  try {
    const pathname = normalizePathname(req.url || '/')
    const method = (req.method || 'GET').toUpperCase()

    if (method === 'GET' && pathname === '/api/plans') {
      return plansHandler(req, res)
    }

    if (method === 'GET' && pathname === '/api/memorization') {
      return memorizationHandler(req, res)
    }

    if (method === 'POST' && pathname === '/api/memorization/review') {
      return memorizationReviewHandler(req, res)
    }

    const planSelectMatch = pathname.match(/^\/api\/plans\/([^/]+)\/select$/)
    if (method === 'POST' && planSelectMatch) {
      req.query = {
        ...(req.query || {}),
        planId: decodeURIComponent(planSelectMatch[1] || ''),
      }
      return planSelectHandler(req, res)
    }

    const planDetailMatch = pathname.match(/^\/api\/plans\/([^/]+)$/)
    if (method === 'GET' && planDetailMatch) {
      req.query = {
        ...(req.query || {}),
        planId: decodeURIComponent(planDetailMatch[1] || ''),
      }
      return planDetailHandler(req, res)
    }

    throw new ApiError(404, 'Not found')
  } catch (error) {
    return sendError(res, error, 'Not found')
  }
}
