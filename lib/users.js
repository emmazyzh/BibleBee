import { getSql } from './neon.js'

export async function ensureClerkUsersTable() {
  const sql = getSql()

  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
      clerk_user_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      username TEXT NOT NULL,
      image_url TEXT,
      clerk_created_at TIMESTAMPTZ,
      clerk_updated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS id TEXT DEFAULT (gen_random_uuid())::text
  `

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS clerk_user_id TEXT
  `

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email TEXT
  `

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username TEXT
  `

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS image_url TEXT
  `

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS clerk_created_at TIMESTAMPTZ
  `

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS clerk_updated_at TIMESTAMPTZ
  `

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `

  await sql`
    ALTER TABLE users
    ALTER COLUMN clerk_user_id SET NOT NULL
  `

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_clerk_user_id_key'
      ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_clerk_user_id_key UNIQUE (clerk_user_id);
      END IF;
    END
    $$;
  `
}

export async function upsertClerkUser(user) {
  const sql = getSql()

  await sql`
    INSERT INTO users (
      clerk_user_id,
      email,
      username,
      image_url,
      clerk_created_at,
      clerk_updated_at
    )
    VALUES (
      ${user.clerkUserId},
      ${user.email},
      ${user.username},
      ${user.imageUrl},
      ${user.clerkCreatedAt},
      ${user.clerkUpdatedAt}
    )
    ON CONFLICT (clerk_user_id) DO UPDATE SET
      email = EXCLUDED.email,
      username = EXCLUDED.username,
      image_url = EXCLUDED.image_url,
      clerk_created_at = COALESCE(users.clerk_created_at, EXCLUDED.clerk_created_at),
      clerk_updated_at = EXCLUDED.clerk_updated_at,
      updated_at = NOW()
  `
}

export async function deleteClerkUser(clerkUserId) {
  const sql = getSql()

  await sql`
    DELETE FROM users
    WHERE clerk_user_id = ${clerkUserId}
  `
}
