import combinedData from '../data/combined.json' with { type: 'json' }
import plansData from '../data/plans.json' with { type: 'json' }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const { name } = req.query

  if (name === 'combined') {
    return res.status(200).json({ ok: true, name, data: combinedData })
  }

  if (name === 'plans') {
    return res.status(200).json({ ok: true, name, data: plansData })
  }

  return res.status(404).json({ ok: false, error: 'Static data not found' })
}
