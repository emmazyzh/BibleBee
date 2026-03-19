import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { registerMeRoute } from './routes/me.js'
import { registerStaticDataRoutes } from './routes/static-data.js'
import { registerBootstrapRoute } from './routes/bootstrap.js'
import { registerPlanRoutes } from './routes/plans.js'
import { registerMemorizationRoutes } from './routes/memorization.js'
import { registerSyncRoute } from './routes/sync.js'
import { registerClerkWebhookRoute } from './routes/clerk-webhook.js'
import { registerDbTestRoute } from './routes/db-test.js'
import { getAuthorizedParties } from './lib/auth.js'

const app = new Hono()

app.use('/api/*', async (c, next) => {
  const allowedOrigins = getAuthorizedParties(c.env, c.req.raw)
  return cors({
    origin: (origin) => {
      if (!origin) {
        return ''
      }

      return allowedOrigins.includes(origin) ? origin : ''
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    exposeHeaders: ['Content-Type'],
    maxAge: 86400,
    credentials: true,
  })(c, next)
})

registerMeRoute(app)
registerStaticDataRoutes(app)
registerBootstrapRoute(app)
registerPlanRoutes(app)
registerMemorizationRoutes(app)
registerSyncRoute(app)
registerClerkWebhookRoute(app)
registerDbTestRoute(app)

app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ ok: false, error: 'Not found' }, 404)
  }

  if (c.env?.ASSETS && typeof c.env.ASSETS.fetch === 'function') {
    return c.env.ASSETS.fetch(c.req.raw)
  }

  return c.text('Not found', 404)
})

export default app
