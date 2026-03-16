import { getSql } from '../lib/neon.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sql = getSql()
    const [result] = await sql`SELECT NOW() AS now`

    return res.status(200).json({
      ok: true,
      now: result.now,
      message: 'Connected to Neon successfully',
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to connect to Neon',
    })
  }
}
