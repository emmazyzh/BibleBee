import { getSql } from '../server/lib/db.js'
import { handleCors, sendError, sendJson, getBindings } from '../server/lib/api-utils.js'

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  try {
    const sql = getSql(getBindings())
    const leaderboard = await sql`
      SELECT
        u.id,
        u.username,
        u.image_url,
        COUNT(*) FILTER (WHERE uv.status = 'mastered')::int AS mastered_count
      FROM users u
      LEFT JOIN user_verse uv ON uv.user_id = u.id
      GROUP BY u.id, u.username, u.image_url
      ORDER BY mastered_count DESC, u.username ASC, u.created_at ASC
    `

    return sendJson(res, {
      ok: true,
      leaderboard,
    })
  } catch (error) {
    return sendError(res, error, 'Failed to load leaderboard')
  }
}
