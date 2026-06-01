import { Hono } from 'hono'
import { and, desc, eq, ne } from 'drizzle-orm'
import { follows, sessions, users } from '@commma/db'
import { db } from '../db.js'
import { apiError } from '../lib/errors.js'
import {
  decodeCursor,
  encodeCursor,
  parseLimit,
  sessionKeyset,
} from '../lib/cursor.js'
import { toSessionSummary, topLangBySession } from '../lib/sessionSummary.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit, userKey } from '../middleware/rateLimit.js'
import type { AppEnv } from '../types.js'

export const feedRoutes = new Hono<AppEnv>()

feedRoutes.get(
  '/',
  requireAuth,
  rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: userKey }),
  async (c) => {
    const userId = c.get('userId')
    const limit = parseLimit(c.req.query('limit'), 20, 50)

    const conditions = [
      eq(follows.followerId, userId),
      ne(users.privacy, 'off'),
    ]
    const cursorRaw = c.req.query('cursor')
    if (cursorRaw) {
      const cursor = decodeCursor(cursorRaw)
      if (!cursor) return apiError(c, 'VALIDATION_ERROR', 'Invalid cursor')
      const keyset = sessionKeyset(cursor)
      if (keyset) conditions.push(keyset)
    }

    const rows = await db
      .select({
        session: sessions,
        handle: users.handle,
        avatarUrl: users.avatarUrl,
      })
      .from(sessions)
      .innerJoin(follows, eq(follows.followeeId, sessions.userId))
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(...conditions))
      .orderBy(desc(sessions.startedAt), desc(sessions.id))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const topLang = await topLangBySession(page.map((r) => r.session.id))

    const last = page[page.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({
            startedAt: last.session.startedAt.toISOString(),
            id: last.session.id,
          })
        : null

    return c.json({
      entries: page.map((r) => ({
        session: toSessionSummary(r.session, topLang.get(r.session.id) ?? null),
        user: { handle: r.handle, avatar_url: r.avatarUrl },
      })),
      next_cursor: nextCursor,
    })
  },
)
