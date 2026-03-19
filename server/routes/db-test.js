import { getSql } from '../lib/db.js'
import { jsonError } from '../lib/http.js'

export function registerDbTestRoute(app) {
  app.get('/api/db-test', async (c) => {
    try {
      const sql = getSql(c.env)
      const [result] = await sql`SELECT NOW() AS now`

      return c.json({
        ok: true,
        now: result.now,
        message: 'Connected to Neon successfully',
      })
    } catch (error) {
      return jsonError(c, error, 'Failed to connect to Neon')
    }
  })
}
