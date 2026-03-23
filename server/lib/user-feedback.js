import { getSql } from './db.js'

export async function ensureUserFeedbackTable(bindings) {
  const sql = getSql(bindings)

  await sql`
    CREATE TABLE IF NOT EXISTS user_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      reply TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_feedback_status_check
        CHECK (status IN ('pending', 'reviewing', 'resolved', 'closed'))
    )
  `

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_feedback_user_id_fkey'
      ) THEN
        ALTER TABLE user_feedback
        ADD CONSTRAINT user_feedback_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE;
      END IF;
    END
    $$;
  `

  await sql`CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status)`
  await sql`CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC)`
}
