import { getSql } from '../server/lib/db.js'
import { getCurrentDbUser } from '../server/lib/current-user.js'
import { ApiError, readJsonRequest } from '../server/lib/http.js'
import { sendError, sendJson, toWebRequest, getBindings } from './_utils.js'

const REVIEW_INTERVALS_IN_DAYS = [1, 2, 4, 7, 15, 30]

function getNextReviewDate(nextReviewCount) {
  const offsetDays = REVIEW_INTERVALS_IN_DAYS[Math.min(nextReviewCount - 1, REVIEW_INTERVALS_IN_DAYS.length - 1)]
  const next = new Date()
  next.setDate(next.getDate() + offsetDays)
  return next
}

async function applyReviewOperation(sql, user, payload) {
  const { userVerseId, action } = payload || {}

  if (!userVerseId || !action) {
    throw new ApiError(400, 'Missing review payload')
  }

  const [record] = await sql`
    SELECT id, status, review_count
    FROM user_verse
    WHERE id = ${userVerseId}
      AND user_id = ${user.id}
    LIMIT 1
  `

  if (!record) {
    return { ignored: true, reason: 'Verse not found' }
  }

  if (action === 'skip') {
    return { ok: true, skipped: true }
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

    return { ok: true, status: 'mastered' }
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

    return { ok: true, status: nextStatus }
  }

  throw new ApiError(400, 'Unknown review action')
}

async function applySelectPlanOperation(sql, user, payload) {
  const { planId, clearCurrent = false } = payload || {}

  if (!planId) {
    throw new ApiError(400, 'Missing plan id')
  }

  const [plan] = await sql`
    SELECT id, plan_name
    FROM plan
    WHERE id = ${planId}
    LIMIT 1
  `

  if (!plan) {
    throw new ApiError(404, 'Plan not found')
  }

  await sql`
    INSERT INTO user_plan (id, user_id, plan_id)
    VALUES (${crypto.randomUUID()}, ${user.id}, ${planId})
    ON CONFLICT (user_id, plan_id) DO NOTHING
  `

  if (clearCurrent) {
    await sql`
      DELETE FROM user_verse
      WHERE user_id = ${user.id}
        AND status = 'learning'
    `

    await sql`
      UPDATE user_verse
      SET
        status = 'mastered',
        next_review_date = NULL,
        modified_at = NOW()
      WHERE user_id = ${user.id}
        AND status = 'relearning'
    `
  }

  const planVerses = await sql`
    SELECT verse_id
    FROM plan_verse
    WHERE plan_id = ${planId}
    ORDER BY order_index ASC
  `

  for (const verse of planVerses) {
    const [existing] = await sql`
      SELECT id, status
      FROM user_verse
      WHERE user_id = ${user.id}
        AND verse_id = ${verse.verse_id}
      LIMIT 1
    `

    if (!existing) {
      await sql`
        INSERT INTO user_verse (
          id,
          user_id,
          verse_id,
          status,
          review_count,
          next_review_date,
          mastery_date
        )
        VALUES (
          ${crypto.randomUUID()},
          ${user.id},
          ${verse.verse_id},
          'learning',
          0,
          NULL,
          NULL
        )
      `
      continue
    }

    if (existing.status === 'mastered') {
      await sql`
        UPDATE user_verse
        SET
          status = 'relearning',
          review_count = 0,
          mastery_date = NULL,
          next_review_date = NULL,
          modified_at = NOW()
        WHERE id = ${existing.id}
      `
    }
  }

  return { ok: true, planId, planName: plan.plan_name, verseCount: planVerses.length }
}

async function applyAddVerseOperation(sql, user, payload) {
  const { verseId } = payload || {}

  if (!verseId) {
    throw new ApiError(400, 'Missing verse id')
  }

  const [existing] = await sql`
    SELECT id, status
    FROM user_verse
    WHERE user_id = ${user.id}
      AND verse_id = ${verseId}
    LIMIT 1
  `

  if (!existing) {
    await sql`
      INSERT INTO user_verse (
        id,
        user_id,
        verse_id,
        status,
        review_count,
        next_review_date,
        mastery_date
      )
      VALUES (
        ${crypto.randomUUID()},
        ${user.id},
        ${verseId},
        'learning',
        0,
        NULL,
        NULL
      )
    `

    return { ok: true, verseId, status: 'learning', created: true }
  }

  if (existing.status === 'mastered') {
    await sql`
      UPDATE user_verse
      SET
        status = 'relearning',
        review_count = 0,
        mastery_date = NULL,
        next_review_date = NULL,
        modified_at = NOW()
      WHERE id = ${existing.id}
    `

    return { ok: true, verseId, status: 'relearning', updated: true }
  }

  return { ok: true, verseId, status: existing.status, ignored: true }
}

export default async function handler(req, res) {
  try {
    const bindings = getBindings()
    const request = await toWebRequest(req)
    const user = await getCurrentDbUser(request, bindings)
    const { operations = [] } = await readJsonRequest(request)

    if (!Array.isArray(operations) || operations.length === 0) {
      return sendJson(res, { ok: true, synced: 0 })
    }

    const sql = getSql(bindings)
    const results = []

    for (const operation of operations) {
      if (operation?.type === 'review') {
        results.push(await applyReviewOperation(sql, user, operation.payload))
        continue
      }

      if (operation?.type === 'selectPlan') {
        results.push(await applySelectPlanOperation(sql, user, operation.payload))
        continue
      }

      if (operation?.type === 'addVerse') {
        results.push(await applyAddVerseOperation(sql, user, operation.payload))
        continue
      }

      throw new ApiError(400, `Unknown sync operation: ${operation?.type || 'unknown'}`)
    }

    return sendJson(res, {
      ok: true,
      synced: operations.length,
      results,
    })
  } catch (error) {
    return sendError(res, error, 'Failed to sync data')
  }
}
