import { getCurrentDbUser } from '../server/lib/current-user.js'
import { handleCors, sendError, sendJson, toWebRequest, getBindings } from './_utils.js'

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  try {
    const user = await getCurrentDbUser(await toWebRequest(req), getBindings())

    return sendJson(res, {
      ok: true,
      userId: user.clerk_user_id,
      dbUserId: user.id,
    })
  } catch (error) {
    return sendError(res, error, 'Failed to authenticate request')
  }
}
