import { Hono } from 'hono'
import { and, desc, eq, sql } from 'drizzle-orm'
import { follows, sessionLangs, sessions, streaks, users } from '@commma/db'
import { db } from '../db.js'
import { apiError } from '../lib/errors.js'
import { verifyAccessToken } from '../lib/jwt.js'
import {
  decodeCursor,
  encodeCursor,
  parseLimit,
  sessionKeyset,
} from '../lib/cursor.js'
import { toSessionSummary, topLangBySession } from '../lib/sessionSummary.js'
import { requireAuth } from '../middleware/auth.js'
import { ipKey, rateLimit, userKey } from '../middleware/rateLimit.js'
import type { AppEnv } from '../types.js'

export const userRoutes = new Hono<AppEnv>()

async function requesterFrom(authorization: string | undefined) {
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : null
  return token ? await verifyAccessToken(token) : null
}

const HANDLE_RE = /^[a-zA-Z0-9-]{1,39}$/

async function findUser(handle: string) {
  if (!HANDLE_RE.test(handle)) return null
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1)
  return rows[0] ?? null
}

userRoutes.get(
  '/:handle',
  rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: ipKey }),
  async (c) => {
    const user = await findUser(c.req.param('handle'))
    if (!user) return apiError(c, 'NOT_FOUND', 'User not found')

    const requesterId = await requesterFrom(c.req.header('Authorization'))
    if (user.privacy === 'off' && requesterId !== user.id) {
      return apiError(c, 'NOT_FOUND', 'User not found')
    }

    const [streakRow, statRows, langRows] = await Promise.all([
      db.select().from(streaks).where(eq(streaks.userId, user.id)).limit(1),
      db
        .select({
          totalSessions: sql<number>`count(*)::int`,
          totalDurationS: sql<number>`coalesce(sum(${sessions.durationS}), 0)::int`,
        })
        .from(sessions)
        .where(eq(sessions.userId, user.id)),
      db
        .select({
          lang: sessionLangs.lang,
          total: sql<number>`sum(${sessionLangs.durationS})::int`,
        })
        .from(sessionLangs)
        .innerJoin(sessions, eq(sessions.id, sessionLangs.sessionId))
        .where(eq(sessions.userId, user.id))
        .groupBy(sessionLangs.lang)
        .orderBy(desc(sql`sum(${sessionLangs.durationS})`))
        .limit(1),
    ])

    const streak = streakRow[0]
    const stat = statRows[0]
    return c.json({
      handle: user.handle,
      avatar_url: user.avatarUrl,
      display_name: user.displayName,
      bio: user.bio,
      website: user.website,
      location: user.location,
      created_at: user.createdAt,
      streak: {
        current_days: streak?.currentDays ?? 0,
        longest_days: streak?.longestDays ?? 0,
      },
      stats: {
        total_sessions: stat?.totalSessions ?? 0,
        total_duration_s: stat?.totalDurationS ?? 0,
        top_lang: langRows[0]?.lang ?? null,
      },
      badges: [],
    })
  },
)

userRoutes.get(
  '/:handle/sessions',
  rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: ipKey }),
  async (c) => {
    const user = await findUser(c.req.param('handle'))
    if (!user) return apiError(c, 'NOT_FOUND', 'User not found')

    const requesterId = await requesterFrom(c.req.header('Authorization'))
    if (user.privacy === 'off' && requesterId !== user.id) {
      return apiError(c, 'NOT_FOUND', 'User not found')
    }

    const limit = parseLimit(c.req.query('limit'), 20, 100)
    const conditions = [eq(sessions.userId, user.id)]
    const cursorRaw = c.req.query('cursor')
    if (cursorRaw) {
      const cursor = decodeCursor(cursorRaw)
      if (!cursor) return apiError(c, 'VALIDATION_ERROR', 'Invalid cursor')
      const keyset = sessionKeyset(cursor)
      if (keyset) conditions.push(keyset)
    }

    const rows = await db
      .select()
      .from(sessions)
      .where(and(...conditions))
      .orderBy(desc(sessions.startedAt), desc(sessions.id))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const topLang = await topLangBySession(page.map((s) => s.id))

    const last = page[page.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ startedAt: last.startedAt.toISOString(), id: last.id })
        : null

    return c.json({
      sessions: page.map((s) => toSessionSummary(s, topLang.get(s.id) ?? null)),
      next_cursor: nextCursor,
    })
  },
)

userRoutes.post(
  '/:handle/follow',
  requireAuth,
  rateLimit({ scope: 'write', limit: 300, windowS: 3600, key: userKey }),
  async (c) => {
    const followerId = c.get('userId')
    const target = await findUser(c.req.param('handle'))
    if (!target) return apiError(c, 'NOT_FOUND', 'User not found')
    if (target.id === followerId) {
      return apiError(c, 'VALIDATION_ERROR', 'Cannot follow yourself')
    }
    if (target.privacy === 'off') {
      return apiError(c, 'NOT_FOUND', 'User not found')
    }

    await db
      .insert(follows)
      .values({ followerId, followeeId: target.id })
      .onConflictDoNothing()

    return c.body(null, 204)
  },
)

userRoutes.delete(
  '/:handle/follow',
  requireAuth,
  rateLimit({ scope: 'write', limit: 300, windowS: 3600, key: userKey }),
  async (c) => {
    const followerId = c.get('userId')
    const target = await findUser(c.req.param('handle'))
    if (!target) return apiError(c, 'NOT_FOUND', 'User not found')

    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followeeId, target.id),
        ),
      )

    return c.body(null, 204)
  },
)
