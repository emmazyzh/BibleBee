import { authenticateApiRequest } from './clerk-server.js'
import { getSql } from './neon.js'
import { ApiError } from './api.js'

export async function getCurrentDbUser(req) {
  const auth = await authenticateApiRequest(req)

  if (!auth.isAuthenticated || !auth.userId) {
    throw new ApiError(401, 'Unauthorized')
  }

  const sql = getSql()
  const [user] = await sql`
    SELECT id, clerk_user_id, email, username, image_url
    FROM users
    WHERE clerk_user_id = ${auth.userId}
    LIMIT 1
  `

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  return user
}
