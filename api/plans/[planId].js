import { getSql } from '../../lib/neon.js'
import { getCurrentDbUser } from '../../lib/current-user.js'
import { ApiError } from '../../lib/api.js'
import { getVerseDetails } from '../../lib/bible.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    await getCurrentDbUser(req)

    const planId = req.query.planId
    const sql = getSql()

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

    const verses = planVerses.map(item => ({
      orderIndex: item.order_index,
      ...getVerseDetails(item.verse_id),
    }))

    return res.status(200).json({
      ok: true,
      plan: {
        ...plan,
        verseCount: verses.length,
      },
      verses,
    })
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 500
    return res.status(statusCode).json({ ok: false, error: error.message || 'Failed to load plan verses' })
  }
}
