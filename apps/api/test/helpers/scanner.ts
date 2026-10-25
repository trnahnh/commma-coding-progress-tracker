import { randomUUID } from 'node:crypto'
import { getDb, seedUser } from './integration.js'

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function int(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1))
}

export interface SeededUser {
  userId: string
  expectedSessions: number
  lines: number
  keys: number
  events: number
}

export interface SeedOptions {
  users: number
  now: number
  rand: () => number
}

export async function seedClosedSessions(
  options: SeedOptions,
): Promise<SeededUser[]> {
  const db = await getDb()
  const { events } = await import('@commma/db')
  const seeded: SeededUser[] = []

  for (let u = 0; u < options.users; u++) {
    const user = await seedUser({ privacy: 'full' })
    const groups = int(options.rand, 2, 4)
    const rows: (typeof events.$inferInsert)[] = []
    let cursor = options.now - 20 * 60 * 1000
    let lines = 0
    let keys = 0

    for (let g = 0; g < groups; g++) {
      const count = int(options.rand, 5, 25)
      const groupRows: (typeof events.$inferInsert)[] = []
      for (let e = 0; e < count; e++) {
        const keystrokes = int(options.rand, 1, 400)
        const delta = int(options.rand, -20, 40)
        groupRows.push({
          id: randomUUID(),
          userId: user.id,
          ts: new Date(cursor),
          lang: 'typescript',
          file: `src/f${e % 3}.ts`,
          keystrokes,
          lines: delta,
          keyFreq: { a: keystrokes },
        })
        lines += delta
        keys += keystrokes
        cursor -= int(options.rand, 30, 120) * 1000
      }
      rows.push(...groupRows)
      cursor -= int(options.rand, 20, 90) * 60 * 1000
    }

    await db.insert(events).values(rows)
    seeded.push({
      userId: user.id,
      expectedSessions: groups,
      lines,
      keys,
      events: rows.length,
    })
  }

  return seeded
}

export interface InvariantReport {
  users: number
  sessionsExpected: number
  sessionsActual: number
  duplicateSessions: number
  linesViolations: number
  keysViolations: number
  eventsRemaining: number
}

export async function checkInvariants(
  seeded: SeededUser[],
): Promise<InvariantReport> {
  const db = await getDb()
  const { sql } = await import('drizzle-orm')
  const ids = seeded.map((s) => s.userId)
  const idList = sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  )

  const sessionRows = await db.execute<{
    user_id: string
    n: string
    distinct_starts: string
    lines: string | null
    keys: string | null
  }>(sql`
    select user_id,
           count(*) as n,
           count(distinct started_at) as distinct_starts,
           sum(lines_delta) as lines,
           sum((keyboard_heatmap->>'total')::bigint) as keys
    from sessions
    where user_id in (${idList})
    group by user_id
  `)
  const eventRows = await db.execute<{
    user_id: string
    n: string
    lines: string | null
    keys: string | null
  }>(sql`
    select user_id,
           count(*) as n,
           sum(lines) as lines,
           sum((key_freq->>'a')::bigint) as keys
    from events
    where user_id in (${idList})
    group by user_id
  `)

  const bySession = new Map(sessionRows.map((r) => [r.user_id, r]))
  const byEvent = new Map(eventRows.map((r) => [r.user_id, r]))

  const report: InvariantReport = {
    users: seeded.length,
    sessionsExpected: 0,
    sessionsActual: 0,
    duplicateSessions: 0,
    linesViolations: 0,
    keysViolations: 0,
    eventsRemaining: 0,
  }

  for (const s of seeded) {
    const sess = bySession.get(s.userId)
    const ev = byEvent.get(s.userId)
    const n = Number(sess?.n ?? 0)
    report.sessionsExpected += s.expectedSessions
    report.sessionsActual += n
    report.duplicateSessions += n - Number(sess?.distinct_starts ?? 0)
    report.eventsRemaining += Number(ev?.n ?? 0)
    const lines = Number(sess?.lines ?? 0) + Number(ev?.lines ?? 0)
    const keys = Number(sess?.keys ?? 0) + Number(ev?.keys ?? 0)
    if (lines !== s.lines) report.linesViolations += 1
    if (keys !== s.keys) report.keysViolations += 1
  }

  return report
}

export async function leaderboardDrift(seeded: SeededUser[]): Promise<{
  usersWithDrift: number
  missingSeconds: number
  extraSeconds: number
}> {
  const db = await getDb()
  const { redis } = await import('../../src/redis.js')
  const { sessions } = await import('@commma/db')
  const { inArray } = await import('drizzle-orm')
  const rows = await db
    .select({ userId: sessions.userId, durationS: sessions.durationS })
    .from(sessions)
    .where(
      inArray(
        sessions.userId,
        seeded.map((s) => s.userId),
      ),
    )
  const expected = new Map<string, number>()
  for (const r of rows) {
    expected.set(r.userId, (expected.get(r.userId) ?? 0) + r.durationS)
  }
  let usersWithDrift = 0
  let missingSeconds = 0
  let extraSeconds = 0
  for (const s of seeded) {
    const score = Number(
      (await redis.zscore('leaderboard:alltime', s.userId)) ?? 0,
    )
    const want = expected.get(s.userId) ?? 0
    if (score !== want) usersWithDrift += 1
    if (score < want) missingSeconds += want - score
    if (score > want) extraSeconds += score - want
  }
  return { usersWithDrift, missingSeconds, extraSeconds }
}
