import { getSql } from '../../lib/neon.js'
import { getCurrentDbUser } from '../../lib/current-user.js'
import { ApiError, readJsonBody } from '../../lib/api.js'

const REVIEW_INTERVALS_IN_DAYS = [1, 2, 4, 7, 15, 30]

function getNextReviewDate(nextReviewCount) {
  const offsetDays = REVIEW_INTERVALS_IN_DAYS[Math.min(nextReviewCount - 1, REVIEW_INTERVALS_IN_DAYS.length - 1)]
  const next = new Date()
  next.setDate(next.getDate() + offsetDays)
  return next
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const user = await getCurrentDbUser(req)
    const { userVerseId, action } = await readJsonBody(req)

    if (!userVerseId || !action) {
      throw new ApiError(400, 'Missing review payload')
    }

    const sql = getSql()
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
      return res.status(200).json({ ok: true, skipped: true })
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

      return res.status(200).json({ ok: true, status: 'mastered' })
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

      return res.status(200).json({ ok: true, status: nextStatus })
    }

    throw new ApiError(400, 'Unknown review action')
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 500
    return res.status(statusCode).json({ ok: false, error: error.message || 'Failed to update memorization review' })
  }
}
