import { authenticateApiRequest, getClerkClient } from './clerk-server.js'
import { getSql } from './neon.js'
import { ApiError } from './api.js'
import { ensureClerkUsersTable, upsertClerkUser } from './users.js'

export async function getCurrentDbUser(req) {
  const auth = await authenticateApiRequest(req)

  if (!auth.isAuthenticated || !auth.userId) {
    throw new ApiError(401, 'Unauthorized')
  }

  const sql = getSql()
  let [user] = await sql`
    SELECT id, clerk_user_id, email, username, image_url
    FROM users
    WHERE clerk_user_id = ${auth.userId}
    LIMIT 1
  `

  if (!user) {
    const clerkClient = getClerkClient()
    const clerkUser = await clerkClient.users.getUser(auth.userId)
    const primaryEmail =
      clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress ||
      ''

    await ensureClerkUsersTable()
    await upsertClerkUser({
      clerkUserId: clerkUser.id,
      email: primaryEmail,
      username: clerkUser.username || primaryEmail.split('@')[0] || clerkUser.id,
      imageUrl: clerkUser.imageUrl || null,
      clerkCreatedAt: clerkUser.createdAt || null,
      clerkUpdatedAt: clerkUser.updatedAt || null,
    })

    ;[user] = await sql`
      SELECT id, clerk_user_id, email, username, image_url
      FROM users
      WHERE clerk_user_id = ${auth.userId}
      LIMIT 1
    `
  }

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  return user
}
