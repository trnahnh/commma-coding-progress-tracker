import { Hono } from 'hono'
import { and, desc, eq, gte, ne } from 'drizzle-orm'
import { sessions, users } from '@commma/db'
import { db } from '../db.js'
import { topLangBySession } from '../lib/sessionSummary.js'
import { ipKey, rateLimit } from '../middleware/rateLimit.js'
import type { AppEnv } from '../types.js'

export const activityRoutes = new Hono<AppEnv>()

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatLines(n: number): string {
  return new Intl.NumberFormat('en-US').format(n)
}

activityRoutes.get(
  '/stream',
  rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: ipKey }),
  async (c) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const rows = await db
      .select({
        session: sessions,
        handle: users.handle,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(ne(users.privacy, 'off'), gte(sessions.startedAt, since)))
      .orderBy(desc(sessions.startedAt))
      .limit(50)

    const topLang = await topLangBySession(rows.map((r) => r.session.id))

    const entries = rows.flatMap((r) => {
      const lang = topLang.get(r.session.id) ?? null
      if (!lang) return []

      const d = r.session.durationS
      const lines = r.session.linesDelta

      if (d >= 600) {
        return [
          {
            who: r.handle,
            what: `finished a ${formatDuration(d)} session in`,
            em: lang,
            session_id: r.session.id,
            ts: r.session.endedAt.toISOString(),
          },
        ]
      }

      if (lines > 100) {
        return [
          {
            who: r.handle,
            what: `+${formatLines(lines)} lines in`,
            em: lang,
            session_id: r.session.id,
            ts: r.session.endedAt.toISOString(),
          },
        ]
      }

      return []
    })

    c.header('Cache-Control', 'public, max-age=60')
    return c.json({ entries })
  },
)
