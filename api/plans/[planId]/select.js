import { randomUUID } from 'node:crypto'
import { getSql } from '../../../lib/neon.js'
import { getCurrentDbUser } from '../../../lib/current-user.js'
import { ApiError, readJsonBody } from '../../../lib/api.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const user = await getCurrentDbUser(req)
    const { clearCurrent = false } = await readJsonBody(req)
    const planId = req.query.planId
    const sql = getSql()

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
      VALUES (${randomUUID()}, ${user.id}, ${planId})
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
            ${randomUUID()},
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

    return res.status(200).json({
      ok: true,
      planId,
      planName: plan.plan_name,
      verseCount: planVerses.length,
    })
  } catch (error) {
    const statusCode = error instanceof ApiError ? error.statusCode : 500
    return res.status(statusCode).json({ ok: false, error: error.message || 'Failed to select plan' })
  }
}
