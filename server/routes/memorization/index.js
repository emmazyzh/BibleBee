import { getSql } from '../../lib/db.js'
import { getCurrentDbUser } from '../../lib/current-user.js'
import { handleCors, sendError, sendJson, toWebRequest, getBindings } from '../../../api/_utils.js'

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  try {
    const bindings = getBindings()
    const user = await getCurrentDbUser(await toWebRequest(req), bindings)
    const sql = getSql(bindings)

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

    const verses = rows.map((row) => ({
      userVerseId: row.id,
      verseId: row.verse_id,
      status: row.status,
      masteryDate: row.mastery_date,
      reviewCount: row.review_count,
      nextReviewDate: row.next_review_date,
      modifiedAt: row.modified_at,
      createdAt: row.created_at,
    }))

    return sendJson(res, {
      ok: true,
      activeVerses: verses.filter((item) => item.status === 'learning' || item.status === 'relearning'),
      masteredVerses: verses.filter((item) => item.status === 'mastered'),
    })
  } catch (error) {
    return sendError(res, error, 'Failed to load memorization data')
  }
}
