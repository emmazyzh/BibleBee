import { loadStaticJson } from '../lib/static-data.js'

export function registerStaticDataRoutes(app) {
  app.get('/api/static-data', async (c) => {
    const name = c.req.query('name')

    if (name === 'combined') {
      return c.json({ ok: true, name, data: await loadStaticJson(name, c.env) })
    }

    if (name === 'plans') {
      return c.json({ ok: true, name, data: await loadStaticJson(name, c.env) })
    }

    return c.json({ ok: false, error: 'Static data not found' }, 404)
  })
}
