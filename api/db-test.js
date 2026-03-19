import { getSql } from '../server/lib/db.js'
import { sendError, sendJson, getBindings } from './_utils.js'

export default async function handler(_req, res) {
  try {
    const sql = getSql(getBindings())
    const [result] = await sql`SELECT NOW() AS now`

    return sendJson(res, {
      ok: true,
      now: result.now,
      message: 'Connected to Neon successfully',
    })
  } catch (error) {
    return sendError(res, error, 'Failed to connect to Neon')
  }
}
