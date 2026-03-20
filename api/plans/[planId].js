import { getSql } from '../../server/lib/db.js'
import { ApiError } from '../../server/lib/http.js'
import { getCurrentDbUser } from '../../server/lib/current-user.js'
import { handleCors, sendError, sendJson, toWebRequest, getBindings } from '../_utils.js'

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  try {
    const bindings = getBindings()
    await getCurrentDbUser(await toWebRequest(req), bindings)

    const { planId } = req.query
    const sql = getSql(bindings)
    const [plan] = await sql`
      SELECT id, plan_name, description, created_at
      FROM plan
      WHERE id = ${planId}
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
