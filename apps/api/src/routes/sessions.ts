import { Hono } from 'hono'
import { and, desc, eq } from 'drizzle-orm'
import { sessionFiles, sessionLangs, sessions, users } from '@commma/db'
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

export const sessionRoutes = new Hono<AppEnv>()

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

sessionRoutes.get(
  '/',
  requireAuth,
  rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: userKey }),
  async (c) => {
    const userId = c.get('userId')
    const limit = parseLimit(c.req.query('limit'), 20, 100)

    const conditions = [eq(sessions.userId, userId)]
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

sessionRoutes.get(
  '/:id',
  rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: ipKey }),
  async (c) => {
    const id = c.req.param('id')
    if (!UUID_RE.test(id)) return apiError(c, 'NOT_FOUND', 'Session not found')

    const header = c.req.header('Authorization')
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null
    const requesterId = token ? await verifyAccessToken(token) : null

    const rows = await db
      .select()
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.id, id))
      .limit(1)

    const row = rows[0]
    if (!row) return apiError(c, 'NOT_FOUND', 'Session not found')

    const { sessions: session, users: owner } = row
    const isOwner = requesterId === session.userId
    if (owner.privacy === 'off' && !isOwner) {
      return apiError(c, 'NOT_FOUND', 'Session not found')
    }

    const [langRows, fileRows] = await Promise.all([
      db
        .select()
        .from(sessionLangs)
        .where(eq(sessionLangs.sessionId, id))
        .orderBy(desc(sessionLangs.pct)),
      db
        .select()
        .from(sessionFiles)
        .where(eq(sessionFiles.sessionId, id))
        .orderBy(desc(sessionFiles.changes))
        .limit(100),
    ])

    return c.json({
      id: session.id,
      started_at: session.startedAt,
      ended_at: session.endedAt,
      duration_s: session.durationS,
      lines_delta: session.linesDelta,
      pace_cpm: session.paceCpm,
      peak_cpm: session.peakCpm,
      peak_at: session.peakAt,
      langs: langRows.map((l) => ({
        lang: l.lang,
        duration_s: l.durationS,
        pct: Number(l.pct),
      })),
      files: fileRows.map((f) => ({ path: f.path, changes: f.changes })),
      keyboard_heatmap: session.keyboardHeatmap ?? null,
    })
  },
)
