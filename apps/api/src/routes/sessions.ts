import { Hono } from 'hono'
import { and, desc, eq, inArray, lt, or } from 'drizzle-orm'
import { sessionFiles, sessionLangs, sessions, users } from '@commma/db'
import { db } from '../db.js'
import { apiError } from '../lib/errors.js'
import { verifyAccessToken } from '../lib/jwt.js'
import { requireAuth } from '../middleware/auth.js'
import { ipKey, rateLimit, userKey } from '../middleware/rateLimit.js'
import type { AppEnv } from '../types.js'

export const sessionRoutes = new Hono<AppEnv>()

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Cursor {
  startedAt: string
  id: string
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.startedAt}|${cursor.id}`).toString('base64url')
}

function decodeCursor(raw: string): Cursor | null {
  const decoded = Buffer.from(raw, 'base64url').toString('utf8')
  const sep = decoded.lastIndexOf('|')
  if (sep === -1) return null
  return { startedAt: decoded.slice(0, sep), id: decoded.slice(sep + 1) }
}

sessionRoutes.get(
  '/',
  requireAuth,
  rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: userKey }),
  async (c) => {
    const userId = c.get('userId')

    const limitRaw = Number(c.req.query('limit') ?? '20')
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100)
      : 20

    const conditions = [eq(sessions.userId, userId)]
    const cursorRaw = c.req.query('cursor')
    if (cursorRaw) {
      const cursor = decodeCursor(cursorRaw)
      if (!cursor) return apiError(c, 'VALIDATION_ERROR', 'Invalid cursor')
      const cursorDate = new Date(cursor.startedAt)
      const keyset = or(
        lt(sessions.startedAt, cursorDate),
        and(eq(sessions.startedAt, cursorDate), lt(sessions.id, cursor.id)),
      )
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

    const bestLang = new Map<string, { lang: string; pct: number }>()
    if (page.length > 0) {
      const langRows = await db
        .select()
        .from(sessionLangs)
        .where(
          inArray(
            sessionLangs.sessionId,
            page.map((s) => s.id),
          ),
        )
      for (const lr of langRows) {
        const pct = Number(lr.pct)
        const current = bestLang.get(lr.sessionId)
        if (!current || pct > current.pct) {
          bestLang.set(lr.sessionId, { lang: lr.lang, pct })
        }
      }
    }

    const last = page[page.length - 1]
    const nextCursor =
      hasMore && last
        ? encodeCursor({ startedAt: last.startedAt.toISOString(), id: last.id })
        : null

    return c.json({
      sessions: page.map((s) => ({
        id: s.id,
        started_at: s.startedAt,
        ended_at: s.endedAt,
        duration_s: s.durationS,
        lines_delta: s.linesDelta,
        pace_cpm: s.paceCpm,
        top_lang: bestLang.get(s.id)?.lang ?? null,
      })),
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
