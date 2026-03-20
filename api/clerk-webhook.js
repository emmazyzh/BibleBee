import { verifyWebhook } from '@clerk/backend/webhooks'
import { deleteClerkUser, ensureClerkUsersTable, upsertClerkUser } from '../server/lib/users.js'
import { handleCors, sendError, sendJson, toWebRequest, getBindings } from './_utils.js'

function getPrimaryEmail(data) {
  const emailAddresses = data.email_addresses || []

  return (
    emailAddresses.find((email) => email.id === data.primary_email_address_id)?.email_address ||
    emailAddresses[0]?.email_address ||
    null
  )
}

function toDateOrNull(value) {
  return value ? new Date(value) : null
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (handleCors(req, res)) return

  try {
    const event = await verifyWebhook(await toWebRequest(req, { rawBody: true }))
    const bindings = getBindings()

    await ensureClerkUsersTable(bindings)

    if (event.type === 'user.created' || event.type === 'user.updated') {
      await upsertClerkUser({
        clerkUserId: event.data.id,
        email: getPrimaryEmail(event.data),
        username: event.data.username || getPrimaryEmail(event.data)?.split('@')[0] || event.data.id,
        imageUrl: event.data.profile_image_url || event.data.image_url || null,
        clerkCreatedAt: toDateOrNull(event.data.created_at),
        clerkUpdatedAt: toDateOrNull(event.data.updated_at),
      }, bindings)

      return sendJson(res, { ok: true, type: event.type, clerkUserId: event.data.id })
    }

    if (event.type === 'user.deleted') {
      await deleteClerkUser(event.data.id, bindings)
      return sendJson(res, { ok: true, type: event.type, clerkUserId: event.data.id })
    }

    return sendJson(res, { ok: true, ignored: true, type: event.type })
  } catch (error) {
    return sendError(res, error, 'Webhook processing failed')
  }
}
