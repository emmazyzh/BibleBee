import { getSql } from '../../server/lib/db.js'
import { getCurrentDbUser } from '../../server/lib/current-user.js'
import { ApiError, readJsonRequest } from '../../server/lib/http.js'
import { handleCors, sendError, sendJson, toWebRequest, getBindings } from '../_utils.js'

const REVIEW_INTERVALS_IN_DAYS = [1, 2, 4, 7, 15, 30]

function getNextReviewDate(nextReviewCount) {
  const offsetDays = REVIEW_INTERVALS_IN_DAYS[Math.min(nextReviewCount - 1, REVIEW_INTERVALS_IN_DAYS.length - 1)]
  const next = new Date()
  next.setDate(next.getDate() + offsetDays)
  return next
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  try {
    const bindings = getBindings()
    const request = await toWebRequest(req)
    const user = await getCurrentDbUser(request, bindings)
    const { userVerseId, action } = await readJsonRequest(request)

    if (!userVerseId || !action) {
      throw new ApiError(400, 'Missing review payload')
    }

    const sql = getSql(bindings)
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
      return sendJson(res, { ok: true, skipped: true })
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

      return sendJson(res, { ok: true, status: 'mastered' })
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

      return sendJson(res, { ok: true, status: nextStatus })
    }

    throw new ApiError(400, 'Unknown review action')
  } catch (error) {
    return sendError(res, error, 'Failed to update memorization review')
  }
}
