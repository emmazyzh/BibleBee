import { getSql } from '../server/lib/db.js'
import { getCurrentDbUser } from '../server/lib/current-user.js'
import { ApiError, readJsonRequest } from '../server/lib/http.js'
import { ensureUserFeedbackTable } from '../server/lib/user-feedback.js'
import { handleCors, sendError, sendJson, toWebRequest, getBindings } from './_utils.js'

function normalizeFeedbackStatus(status) {
  const value = String(status || '').toLowerCase()
  return ['pending', 'reviewing', 'resolved', 'closed'].includes(value) ? value : 'pending'
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  try {
    const method = (req.method || 'GET').toUpperCase()
    const bindings = getBindings()
    const request = await toWebRequest(req)
    const user = await getCurrentDbUser(request, bindings)
    await ensureUserFeedbackTable(bindings)
    const sql = getSql(bindings)

    if (method === 'GET') {
      const rows = await sql`
        SELECT id, content, reply, status, created_at, modified_at
        FROM user_feedback
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `

      return sendJson(res, {
        ok: true,
        feedback: rows.map((row) => ({
          id: row.id,
          content: row.content,
          reply: row.reply || '',
          status: normalizeFeedbackStatus(row.status),
          created_at: row.created_at,
          modified_at: row.modified_at,
          createdAt: row.created_at,
          modifiedAt: row.modified_at,
        })),
      })
    }

    if (method === 'POST') {
      const body = await readJsonRequest(request)
      const content = String(body?.content || '').trim()

      if (content.length < 10) {
        throw new ApiError(400, '反馈内容至少填写 10 个字')
      }

      const [record] = await sql`
        INSERT INTO user_feedback (
          user_id,
          content,
          reply,
          status
        )
        VALUES (
          ${user.id},
          ${content},
          NULL,
          'pending'
        )
        RETURNING id, content, reply, status, created_at, modified_at
      `

      return sendJson(res, {
        ok: true,
        feedback: {
          id: record.id,
          content: record.content,
          reply: record.reply || '',
          status: normalizeFeedbackStatus(record.status),
          created_at: record.created_at,
          modified_at: record.modified_at,
          createdAt: record.created_at,
          modifiedAt: record.modified_at,
        },
      })
    }

    throw new ApiError(405, 'Method not allowed')
  } catch (error) {
    return sendError(res, error, 'Failed to handle feedback')
  }
}
