import { getSql } from '../../lib/neon.js'
import { getCurrentDbUser } from '../../lib/current-user.js'
import { ApiError } from '../../lib/api.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const user = await getCurrentDbUser(req)
    const sql = getSql()
    const plans = await sql`
      SELECT
        p.id,
        p.plan_name,
        p.description,
        p.created_at,
        COUNT(pv.verse_id)::int AS verse_count,
        MAX(CASE WHEN up.user_id IS NOT NULL THEN 1 ELSE 0 END)::int AS is_selected,
        COALESCE(
          (
            SELECT json_agg(user_row ORDER BY user_row.joined_at ASC)
            FROM (
              SELECT
                u.id,
                u.username,
                u.image_url,
                MIN(up_all.joined_at) AS joined_at
              FROM user_plan up_all
              JOIN users u ON u.id = up_all.user_id
              WHERE up_all.plan_id = p.id
              GROUP BY u.id, u.username, u.image_url
            ) AS user_row
          ),
          '[]'::json
        ) AS selected_users
      FROM plan p
      LEFT JOIN plan_verse pv ON pv.plan_id = p.id
      LEFT JOIN user_plan up ON up.plan_id = p.id AND up.user_id = ${user.id}
      GROUP BY p.id, p.plan_name, p.description, p.created_at
      ORDER BY p.created_at ASC
    `

    return res.status(200).json({ ok: true, plans })
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 500
    return res.status(statusCode).json({ ok: false, error: error.message || 'Failed to load plans' })
  }
}
