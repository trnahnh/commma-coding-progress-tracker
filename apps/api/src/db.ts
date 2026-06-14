import { createDb } from '@commma/db'
import { env } from './env.js'

export const db = createDb(env.DATABASE_URL, { max: env.DB_POOL_MAX })

export async function closeDb(): Promise<void> {
  await db.$client.end()
}
