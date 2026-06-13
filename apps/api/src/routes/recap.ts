import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { users } from '@commma/db'
import { db } from '../db.js'
import { apiError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit, userKey } from '../middleware/rateLimit.js'
import { buildRecapStats } from '../recap/aggregate.js'
import { weekOverWeekPct } from '../recap/format.js'
import { defaultProse } from '../recap/prose.js'
import { currentWeek, priorWeekOf } from '../recap/week.js'
import type { AppEnv } from '../types.js'

export const recapRoutes = new Hono<AppEnv>()

recapRoutes.use('*', requireAuth)
recapRoutes.use('*', rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: userKey }))

recapRoutes.get('/', async (c) => {
  const userId = c.get('userId')

  const [user] = await db
    .select({
      plan: users.plan,
      handle: users.handle,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) return apiError(c, 'NOT_FOUND', 'User not found')
  if (user.plan !== 'pro' && user.plan !== 'team') {
    return apiError(c, 'FORBIDDEN', 'Weekly recap requires Pro or Team plan')
  }

  const now = new Date()
  const week = currentWeek(now)
  const prior = priorWeekOf(week)
  const stats = await buildRecapStats(userId, week, prior)
  const name = user.displayName ?? user.handle
  const prose = defaultProse(stats, name)
  const wowPct = weekOverWeekPct(stats.totalDurationS, stats.priorWeekDurationS)

  return c.json({
    week_start: week.weekStart,
    week_end: week.end.toISOString().slice(0, 10),
    session_count: stats.sessionCount,
    total_duration_s: stats.totalDurationS,
    best_duration_s: stats.bestDurationS,
    best_session_id: stats.bestSessionId,
    top_lang: stats.topLang,
    current_streak_days: stats.currentStreakDays,
    prior_week_duration_s: stats.priorWeekDurationS,
    week_over_week_pct: wowPct,
    headline: prose.headline,
    note: prose.note,
  })
})
