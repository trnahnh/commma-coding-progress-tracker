import { afterAll, describe, expect, it } from 'vitest'
import {
  cleanup,
  closeClients,
  hasDb,
} from '../helpers/integration.js'
import {
  checkInvariants,
  leaderboardDrift,
  mulberry32,
  seedClosedSessions,
  type InvariantReport,
  type SeededUser,
} from '../helpers/scanner.js'

const TRIALS = Number(process.env.SCANNER_TRIALS ?? 10)
const USERS_PER_TRIAL = Number(process.env.SCANNER_USERS ?? 8)
const SCANNERS = Number(process.env.SCANNER_CONCURRENCY ?? 2)

async function purgeLeaderboard(seeded: SeededUser[]): Promise<void> {
  const { redis } = await import('../../src/redis.js')
  const keys = await redis.keys('leaderboard:*')
  const ids = seeded.map((s) => s.userId)
  for (const key of keys) {
    if (ids.length > 0) await redis.zrem(key, ...ids)
  }
}

function sum(reports: InvariantReport[], field: keyof InvariantReport): number {
  return reports.reduce((acc, r) => acc + r[field], 0)
}

describe.skipIf(!hasDb)('aggregation scanner under concurrency', () => {
  afterAll(async () => {
    await cleanup()
    await closeClients()
  })

  it(
    `finalizes each session exactly once with ${SCANNERS} concurrent scanners`,
    async () => {
      const { runAggregation } = await import('../../src/aggregate/run.js')
      const rand = mulberry32(Number(process.env.SCANNER_SEED ?? 20261025))
      const reports: InvariantReport[] = []
      let usersLocked = 0
      let leaderboardUsersWithDrift = 0
      const { redis } = await import('../../src/redis.js')

      for (let trial = 0; trial < TRIALS; trial++) {
        await redis.zadd('leaderboard:alltime', 0, 'warm-sentinel')
        const now = Date.now()
        const seeded = await seedClosedSessions({
          users: USERS_PER_TRIAL,
          now,
          rand,
        })
        const runs = await Promise.all(
          Array.from({ length: SCANNERS }, () => runAggregation(now)),
        )
        usersLocked += runs.reduce((acc, r) => acc + r.usersLocked, 0)
        reports.push(await checkInvariants(seeded))
        leaderboardUsersWithDrift += (await leaderboardDrift(seeded))
          .usersWithDrift
        await purgeLeaderboard(seeded)
        await cleanup()
      }

      const summary = {
        trials: TRIALS,
        scanners: SCANNERS,
        users: sum(reports, 'users'),
        sessionsExpected: sum(reports, 'sessionsExpected'),
        sessionsActual: sum(reports, 'sessionsActual'),
        duplicateSessions: sum(reports, 'duplicateSessions'),
        linesViolations: sum(reports, 'linesViolations'),
        keysViolations: sum(reports, 'keysViolations'),
        eventsRemaining: sum(reports, 'eventsRemaining'),
        usersLocked,
        leaderboardUsersWithDrift,
        trialsWithViolation: reports.filter(
          (r) =>
            r.duplicateSessions > 0 ||
            r.sessionsActual !== r.sessionsExpected ||
            r.linesViolations > 0 ||
            r.keysViolations > 0 ||
            r.eventsRemaining > 0,
        ).length,
      }
      process.stdout.write(`SCANNER_CONCURRENCY_RESULT ${JSON.stringify(summary)}\n`)

      expect(summary.duplicateSessions).toBe(0)
      expect(summary.sessionsActual).toBe(summary.sessionsExpected)
      expect(summary.linesViolations).toBe(0)
      expect(summary.keysViolations).toBe(0)
      expect(summary.eventsRemaining).toBe(0)
      expect(summary.leaderboardUsersWithDrift).toBe(0)
    },
    600_000,
  )
})
