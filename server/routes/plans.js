import { getSql } from '../lib/db.js'
import { getCurrentDbUser } from '../lib/current-user.js'
import { ApiError, jsonError, readJsonRequest } from '../lib/http.js'

export function registerPlanRoutes(app) {
  app.get('/api/plans', async (c) => {
    try {
      const user = await getCurrentDbUser(c.req.raw, c.env)
      const sql = getSql(c.env)
      const plans = await sql`
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
        LEFT JOIN user_plan up ON up.plan_id = p.id AND up.user_id = ${user.id}
        GROUP BY p.id, p.plan_name, p.description, p.created_at
        ORDER BY p.created_at ASC
      `

      return c.json({ ok: true, plans })
    } catch (error) {
      return jsonError(c, error, 'Failed to load plans')
    }
  })

  app.get('/api/plans/:planId', async (c) => {
    try {
      await getCurrentDbUser(c.req.raw, c.env)

      const planId = c.req.param('planId')
      const sql = getSql(c.env)
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

      return c.json({
        ok: true,
        plan: {
          ...plan,
          verseCount: verses.length,
        },
        verses,
      })
    } catch (error) {
      return jsonError(c, error, 'Failed to load plan verses')
    }
  })

  app.post('/api/plans/:planId/select', async (c) => {
    try {
      const user = await getCurrentDbUser(c.req.raw, c.env)
      const { clearCurrent = false } = await readJsonRequest(c.req.raw)
      const planId = c.req.param('planId')
      const sql = getSql(c.env)

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

      return c.json({
        ok: true,
        planId,
        planName: plan.plan_name,
        verseCount: planVerses.length,
      })
    } catch (error) {
      return jsonError(c, error, 'Failed to select plan')
    }
  })
}
