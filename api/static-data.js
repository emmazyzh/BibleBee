import { loadStaticJson } from '../server/lib/static-data.js'
import { handleCors, sendJson } from '../server/lib/api-utils.js'

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  const { name } = req.query

  if (name === 'combined' || name === 'frequent') {
    return sendJson(res, {
      ok: true,
      name,
      data: await loadStaticJson(name, getBindings()),
    })
  }

  return sendJson(res, { ok: false, error: 'Static data not found' }, 404)
}

function getBindings() {
  return process.env
}
