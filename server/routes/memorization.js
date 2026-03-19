import { getSql } from '../lib/db.js'
import { getCurrentDbUser } from '../lib/current-user.js'
import { ApiError, jsonError, readJsonRequest } from '../lib/http.js'

const REVIEW_INTERVALS_IN_DAYS = [1, 2, 4, 7, 15, 30]

function getNextReviewDate(nextReviewCount) {
  const offsetDays = REVIEW_INTERVALS_IN_DAYS[Math.min(nextReviewCount - 1, REVIEW_INTERVALS_IN_DAYS.length - 1)]
  const next = new Date()
  next.setDate(next.getDate() + offsetDays)
  return next
}

export function registerMemorizationRoutes(app) {
  app.get('/api/memorization', async (c) => {
    try {
      const user = await getCurrentDbUser(c.req.raw, c.env)
      const sql = getSql(c.env)

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

      return c.json({
        ok: true,
        activeVerses: verses.filter((item) => item.status === 'learning' || item.status === 'relearning'),
        masteredVerses: verses.filter((item) => item.status === 'mastered'),
      })
    } catch (error) {
      return jsonError(c, error, 'Failed to load memorization data')
    }
  })

  app.post('/api/memorization/review', async (c) => {
    try {
      const user = await getCurrentDbUser(c.req.raw, c.env)
      const { userVerseId, action } = await readJsonRequest(c.req.raw)

      if (!userVerseId || !action) {
        throw new ApiError(400, 'Missing review payload')
      }

      const sql = getSql(c.env)
      const [record] = await sql`
        SELECT id, status, review_count
        FROM user_verse
        WHERE id = ${userVerseId}
          AND user_id = ${user.id}
        LIMIT 1
      `

      if (!record) {
        throw new ApiError(404, 'Verse not found')
      }

      if (action === 'skip') {
        return c.json({ ok: true, skipped: true })
      }

      if (action === 'mastered') {
        const nextReviewCount = record.review_count + 1

        await sql`
          UPDATE user_verse
          SET
            status = 'mastered',
            review_count = ${nextReviewCount},
            mastery_date = NOW(),
            next_review_date = ${getNextReviewDate(nextReviewCount)},
            modified_at = NOW()
          WHERE id = ${record.id}
        `

        return c.json({ ok: true, status: 'mastered' })
      }

      if (action === 'again') {
        const nextStatus = record.status === 'relearning' ? 'relearning' : 'learning'

        await sql`
          UPDATE user_verse
          SET
            status = ${nextStatus},
            next_review_date = NULL,
            modified_at = NOW()
          WHERE id = ${record.id}
        `

        return c.json({ ok: true, status: nextStatus })
      }

      throw new ApiError(400, 'Unknown review action')
    } catch (error) {
      return jsonError(c, error, 'Failed to update memorization review')
    }
  })
}
