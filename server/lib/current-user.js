import { authenticateRequest, getClerkClient } from './auth.js'
import { getSql } from './db.js'
import { ApiError } from './http.js'
import { ensureClerkUsersTable, upsertClerkUser } from './users.js'

export async function getCurrentDbUser(request, bindings) {
  const auth = await authenticateRequest(request, bindings)

  if (!auth.isAuthenticated || !auth.userId) {
    throw new ApiError(401, 'Unauthorized')
  }

  const sql = getSql(bindings)
  let [user] = await sql`
    SELECT id, clerk_user_id, email, username, image_url, ch_version, en_version
    FROM users
    WHERE clerk_user_id = ${auth.userId}
    LIMIT 1
  `

  if (!user) {
    const clerkClient = getClerkClient(bindings)
    const clerkUser = await clerkClient.users.getUser(auth.userId)
    const primaryEmail =
      clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress ||
      ''

    await ensureClerkUsersTable(bindings)
    await upsertClerkUser({
      clerkUserId: clerkUser.id,
      email: primaryEmail,
      username: clerkUser.username || primaryEmail.split('@')[0] || clerkUser.id,
      imageUrl: clerkUser.imageUrl || null,
      clerkCreatedAt: clerkUser.createdAt || null,
      clerkUpdatedAt: clerkUser.updatedAt || null,
    }, bindings)

    ;[user] = await sql`
      SELECT id, clerk_user_id, email, username, image_url, ch_version, en_version
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
