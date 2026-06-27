import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { heartbeatBatchSchema } from '@commma/shared'
import { events, users, type KeyFreq } from '@commma/db'
import { db } from '../db.js'
import { log } from '../logger.js'
import { apiError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit, userKey } from '../middleware/rateLimit.js'
import type { AppEnv } from '../types.js'

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000
const MAX_EVENT_AGE_MS = 30 * 24 * 60 * 60 * 1000

export const ingestRoutes = new Hono<AppEnv>()

ingestRoutes.post(
  '/',
  requireAuth,
  rateLimit({
    scope: 'ingest',
    limit: 1000,
    windowS: 3600,
    key: userKey,
    failClosed: true,
  }),
  zValidator('json', heartbeatBatchSchema, (result, c) => {
    if (!result.success) {
      return apiError(
        c,
        'VALIDATION_ERROR',
        'Invalid heartbeat batch',
        result.error.issues,
      )
    }
  }),
  async (c) => {
    const userId = c.get('userId')
    const { events: batch } = c.req.valid('json')
    const received = batch.length

    const now = Date.now()
    const oldest = now - MAX_EVENT_AGE_MS
    const newest = now + MAX_FUTURE_SKEW_MS
    if (batch.some((e) => e.ts < oldest || e.ts > newest)) {
      return apiError(
        c,
        'VALIDATION_ERROR',
        'Event timestamp outside the acceptable window',
      )
    }

    const selectStart = performance.now()
    const [owner] = await db
      .select({ privacy: users.privacy })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    const selectMs = performance.now() - selectStart

    if (!owner) return apiError(c, 'UNAUTHORIZED', 'Unknown user')
    if (owner.privacy === 'off') return c.json({ received, duplicate: 0 }, 202)

    const summary = owner.privacy === 'summary'
    const rows = batch.map((e) => ({
      id: e.id,
      userId,
      ts: new Date(e.ts),
      lang: e.lang ?? null,
      file: summary ? null : (e.file ?? null),
      project: e.project ?? null,
      keystrokes: e.keystrokes,
      lines: e.lines,
      keyFreq: summary ? null : e.key_freq ? (e.key_freq as KeyFreq) : null,
    }))

    const insertStart = performance.now()
    const inserted = await db
      .insert(events)
      .values(rows)
      .onConflictDoNothing({ target: [events.id, events.ts] })
      .returning({ id: events.id })
    const insertMs = performance.now() - insertStart

    log.info('ingest_db', {
      n: received,
      selectMs: Math.round(selectMs),
      insertMs: Math.round(insertMs),
    })

    return c.json({ received, duplicate: received - inserted.length }, 202)
  },
)
