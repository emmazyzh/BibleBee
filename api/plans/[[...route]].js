import { ApiError } from '../../server/lib/http.js'
import planDetailHandler from '../../server/routes/plans/detail.js'
import plansHandler from '../../server/routes/plans/index.js'
import planSelectHandler from '../../server/routes/plans/select.js'
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
      return plansHandler(req, res)
    }

    if (method === 'GET' && routeParts.length === 1) {
      req.query = {
        ...(req.query || {}),
        planId: decodeURIComponent(routeParts[0] || ''),
      }
      return planDetailHandler(req, res)
    }

    if (method === 'POST' && routeParts.length === 2 && routeParts[1] === 'select') {
      req.query = {
        ...(req.query || {}),
        planId: decodeURIComponent(routeParts[0] || ''),
      }
      return planSelectHandler(req, res)
    }

    throw new ApiError(404, 'Not found')
  } catch (error) {
    return sendError(res, error, 'Not found')
  }
}
