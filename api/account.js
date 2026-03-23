import { getClerkClient, authenticateRequest } from '../server/lib/auth.js'
import { getSql } from '../server/lib/db.js'
import { getCurrentDbUser } from '../server/lib/current-user.js'
import { ApiError } from '../server/lib/http.js'
import { handleCors, sendError, sendJson, toWebRequest, getBindings } from '../server/lib/api-utils.js'

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  try {
    if ((req.method || 'GET').toUpperCase() !== 'DELETE') {
      throw new ApiError(405, 'Method not allowed')
    }

    const bindings = getBindings()
    const request = await toWebRequest(req)
    const auth = await authenticateRequest(request, bindings)

    if (!auth.isAuthenticated || !auth.userId) {
      throw new ApiError(401, 'Unauthorized')
    }

    const user = await getCurrentDbUser(request, bindings)
    const sql = getSql(bindings)
    const clerkClient = getClerkClient(bindings)

    await clerkClient.users.deleteUser(auth.userId)

    await sql`DELETE FROM user_verse WHERE user_id = ${user.id}`
    await sql`DELETE FROM user_plan WHERE user_id = ${user.id}`
    await sql`DELETE FROM users WHERE id = ${user.id}`

    return sendJson(res, {
      ok: true,
      deletedUserId: user.id,
      deletedClerkUserId: auth.userId,
    })
  } catch (error) {
    return sendError(res, error, 'Failed to delete account')
  }
}
