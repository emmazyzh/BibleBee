import { loadStaticJson } from '../server/lib/static-data.js'
import { sendJson } from './_utils.js'

export default async function handler(req, res) {
  const { name } = req.query

  if (name === 'combined' || name === 'plans') {
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
