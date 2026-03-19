import { verifyWebhook } from '@clerk/backend/webhooks'
import { deleteClerkUser, ensureClerkUsersTable, upsertClerkUser } from '../lib/users.js'
import { jsonError } from '../lib/http.js'

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

export function registerClerkWebhookRoute(app) {
  app.post('/api/clerk-webhook', async (c) => {
    try {
      const event = await verifyWebhook(c.req.raw)

      await ensureClerkUsersTable(c.env)

      if (event.type === 'user.created' || event.type === 'user.updated') {
        await upsertClerkUser({
          clerkUserId: event.data.id,
          email: getPrimaryEmail(event.data),
          username: event.data.username || getPrimaryEmail(event.data)?.split('@')[0] || event.data.id,
          imageUrl: event.data.profile_image_url || event.data.image_url || null,
          clerkCreatedAt: toDateOrNull(event.data.created_at),
          clerkUpdatedAt: toDateOrNull(event.data.updated_at),
        }, c.env)

        return c.json({ ok: true, type: event.type, clerkUserId: event.data.id })
      }

      if (event.type === 'user.deleted') {
        await deleteClerkUser(event.data.id, c.env)
        return c.json({ ok: true, type: event.type, clerkUserId: event.data.id })
      }

      return c.json({ ok: true, ignored: true, type: event.type })
    } catch (error) {
      return jsonError(c, error, 'Webhook processing failed')
    }
  })
}
