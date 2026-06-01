import { inArray } from 'drizzle-orm'
import { sessionLangs, sessions } from '@commma/db'
import { db } from '../db.js'

type SessionRow = typeof sessions.$inferSelect

export async function topLangBySession(
  sessionIds: string[],
): Promise<Map<string, string>> {
  const best = new Map<string, { lang: string; pct: number }>()
  if (sessionIds.length === 0) return new Map()

  const rows = await db
    .select()
    .from(sessionLangs)
    .where(inArray(sessionLangs.sessionId, sessionIds))

  for (const row of rows) {
    const pct = Number(row.pct)
    const current = best.get(row.sessionId)
    if (!current || pct > current.pct) {
      best.set(row.sessionId, { lang: row.lang, pct })
    }
  }

  const result = new Map<string, string>()
  for (const [id, value] of best) result.set(id, value.lang)
  return result
}

export function toSessionSummary(s: SessionRow, topLang: string | null) {
  return {
    id: s.id,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    duration_s: s.durationS,
    lines_delta: s.linesDelta,
    pace_cpm: s.paceCpm,
    top_lang: topLang,
  }
}
