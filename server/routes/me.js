import { getCurrentDbUser } from '../lib/current-user.js'
import { jsonError } from '../lib/http.js'

export function registerMeRoute(app) {
  app.get('/api/me', async (c) => {
    try {
      const user = await getCurrentDbUser(c.req.raw, c.env)

      return c.json({
        ok: true,
        userId: user.clerk_user_id,
        dbUserId: user.id,
      })
    } catch (error) {
      return jsonError(c, error, 'Failed to authenticate request')
    }
  })
}
