import { neon } from '@neondatabase/serverless'
import { readEnv } from './env.js'

export function getSql(bindings) {
  const databaseUrl =
    readEnv('BIBLEBEE_DATABASE_URL', bindings) ||
    readEnv('BIBLEBEE_POSTGRES_URL', bindings) ||
    readEnv('DATABASE_URL', bindings)

  if (!databaseUrl) {
    throw new Error('Database connection string is not set')
  }

  return neon(databaseUrl)
}
