import { eq } from 'drizzle-orm'
import { users } from '@commma/db'
import { db } from '../db.js'
import { redis } from '../redis.js'
import { log } from '../logger.js'

const PRIVACY_TTL_S = 60

function privacyKey(userId: string): string {
  return `priv:v1:${userId}`
}

export async function getPrivacyMode(userId: string): Promise<string | null> {
  const key = privacyKey(userId)
  try {
    const cached = await redis.get(key)
    if (cached !== null) return cached
  } catch (err) {
    log.error('privacy_cache_read_error', {
      message: err instanceof Error ? err.message : String(err),
    })
  }

  const [owner] = await db
    .select({ privacy: users.privacy })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!owner) return null

  try {
    await redis.set(key, owner.privacy, 'EX', PRIVACY_TTL_S)
  } catch (err) {
    log.error('privacy_cache_write_error', {
      message: err instanceof Error ? err.message : String(err),
    })
  }
  return owner.privacy
}

export async function invalidatePrivacyMode(userId: string): Promise<void> {
  try {
    await redis.del(privacyKey(userId))
  } catch (err) {
    log.error('privacy_cache_invalidate_error', {
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
