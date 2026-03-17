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
    const user = await getCurrentDbUser(req)
    const sql = getSql()

    const rows = await sql`
      SELECT
        id,
        verse_id,
        status,
        mastery_date,
        review_count,
        next_review_date,
        modified_at,
        created_at
      FROM user_verse
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
    `

    const verses = rows.map(row => ({
      userVerseId: row.id,
      status: row.status,
      masteryDate: row.mastery_date,
      reviewCount: row.review_count,
      nextReviewDate: row.next_review_date,
      modifiedAt: row.modified_at,
      createdAt: row.created_at,
      ...getVerseDetails(row.verse_id),
    }))

    return res.status(200).json({
      ok: true,
      activeVerses: verses.filter(item => item.status === 'learning' || item.status === 'relearning'),
      masteredVerses: verses.filter(item => item.status === 'mastered'),
    })
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 500
    return res.status(statusCode).json({ ok: false, error: error.message || 'Failed to load memorization data' })
  }
}
