import { verifyWebhook } from '@clerk/backend/webhooks'
import { deleteClerkUser, ensureClerkUsersTable, upsertClerkUser } from '../lib/users.js'

async function readRawBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks).toString('utf8')
}

function getPrimaryEmail(data) {
  const emailAddresses = data.email_addresses || []

  return (
    emailAddresses.find(email => email.id === data.primary_email_address_id)?.email_address ||
    emailAddresses[0]?.email_address ||
    null
  )
}

function toDateOrNull(value) {
  return value ? new Date(value) : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const rawBody = await readRawBody(req)
    const request = new Request(`https://${req.headers.host || 'localhost'}/api/clerk-webhook`, {
      method: 'POST',
      headers: new Headers(req.headers),
      body: rawBody,
    })

    const event = await verifyWebhook(request)

    await ensureClerkUsersTable()

    if (event.type === 'user.created' || event.type === 'user.updated') {
      await upsertClerkUser({
        clerkUserId: event.data.id,
        email: getPrimaryEmail(event.data),
        username: event.data.username || getPrimaryEmail(event.data)?.split('@')[0] || event.data.id,
        imageUrl: event.data.profile_image_url || event.data.image_url || null,
        clerkCreatedAt: toDateOrNull(event.data.created_at),
        clerkUpdatedAt: toDateOrNull(event.data.updated_at),
      })

      return res.status(200).json({ ok: true, type: event.type, clerkUserId: event.data.id })
    }

    if (event.type === 'user.deleted') {
      await deleteClerkUser(event.data.id)
      return res.status(200).json({ ok: true, type: event.type, clerkUserId: event.data.id })
    }

    return res.status(200).json({ ok: true, ignored: true, type: event.type })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error.message || 'Webhook processing failed',
    })
  }
}
