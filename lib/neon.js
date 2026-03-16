import { neon } from '@neondatabase/serverless'

export function getSql() {
  const databaseUrl =
    process.env.BIBLEBEE_DATABASE_URL ||
    process.env.BIBLEBEE_POSTGRES_URL ||
    process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('Database connection string is not set')
  }

  return neon(databaseUrl)
}
