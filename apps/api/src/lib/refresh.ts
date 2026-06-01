import { createHmac, randomBytes } from 'node:crypto'
import { and, eq, gt, lt } from 'drizzle-orm'
import { refreshTokens } from '@commma/db'
import { db } from '../db.js'
import { env } from '../env.js'

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000

function hashToken(raw: string): string {
  return createHmac('sha256', env.REFRESH_TOKEN_SECRET)
    .update(raw)
    .digest('hex')
}

export async function mintRefreshToken(userId: string): Promise<string> {
  const raw = randomBytes(32).toString('base64url')
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  })
  return raw
}

export async function rotateRefreshToken(
  raw: string,
): Promise<{ userId: string; raw: string } | null> {
  const hash = hashToken(raw)
  const rows = await db
    .select({ id: refreshTokens.id, userId: refreshTokens.userId })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, hash),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1)
  const row = rows[0]
  if (!row) return null
  await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id))
  const next = await mintRefreshToken(row.userId)
  return { userId: row.userId, raw: next }
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(raw)))
}

export async function deleteExpiredRefreshTokens(
  now = new Date(),
): Promise<number> {
  const deleted = await db
    .delete(refreshTokens)
    .where(lt(refreshTokens.expiresAt, now))
    .returning({ id: refreshTokens.id })
  return deleted.length
}
