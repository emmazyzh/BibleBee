import { authenticateRequest, getClerkClient } from './auth.js'
import { getSql } from './db.js'
import { ApiError } from './http.js'
import { ensureClerkUsersTable, upsertClerkUser } from './users.js'

function getPrimaryEmail(clerkUser) {
  return (
    clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress ||
    ''
  )
}

function getDisplayName(clerkUser, primaryEmail) {
  return clerkUser.firstName || primaryEmail.split('@')[0] || clerkUser.id
}

function toDateOrNull(value) {
  return value ? new Date(value) : null
}

export async function getCurrentDbUser(request, bindings) {
  const auth = await authenticateRequest(request, bindings)

  if (!auth.isAuthenticated || !auth.userId) {
    throw new ApiError(401, 'Unauthorized')
  }

  const sql = getSql(bindings)
  const clerkClient = getClerkClient(bindings)
  let [user] = await sql`
    SELECT id, clerk_user_id, email, username, image_url, ch_version, en_version
    FROM users
    WHERE clerk_user_id = ${auth.userId}
    LIMIT 1
  `

  if (!user) {
    const clerkUser = await clerkClient.users.getUser(auth.userId)
    const primaryEmail = getPrimaryEmail(clerkUser)

    await ensureClerkUsersTable(bindings)
    await upsertClerkUser({
      clerkUserId: clerkUser.id,
      email: primaryEmail,
      username: getDisplayName(clerkUser, primaryEmail),
      imageUrl: clerkUser.imageUrl || null,
      clerkCreatedAt: toDateOrNull(clerkUser.createdAt),
      clerkUpdatedAt: toDateOrNull(clerkUser.updatedAt),
    }, bindings)

    ;[user] = await sql`
      SELECT id, clerk_user_id, email, username, image_url, ch_version, en_version
      FROM users
      WHERE clerk_user_id = ${auth.userId}
      LIMIT 1
    `
  }

  if (user) {
    const emailPrefix = (user.email || '').split('@')[0] || ''
    const shouldReconcileProfile =
      !user.username ||
      user.username === emailPrefix ||
      !user.image_url

    if (shouldReconcileProfile) {
      const clerkUser = await clerkClient.users.getUser(auth.userId)
      const primaryEmail = getPrimaryEmail(clerkUser)
      const nextUsername = getDisplayName(clerkUser, primaryEmail)
      const nextImageUrl = clerkUser.imageUrl || null
      const emailChanged = primaryEmail && primaryEmail !== (user.email || '')
      const usernameChanged = nextUsername && nextUsername !== (user.username || '')
      const imageChanged = nextImageUrl !== (user.image_url || null)

      if (emailChanged || usernameChanged || imageChanged) {
        await upsertClerkUser({
          clerkUserId: clerkUser.id,
          email: primaryEmail,
          username: nextUsername,
          imageUrl: nextImageUrl,
          clerkCreatedAt: toDateOrNull(clerkUser.createdAt),
          clerkUpdatedAt: toDateOrNull(clerkUser.updatedAt),
        }, bindings)

        ;[user] = await sql`
          SELECT id, clerk_user_id, email, username, image_url, ch_version, en_version
          FROM users
          WHERE clerk_user_id = ${auth.userId}
          LIMIT 1
        `
      }
    }
  }

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  return user
}

export async function getOptionalCurrentDbUser(request, bindings) {
  const auth = await authenticateRequest(request, bindings)

  if (!auth.isAuthenticated || !auth.userId) {
    return null
  }

  return getCurrentDbUser(request, bindings)
}
