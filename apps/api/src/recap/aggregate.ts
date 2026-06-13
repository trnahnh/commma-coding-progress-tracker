import { and, eq, gte, inArray, lt } from 'drizzle-orm'
import { sessionLangs, sessions, streaks } from '@commma/db'
import { db } from '../db.js'
import type { RecapWindow } from './week.js'

export interface RecapStats {
  sessionCount: number
  totalDurationS: number
  bestDurationS: number
  bestSessionId: string | null
  topLang: string | null
  currentStreakDays: number
  priorWeekDurationS: number
}

async function durationInWindow(
  userId: string,
  window: RecapWindow,
): Promise<{ id: string; durationS: number }[]> {
  return db
    .select({ id: sessions.id, durationS: sessions.durationS })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        gte(sessions.startedAt, window.start),
        lt(sessions.startedAt, window.end),
      ),
    )
}

async function topLangForSessions(
  sessionIds: string[],
): Promise<string | null> {
  if (sessionIds.length === 0) return null
  const rows = await db
    .select()
    .from(sessionLangs)
    .where(inArray(sessionLangs.sessionId, sessionIds))

  const byLang = new Map<string, number>()
  for (const row of rows) {
    byLang.set(row.lang, (byLang.get(row.lang) ?? 0) + row.durationS)
  }

  let best: string | null = null
  let bestDuration = -1
  for (const [lang, duration] of byLang) {
    if (duration > bestDuration) {
      best = lang
      bestDuration = duration
    }
  }
  return best
}

export async function buildRecapStats(
  userId: string,
  window: RecapWindow,
  priorWindow: RecapWindow,
): Promise<RecapStats> {
  const weekSessions = await durationInWindow(userId, window)
  const priorSessions = await durationInWindow(userId, priorWindow)

  let totalDurationS = 0
  let bestDurationS = 0
  let bestSessionId: string | null = null
  for (const s of weekSessions) {
    totalDurationS += s.durationS
    if (s.durationS > bestDurationS) {
      bestDurationS = s.durationS
      bestSessionId = s.id
    }
  }

  const priorWeekDurationS = priorSessions.reduce((sum, s) => sum + s.durationS, 0)

  const topLang = await topLangForSessions(weekSessions.map((s) => s.id))

  const streakRow = await db
    .select({ currentDays: streaks.currentDays })
    .from(streaks)
    .where(eq(streaks.userId, userId))
    .limit(1)

  return {
    sessionCount: weekSessions.length,
    totalDurationS,
    bestDurationS,
    bestSessionId,
    topLang,
    currentStreakDays: streakRow[0]?.currentDays ?? 0,
    priorWeekDurationS,
  }
}
