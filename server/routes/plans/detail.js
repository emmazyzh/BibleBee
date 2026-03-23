import { getSql } from '../../lib/db.js'
import { ApiError } from '../../lib/http.js'
import { getOptionalCurrentDbUser } from '../../lib/current-user.js'
import { handleCors, sendError, sendJson, toWebRequest, getBindings } from '../../lib/api-utils.js'

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  try {
    const bindings = getBindings()
    const user = await getOptionalCurrentDbUser(await toWebRequest(req), bindings)

    const { planId } = req.query
    const sql = getSql(bindings)
    const [plan] = await sql`
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
      LEFT JOIN user_plan up ON up.plan_id = p.id AND up.user_id = ${user?.id || null}
      WHERE p.id = ${planId}
      GROUP BY p.id, p.plan_name, p.description, p.created_at
      LIMIT 1
    `

    if (!plan) {
      throw new ApiError(404, 'Plan not found')
    }

    const planVerses = await sql`
      SELECT verse_id, order_index
      FROM plan_verse
      WHERE plan_id = ${planId}
      ORDER BY order_index ASC
    `

    const verses = planVerses.map((item) => ({
      verseId: item.verse_id,
      orderIndex: item.order_index,
    }))

    return sendJson(res, {
      ok: true,
      plan: {
        ...plan,
        verseCount: verses.length,
      },
      verses,
    })
  } catch (error) {
    return sendError(res, error, 'Failed to load plan verses')
  }
}
