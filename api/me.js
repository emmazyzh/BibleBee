import { authenticateApiRequest } from '../lib/clerk-server.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const auth = await authenticateApiRequest(req)

    if (!auth.isAuthenticated) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    return res.status(200).json({
      ok: true,
      userId: auth.userId,
      sessionId: auth.sessionId,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to authenticate request',
    })
  }
}
