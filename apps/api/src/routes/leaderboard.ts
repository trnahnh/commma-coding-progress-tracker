import { Hono } from 'hono'
import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { sessionLangs, sessions, streaks, users } from '@commma/db'
import { db } from '../db.js'
import { ipKey, rateLimit } from '../middleware/rateLimit.js'
import {
  type LeaderboardPeriod,
  periodWindow,
  topLeaderboard,
} from '../aggregate/leaderboard.js'
import type { AppEnv } from '../types.js'

export const leaderboardRoutes = new Hono<AppEnv>()

function parsePeriod(raw: string | undefined): LeaderboardPeriod {
  if (raw === 'month' || raw === 'alltime') return raw
  return 'week'
}

interface LeaderboardRow {
  rank: number
  handle: string
  avatar_url: string | null
  duration_s: number
  top_lang: string | null
  streak_days: number
}

leaderboardRoutes.get(
  '/',
  rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: ipKey }),
  async (c) => {
    const period = parsePeriod(c.req.query('period'))
    const now = new Date()
    const ranked = await topLeaderboard(period, now, 100)

    if (ranked.length === 0) {
      return c.json({ period, updated_at: now.toISOString(), entries: [] })
    }

    const userIds = ranked.map((r) => r.userId)
    const window = periodWindow(period, now)
    const langConditions = [inArray(sessions.userId, userIds)]
    if (window) {
      langConditions.push(gte(sessions.startedAt, window.start))
      langConditions.push(lt(sessions.startedAt, window.end))
    }

    const [userRows, streakRows, langRows] = await Promise.all([
      db
        .select({
          id: users.id,
          handle: users.handle,
          avatarUrl: users.avatarUrl,
          privacy: users.privacy,
        })
        .from(users)
        .where(inArray(users.id, userIds)),
      db
        .select({ userId: streaks.userId, currentDays: streaks.currentDays })
        .from(streaks)
        .where(inArray(streaks.userId, userIds)),
      db
        .select({
          userId: sessions.userId,
          lang: sessionLangs.lang,
          total: sql<number>`sum(${sessionLangs.durationS})::int`,
        })
        .from(sessionLangs)
        .innerJoin(sessions, eq(sessions.id, sessionLangs.sessionId))
        .where(and(...langConditions))
        .groupBy(sessions.userId, sessionLangs.lang),
    ])

    const userById = new Map(userRows.map((u) => [u.id, u]))
    const streakByUser = new Map(
      streakRows.map((s) => [s.userId, s.currentDays]),
    )
    const topLangByUser = new Map<string, { lang: string; total: number }>()
    for (const row of langRows) {
      const current = topLangByUser.get(row.userId)
      if (!current || row.total > current.total) {
        topLangByUser.set(row.userId, { lang: row.lang, total: row.total })
      }
    }

    const entries: LeaderboardRow[] = []
    let rank = 0
    for (const r of ranked) {
      const user = userById.get(r.userId)
      if (!user || user.privacy === 'off') continue
      rank += 1
      entries.push({
        rank,
        handle: user.handle,
        avatar_url: user.avatarUrl,
        duration_s: r.durationS,
        top_lang: topLangByUser.get(r.userId)?.lang ?? null,
        streak_days: streakByUser.get(r.userId) ?? 0,
      })
    }

    return c.json({ period, updated_at: now.toISOString(), entries })
  },
)
