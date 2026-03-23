import { getSql } from '../server/lib/db.js'
import { getCurrentDbUser } from '../server/lib/current-user.js'
import { ApiError } from '../server/lib/http.js'
import { handleCors, sendError, sendJson, toWebRequest, getBindings } from '../server/lib/api-utils.js'

const DEFAULT_CH_VERSION = 'cuv'
const DEFAULT_EN_VERSION = 'niv'

function normalizeChineseVersion(value) {
  const normalized = String(value || '').toLowerCase()
  return normalized === 'cuv' ? 'cuv' : DEFAULT_CH_VERSION
}

function normalizeEnglishVersion(value) {
  const normalized = String(value || '').toLowerCase()
  return normalized === 'esv' || normalized === 'niv' ? normalized : DEFAULT_EN_VERSION
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  try {
    if ((req.method || 'GET').toUpperCase() !== 'POST') {
      throw new ApiError(405, 'Method not allowed')
    }

    const bindings = getBindings()
    const user = await getCurrentDbUser(await toWebRequest(req), bindings)
    const sql = getSql(bindings)
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})

    const nextChVersion = normalizeChineseVersion(body.chVersion)
    const nextEnVersion = normalizeEnglishVersion(body.enVersion)

    await sql`
      UPDATE users
      SET
        ch_version = ${nextChVersion},
        en_version = ${nextEnVersion},
        modified_at = NOW()
      WHERE id = ${user.id}
    `

    return sendJson(res, {
      ok: true,
      chVersion: nextChVersion,
      enVersion: nextEnVersion,
    })
  } catch (error) {
    return sendError(res, error, 'Failed to update settings')
  }
}
