import { randomUUID } from 'node:crypto'

const testDbUrl = process.env.TEST_DATABASE_URL

export const hasDb = Boolean(testDbUrl)

if (hasDb && testDbUrl) {
  process.env.DATABASE_URL = testDbUrl
  process.env.REDIS_URL =
    process.env.TEST_REDIS_URL ??
    process.env.REDIS_URL ??
    'redis://localhost:6379'
  process.env.GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? 'test-client'
  process.env.GITHUB_CLIENT_SECRET =
    process.env.GITHUB_CLIENT_SECRET ?? 'test-secret'
  process.env.GITHUB_CALLBACK_URL =
    process.env.GITHUB_CALLBACK_URL ??
    'http://localhost:3000/v1/auth/github/callback'
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret'
  process.env.REFRESH_TOKEN_SECRET =
    process.env.REFRESH_TOKEN_SECRET ?? 'test-refresh-secret'
  process.env.WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:5173'
  process.env.RUN_AGGREGATION = 'false'
}

export const connEnv = {
  incoming: {
    socket: {
      remoteAddress: '127.0.0.1',
      remotePort: 40000,
      remoteFamily: 'IPv4',
    },
  },
}

const createdUserIds = new Set<string>()

export async function loadApp() {
  const { createApp } = await import('../../src/app.js')
  return createApp()
}

export async function mintToken(userId: string): Promise<string> {
  const { signAccessToken } = await import('../../src/lib/jwt.js')
  return signAccessToken(userId)
}

export async function getDb() {
  const { db } = await import('../../src/db.js')
  return db
}

export interface SeedUserOptions {
  privacy?: 'full' | 'summary' | 'off'
}

export async function seedUser(options: SeedUserOptions = {}) {
  const db = await getDb()
  const { users } = await import('@commma/db')
  const suffix = randomUUID().slice(0, 8)
  const [user] = await db
    .insert(users)
    .values({
      handle: `it-${suffix}`,
      email: `it-${suffix}@example.test`,
      githubId: `gh-${suffix}`,
      privacy: options.privacy ?? 'full',
    })
    .returning({ id: users.id, handle: users.handle })
  createdUserIds.add(user.id)
  return user
}

export interface SeedSessionOptions {
  withHeatmap?: boolean
}

export async function seedSession(
  userId: string,
  options: SeedSessionOptions = {},
) {
  const db = await getDb()
  const { sessions, sessionLangs, sessionFiles } = await import('@commma/db')
  const startedAt = new Date('2026-05-30T10:00:00.000Z')
  const endedAt = new Date('2026-05-30T10:30:00.000Z')
  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      startedAt,
      endedAt,
      durationS: 1800,
      linesDelta: 120,
      paceCpm: 240,
      keyboardHeatmap: options.withHeatmap
        ? { counts: { a: 10, s: 6 }, freq: { a: 1, s: 0.6 }, total: 16 }
        : null,
    })
    .returning({ id: sessions.id })
  await db
    .insert(sessionLangs)
    .values({
      sessionId: session.id,
      lang: 'typescript',
      durationS: 1800,
      pct: '100.00',
    })
  await db
    .insert(sessionFiles)
    .values({ sessionId: session.id, path: 'src/index.ts', changes: 42 })
  return session
}

export async function cleanup() {
  if (createdUserIds.size === 0) return
  const db = await getDb()
  const { inArray } = await import('drizzle-orm')
  const {
    users,
    events,
    sessions,
    sessionLangs,
    sessionFiles,
    streaks,
    refreshTokens,
    follows,
  } = await import('@commma/db')
  const ids = [...createdUserIds]
  const sessionRows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(inArray(sessions.userId, ids))
  const sessionIds = sessionRows.map((s) => s.id)
  if (sessionIds.length > 0) {
    await db
      .delete(sessionFiles)
      .where(inArray(sessionFiles.sessionId, sessionIds))
    await db
      .delete(sessionLangs)
      .where(inArray(sessionLangs.sessionId, sessionIds))
  }
  await db.delete(sessions).where(inArray(sessions.userId, ids))
  await db.delete(events).where(inArray(events.userId, ids))
  await db.delete(refreshTokens).where(inArray(refreshTokens.userId, ids))
  await db.delete(streaks).where(inArray(streaks.userId, ids))
  await db.delete(follows).where(inArray(follows.followerId, ids))
  await db.delete(follows).where(inArray(follows.followeeId, ids))
  await db.delete(users).where(inArray(users.id, ids))
  createdUserIds.clear()
}

export async function closeClients() {
  const { redis } = await import('../../src/redis.js')
  const { db } = await import('../../src/db.js')
  await redis.quit()
  await db.$client.end({ timeout: 5 })
}
