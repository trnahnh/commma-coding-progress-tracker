import { Hono } from 'hono'
import { and, eq, gte, ne, sql } from 'drizzle-orm'
import { sessions, users } from '@commma/db'
import { db } from '../db.js'
import { ipKey, rateLimit } from '../middleware/rateLimit.js'
import type { AppEnv } from '../types.js'

export const statsRoutes = new Hono<AppEnv>()

statsRoutes.get(
  '/activity',
  rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: ipKey }),
  async (c) => {
    const DAYS = 60
    const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)

    const dbRows = await db
      .select({
        day: sql<string>`(${sessions.startedAt} AT TIME ZONE 'UTC')::date`,
        totalDurationS: sql<number>`sum(${sessions.durationS})::int`,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(ne(users.privacy, 'off'), gte(sessions.startedAt, since)))
      .groupBy(sql`(${sessions.startedAt} AT TIME ZONE 'UTC')::date`)
      .orderBy(sql`(${sessions.startedAt} AT TIME ZONE 'UTC')::date`)

    const dayMap = new Map<string, number>()
    for (const row of dbRows) {
      dayMap.set(row.day, row.totalDurationS)
    }

    const days: { date: string; duration_s: number }[] = []
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().slice(0, 10)
      days.push({ date: dateStr, duration_s: dayMap.get(dateStr) ?? 0 })
    }

    c.header('Cache-Control', 'public, max-age=3600')
    return c.json({ days })
  },
)
