import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import {
  cleanup,
  closeClients,
  getDb,
  hasDb,
} from '../helpers/integration.js'
import {
  checkInvariants,
  leaderboardDrift,
  mulberry32,
  seedClosedSessions,
  type SeededUser,
} from '../helpers/scanner.js'

const TRIALS = Number(process.env.CRASH_TRIALS ?? 5)
const USERS_PER_TRIAL = Number(process.env.CRASH_USERS ?? 20)

const workerPath = fileURLToPath(
  new URL('../helpers/aggregationWorker.ts', import.meta.url),
)
const apiDir = fileURLToPath(new URL('../..', import.meta.url))

interface WorkerOutcome {
  completed: boolean
  elapsedMs: number
}

function runWorker(now: number, killAfterMs: number | null) {
  return new Promise<WorkerOutcome>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', workerPath, String(now)],
      { cwd: apiDir, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let readyAt = 0
    let completed = false
    let buffer = ''
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      if (!readyAt && buffer.includes('READY')) {
        readyAt = Date.now()
        if (killAfterMs !== null) {
          setTimeout(() => child.kill('SIGKILL'), killAfterMs)
        }
      }
      if (buffer.includes('DONE')) completed = true
    })
    child.stderr.resume()
    child.on('error', reject)
    child.on('exit', () =>
      resolve({ completed, elapsedMs: readyAt ? Date.now() - readyAt : 0 }),
    )
  })
}

async function committedSessions(seeded: SeededUser[]): Promise<number> {
  const db = await getDb()
  const { sessions } = await import('@commma/db')
  const { inArray, count } = await import('drizzle-orm')
  const [row] = await db
    .select({ n: count() })
    .from(sessions)
    .where(
      inArray(
        sessions.userId,
        seeded.map((s) => s.userId),
      ),
    )
  return row.n
}

async function purgeLeaderboard(seeded: SeededUser[]): Promise<void> {
  const { redis } = await import('../../src/redis.js')
  const keys = await redis.keys('leaderboard:*')
  for (const key of keys) {
    await redis.zrem(key, ...seeded.map((s) => s.userId))
  }
}

async function warmLeaderboard(): Promise<void> {
  const { redis } = await import('../../src/redis.js')
  await redis.zadd('leaderboard:alltime', 0, 'warm-sentinel')
}

describe.skipIf(!hasDb)('aggregation scanner killed mid-finalize', () => {
  afterAll(async () => {
    await cleanup()
    await closeClients()
  })

  it(
    'recovers to exactly-once sessions after SIGKILL at random points',
    async () => {
      const { runAggregation } = await import('../../src/aggregate/run.js')
      const rand = mulberry32(Number(process.env.CRASH_SEED ?? 1025))

      const calibrationNow = Date.now()
      const calibration = await seedClosedSessions({
        users: USERS_PER_TRIAL,
        now: calibrationNow,
        rand,
      })
      const baseline = await runWorker(calibrationNow, null)
      await purgeLeaderboard(calibration)
      await cleanup()
      const windowMs = Math.max(20, baseline.elapsedMs)

      const trials: {
        killAfterMs: number
        completedBeforeKill: boolean
        partialSessions: number
        expected: number
        violations: number
        lbUsersWithDrift: number
        lbMissingSeconds: number
        lbExtraSeconds: number
      }[] = []

      for (let t = 0; t < TRIALS; t++) {
        await warmLeaderboard()
        const now = Date.now()
        const seeded = await seedClosedSessions({
          users: USERS_PER_TRIAL,
          now,
          rand,
        })
        const killAfterMs = Math.floor(rand() * windowMs)
        const outcome = await runWorker(now, killAfterMs)
        await sleep(250)
        const partialSessions = await committedSessions(seeded)
        for (let pass = 0; pass < 20; pass++) {
          const stats = await runAggregation(now)
          if (stats.usersLocked === 0) break
          await sleep(100)
        }
        const report = await checkInvariants(seeded)
        const drift = await leaderboardDrift(seeded)
        trials.push({
          killAfterMs,
          completedBeforeKill: outcome.completed,
          partialSessions,
          expected: report.sessionsExpected,
          violations:
            report.duplicateSessions +
            Math.abs(report.sessionsActual - report.sessionsExpected) +
            report.linesViolations +
            report.keysViolations +
            report.eventsRemaining,
          lbUsersWithDrift: drift.usersWithDrift,
          lbMissingSeconds: drift.missingSeconds,
          lbExtraSeconds: drift.extraSeconds,
        })
        await purgeLeaderboard(seeded)
        await cleanup()
      }

      const midRun = trials.filter(
        (t) =>
          !t.completedBeforeKill &&
          t.partialSessions > 0 &&
          t.partialSessions < t.expected,
      ).length
      const summary = {
        trials: TRIALS,
        usersPerTrial: USERS_PER_TRIAL,
        calibrationRunMs: baseline.elapsedMs,
        killedBeforeAnyCommit: trials.filter(
          (t) => !t.completedBeforeKill && t.partialSessions === 0,
        ).length,
        killedMidRunWithPartialCommit: midRun,
        finishedBeforeKill: trials.filter((t) => t.completedBeforeKill)
          .length,
        invariantViolations: trials.reduce((a, t) => a + t.violations, 0),
        leaderboardTrialsWithDrift: trials.filter(
          (t) => t.lbUsersWithDrift > 0,
        ).length,
        leaderboardUsersWithDrift: trials.reduce(
          (a, t) => a + t.lbUsersWithDrift,
          0,
        ),
        leaderboardMissingSeconds: trials.reduce(
          (a, t) => a + t.lbMissingSeconds,
          0,
        ),
        leaderboardExtraSeconds: trials.reduce(
          (a, t) => a + t.lbExtraSeconds,
          0,
        ),
      }
      process.stdout.write(`SCANNER_CRASH_RESULT ${JSON.stringify(summary)}\n`)

      expect(summary.invariantViolations).toBe(0)
      expect(summary.leaderboardUsersWithDrift).toBe(0)
    },
    1_800_000,
  )
})
