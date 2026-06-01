import { and, eq, gt, isNotNull, lt, notExists } from 'drizzle-orm'
import { events, streaks } from '@commma/db'
import { db } from '../db.js'
import { streakBreakCutoff } from './streak.js'

export async function resetBrokenStreaks(now = Date.now()): Promise<number> {
  const cutoff = streakBreakCutoff(now)
  const reset = await db
    .update(streaks)
    .set({ currentDays: 0 })
    .where(
      and(
        gt(streaks.currentDays, 0),
        isNotNull(streaks.lastActiveDate),
        lt(streaks.lastActiveDate, cutoff),
        notExists(
          db
            .select({ userId: events.userId })
            .from(events)
            .where(eq(events.userId, streaks.userId)),
        ),
      ),
    )
    .returning({ userId: streaks.userId })
  return reset.length
}
