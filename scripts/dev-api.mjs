import http from 'node:http'
import { parse as parseUrl } from 'node:url'

import bootstrapHandler from '../api/bootstrap.js'
import clerkWebhookHandler, { config as clerkWebhookConfig } from '../api/clerk-webhook.js'
import dbTestHandler from '../api/db-test.js'
import leaderboardHandler from '../api/leaderboard.js'
import meHandler from '../api/me.js'
import memorizationHandler from '../api/memorization/index.js'
import memorizationReviewHandler from '../api/memorization/review.js'
import plansHandler from '../api/plans/index.js'
import planDetailHandler from '../api/plans/[planId].js'
import planSelectHandler from '../api/plans/[planId]/select.js'
import staticDataHandler from '../api/static-data.js'
import syncHandler from '../api/sync.js'

const port = Number(process.env.DEV_API_PORT || 3001)

const routes = [
  { method: 'GET', pattern: /^\/api\/me\/?$/, handler: meHandler },
  { method: 'GET', pattern: /^\/api\/bootstrap\/?$/, handler: bootstrapHandler },
  { method: 'GET', pattern: /^\/api\/leaderboard\/?$/, handler: leaderboardHandler },
  { method: 'GET', pattern: /^\/api\/static-data\/?$/, handler: staticDataHandler },
  { method: 'POST', pattern: /^\/api\/sync\/?$/, handler: syncHandler },
  { method: 'GET', pattern: /^\/api\/db-test\/?$/, handler: dbTestHandler },
  { method: 'POST', pattern: /^\/api\/clerk-webhook\/?$/, handler: clerkWebhookHandler, rawBody: clerkWebhookConfig?.api?.bodyParser === false },
  { method: 'GET', pattern: /^\/api\/plans\/?$/, handler: plansHandler },
  { method: 'GET', pattern: /^\/api\/plans\/([^/]+)\/?$/, handler: planDetailHandler, paramNames: ['planId'] },
  { method: 'POST', pattern: /^\/api\/plans\/([^/]+)\/select\/?$/, handler: planSelectHandler, paramNames: ['planId'] },
  { method: 'GET', pattern: /^\/api\/memorization\/?$/, handler: memorizationHandler },
  { method: 'POST', pattern: /^\/api\/memorization\/review\/?$/, handler: memorizationReviewHandler },
]

function withResponseHelpers(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }

  res.send = (body) => {
    if (body === undefined || body === null) {
      res.end()
      return res
    }

    if (Buffer.isBuffer(body) || typeof body === 'string') {
      res.end(body)
      return res
    }

    res.end(JSON.stringify(body))
    return res
  }

  return res
}

function parseBody(rawBody, headers) {
  const contentType = headers['content-type'] || ''

  if (!rawBody || rawBody.length === 0) {
    return undefined
  }

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawBody.toString('utf8'))
    } catch {
      return undefined
    }
  }

  return rawBody.toString('utf8')
}

function matchRoute(method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue
    const match = pathname.match(route.pattern)
    if (!match) continue

    const params = {}
    ;(route.paramNames || []).forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1] || '')
    })

    return { route, params }
  }

  return null
}

const server = http.createServer(async (req, res) => {
  const { pathname, query } = parseUrl(req.url || '/', true)
  const matched = matchRoute(req.method || 'GET', pathname || '/')

  if (!matched) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: false, error: 'Not found' }))
    return
  }

  const rawChunks = []
  for await (const chunk of req) {
    rawChunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  req.rawBody = Buffer.concat(rawChunks)
  req.body = matched.route.rawBody ? undefined : parseBody(req.rawBody, req.headers)
  req.query = query || {}
  req.cookies = {}

  Object.assign(req.query, matched.params)

  const enhancedRes = withResponseHelpers(res)

  try {
    await matched.route.handler(req, enhancedRes)
  } catch (error) {
    console.error('[dev-api] Unhandled error:', error)
    if (!enhancedRes.headersSent) {
      enhancedRes.statusCode = 500
      enhancedRes.setHeader('Content-Type', 'application/json; charset=utf-8')
    }
    enhancedRes.end(JSON.stringify({ ok: false, error: error.message || 'Internal Server Error' }))
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`[dev-api] listening on http://127.0.0.1:${port}`)
})
