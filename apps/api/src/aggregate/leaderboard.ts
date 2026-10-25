import { and, eq, gte, inArray, lt, sql } from 'drizzle-orm'
import { sessions } from '@commma/db'
import { db } from '../db.js'
import { redis } from '../redis.js'
import { acquireLock, delay, releaseLock } from '../lib/scheduling.js'

const REBUILD_LOCK_TTL_MS = 30 * 1000
const EMPTY_TTL_S = 60

function emptyKeyFor(key: string): string {
  return `lbempty:${key}`
}

const WEEK_TTL_S = 14 * 24 * 60 * 60
const MONTH_TTL_S = 40 * 24 * 60 * 60

export type LeaderboardPeriod = 'week' | 'month' | 'alltime'

export interface LeaderboardKeys {
  alltime: string
  week: string
  month: string
}

export function leaderboardKeys(date: Date): LeaderboardKeys {
  const month = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`
  return {
    alltime: 'leaderboard:alltime',
    week: `leaderboard:week:${isoWeek(date)}`,
    month: `leaderboard:month:${month}`,
  }
}

const SYNC_BATCH = 500
const SYNC_MAX_BATCHES = 20
const PERIODS: LeaderboardPeriod[] = ['alltime', 'week', 'month']

const SYNC_SCRIPT = `
redis.call('del', KEYS[2])
if redis.call('exists', KEYS[1]) == 0 then return 0 end
redis.call('zadd', KEYS[1], ARGV[1], ARGV[2])
local ttl = tonumber(ARGV[3])
if ttl > 0 then redis.call('expire', KEYS[1], ttl) end
return 1
`

interface SyncTarget {
  key: string
  ttlS: number | null
  window: PeriodWindow | null
  users: Set<string>
}

export interface LeaderboardSyncStats {
  sessions: number
  writes: number
}

async function userTotals(
  userIds: string[],
  window: PeriodWindow | null,
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      userId: sessions.userId,
      total: sql<number>`sum(${sessions.durationS})::int`,
    })
    .from(sessions)
    .where(
      and(
        inArray(sessions.userId, userIds),
        window
          ? and(
              gte(sessions.startedAt, window.start),
              lt(sessions.startedAt, window.end),
            )
          : undefined,
      ),
    )
    .groupBy(sessions.userId)
  return new Map(rows.map((row) => [row.userId, row.total]))
}

async function syncBatch(): Promise<LeaderboardSyncStats> {
  const pending = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      startedAt: sessions.startedAt,
    })
    .from(sessions)
    .where(eq(sessions.leaderboardPending, true))
    .limit(SYNC_BATCH)
  if (pending.length === 0) return { sessions: 0, writes: 0 }

  const targets = new Map<string, SyncTarget>()
  for (const row of pending) {
    for (const period of PERIODS) {
      const { key, ttlS } = keyForPeriod(period, row.startedAt)
      const target = targets.get(key) ?? {
        key,
        ttlS,
        window: periodWindow(period, row.startedAt),
        users: new Set<string>(),
      }
      target.users.add(row.userId)
      targets.set(key, target)
    }
  }

  const pipeline = redis.pipeline()
  let writes = 0
  for (const target of targets.values()) {
    const totals = await userTotals([...target.users], target.window)
    for (const userId of target.users) {
      const total = totals.get(userId) ?? 0
      if (total <= 0) continue
      pipeline.eval(
        SYNC_SCRIPT,
        2,
        target.key,
        emptyKeyFor(target.key),
        total,
        userId,
        target.ttlS ?? 0,
      )
      writes += 1
    }
  }
  const results = await pipeline.exec()
  const failed = results?.find(([err]) => err)
  if (failed?.[0]) throw failed[0]

  await db
    .update(sessions)
    .set({ leaderboardPending: false })
    .where(
      inArray(
        sessions.id,
        pending.map((row) => row.id),
      ),
    )
  return { sessions: pending.length, writes }
}

export async function syncPendingLeaderboard(): Promise<
  LeaderboardSyncStats
> {
  const stats: LeaderboardSyncStats = { sessions: 0, writes: 0 }
  for (let i = 0; i < SYNC_MAX_BATCHES; i++) {
    const batch = await syncBatch()
    stats.sessions += batch.sessions
    stats.writes += batch.writes
    if (batch.sessions < SYNC_BATCH) break
  }
  return stats
}

export async function removeLeaderboardUser(
  userId: string,
  date: Date,
): Promise<void> {
  const keys = leaderboardKeys(date)
  await redis
    .pipeline()
    .zrem(keys.alltime, userId)
    .zrem(keys.week, userId)
    .zrem(keys.month, userId)
    .exec()
}

export interface PeriodWindow {
  start: Date
  end: Date
}

export function periodWindow(
  period: LeaderboardPeriod,
  date: Date,
): PeriodWindow | null {
  if (period === 'alltime') return null
  if (period === 'week') {
    const start = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    )
    const dayNum = (start.getUTCDay() + 6) % 7
    start.setUTCDate(start.getUTCDate() - dayNum)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 7)
    return { start, end }
  }
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  )
  return { start, end }
}

function keyForPeriod(
  period: LeaderboardPeriod,
  date: Date,
): { key: string; ttlS: number | null } {
  const keys = leaderboardKeys(date)
  if (period === 'week') return { key: keys.week, ttlS: WEEK_TTL_S }
  if (period === 'month') return { key: keys.month, ttlS: MONTH_TTL_S }
  return { key: keys.alltime, ttlS: null }
}

async function rebuildPeriod(
  period: LeaderboardPeriod,
  date: Date,
  key: string,
  ttlS: number | null,
): Promise<number> {
  const window = periodWindow(period, date)
  const rows = await db
    .select({
      userId: sessions.userId,
      total: sql<number>`sum(${sessions.durationS})::int`,
    })
    .from(sessions)
    .where(
      window
        ? and(
            gte(sessions.startedAt, window.start),
            lt(sessions.startedAt, window.end),
          )
        : undefined,
    )
    .groupBy(sessions.userId)

  const scored = rows.filter((row) => row.total > 0)
  if (scored.length === 0) return 0

  const pipeline = redis.pipeline()
  for (const row of scored) {
    pipeline.zadd(key, row.total, row.userId)
  }
  if (ttlS !== null) pipeline.expire(key, ttlS)
  await pipeline.exec()
  return scored.length
}

export interface LeaderboardEntry {
  userId: string
  durationS: number
}

export async function topLeaderboard(
  period: LeaderboardPeriod,
  date: Date,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const { key, ttlS } = keyForPeriod(period, date)
  const emptyKey = emptyKeyFor(key)
  if ((await redis.exists(key)) === 0) {
    if ((await redis.exists(emptyKey)) === 1) return []
    const lockKey = `lock:rebuild:${key}`
    if (await acquireLock(lockKey, REBUILD_LOCK_TTL_MS)) {
      try {
        const added = await rebuildPeriod(period, date, key, ttlS)
        if (added === 0) await redis.set(emptyKey, '1', 'EX', EMPTY_TTL_S)
      } finally {
        await releaseLock(lockKey)
      }
    } else {
      for (let i = 0; i < 20; i++) {
        const ready = await redis
          .pipeline()
          .exists(key)
          .exists(emptyKey)
          .exec()
        if (ready?.some(([, v]) => v === 1)) break
        await delay(100)
      }
    }
  }

  const raw = await redis.zrevrange(key, 0, limit - 1, 'WITHSCORES')
  const entries: LeaderboardEntry[] = []
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ userId: raw[i], durationS: Math.round(Number(raw[i + 1])) })
  }
  return entries
}

function isoWeek(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
  const dayNum = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = d.getTime()
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const yearStartDay = (yearStart.getUTCDay() + 6) % 7
  yearStart.setUTCDate(yearStart.getUTCDate() - yearStartDay + 3)
  const week =
    1 +
    Math.round(
      (firstThursday - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000),
    )
  return `${d.getUTCFullYear()}-W${pad(week)}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
