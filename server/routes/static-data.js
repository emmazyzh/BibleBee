import combinedData from '../../data/combined.json' with { type: 'json' }
import plansData from '../../data/plans.json' with { type: 'json' }

export function registerStaticDataRoutes(app) {
  app.get('/api/static-data', (c) => {
    const name = c.req.query('name')

    if (name === 'combined') {
      return c.json({ ok: true, name, data: combinedData })
    }

    if (name === 'plans') {
      return c.json({ ok: true, name, data: plansData })
    }

    return c.json({ ok: false, error: 'Static data not found' }, 404)
  })
}
