import { getSql } from '../server/lib/db.js'
import { getCurrentDbUser } from '../server/lib/current-user.js'
import { handleCors, sendError, sendJson, toWebRequest, getBindings } from './_utils.js'

function normalizePlanRows(rows) {
  return rows.map((row) => ({
    ...row,
    selected_users: Array.isArray(row.selected_users) ? row.selected_users : [],
  }))
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  try {
    const bindings = getBindings()
    const user = await getCurrentDbUser(await toWebRequest(req), bindings)
    const sql = getSql(bindings)

    const planRows = await sql`
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

    const planVerseRows = await sql`
      SELECT p.id AS plan_id, pv.verse_id, pv.order_index
      FROM plan p
      JOIN plan_verse pv ON pv.plan_id = p.id
      ORDER BY p.created_at ASC, pv.order_index ASC
    `

    const userVerseRows = await sql`
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

    const plans = normalizePlanRows(planRows)
    const planDetails = {}

    for (const plan of plans) {
      const verses = planVerseRows
        .filter((item) => item.plan_id === plan.id)
        .map((item) => ({
          verseId: item.verse_id,
          orderIndex: item.order_index,
        }))

      planDetails[plan.id] = {
        plan: {
          id: plan.id,
          plan_name: plan.plan_name,
          description: plan.description,
          created_at: plan.created_at,
          verseCount: verses.length,
        },
        verses,
      }
    }

    const allVerses = userVerseRows.map((row) => ({
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
      user: {
        id: user.id,
        clerkUserId: user.clerk_user_id,
        username: user.username,
        imageUrl: user.image_url,
      },
      plans,
      planDetails,
      memorizationData: {
        activeVerses: allVerses.filter((item) => item.status === 'learning' || item.status === 'relearning'),
        masteredVerses: allVerses.filter((item) => item.status === 'mastered'),
      },
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    return sendError(res, error, 'Failed to load bootstrap data')
  }
}
