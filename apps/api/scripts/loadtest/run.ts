import 'dotenv/config'
import {
  argBool,
  argFloat,
  argInt,
  argList,
  isMainModule,
  loadConfig,
  parseArgs,
} from './shared.js'
import { runSeed } from './seed.js'
import { runIngest, type IngestOptions, type IngestReport } from './ingest.js'
import { runRead, type ReadOptions, type ReadReport } from './read.js'

interface OrchestratorReport {
  target: string
  users: number
  ingest: IngestReport
  read: ReadReport
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const config = loadConfig()
  const prod = config.target === 'prod'

  const users = argInt(args, 'users', 700)
  const skipSeed = argBool(args, 'skip-seed')
  const skipAggregate = argBool(args, 'skip-aggregate') || prod

  const ingestOptions: IngestOptions = {
    batch: argInt(args, 'batch', 60),
    windowDays: argInt(args, 'window-days', 14),
    ramp: argList(args, 'ramp', prod ? [25, 50, 100] : [10, 25, 50, 100, 200, 400]),
    perStep: argInt(args, 'per-step', prod ? 1500 : 2000),
    maxRequests: argInt(args, 'max-requests', prod ? 12000 : 40000),
    maxSeconds: argInt(args, 'max-seconds', 600),
    errorCeiling: argFloat(args, 'error-ceiling', 0.02),
    p95CeilingMs: argInt(args, 'p95-ceiling', 2000),
  }
  const readOptions: ReadOptions = {
    ramp: argList(args, 'read-ramp', prod ? [25, 50, 100] : [10, 25, 50, 100, 200, 400]),
    perStep: argInt(args, 'read-per-step', prod ? 1500 : 2000),
    maxRequests: argInt(args, 'read-max-requests', prod ? 9000 : 30000),
    maxSeconds: argInt(args, 'read-max-seconds', 600),
    errorCeiling: argFloat(args, 'error-ceiling', 0.02),
    p95CeilingMs: argInt(args, 'read-p95-ceiling', 1500),
  }

  console.log(
    `[run] target=${config.target} users=${users} skipSeed=${skipSeed} skipAggregate=${skipAggregate}`,
  )
  if (prod) {
    console.log(
      `[run] prod guardrails active: ingestMaxRequests=${ingestOptions.maxRequests} ` +
        `readMaxRequests=${readOptions.maxRequests} ` +
        `estUpstashCmds≈${ingestOptions.maxRequests + readOptions.maxRequests} (vs 500k/mo free tier)`,
    )
  }

  if (!skipSeed) {
    await runSeed(users)
  }

  console.log('[run] --- ingest phase ---')
  const ingest = await runIngest(ingestOptions)

  if (!skipAggregate) {
    console.log('[run] --- aggregate phase ---')
    const { runAggregateOnce } = await import('./aggregate.js')
    const { redis } = await import('../../src/redis.js')
    const { closeDb } = await import('../../src/db.js')
    try {
      await runAggregateOnce()
    } finally {
      await redis.quit()
      await closeDb()
    }
  } else {
    console.log(
      '[run] --- aggregate skipped (prod scheduler finalizes sessions within ~5 min) ---',
    )
  }

  console.log('[run] --- read phase ---')
  const read = await runRead(readOptions)

  const report: OrchestratorReport = { target: config.target, users, ingest, read }
  console.log('[run] === summary ===')
  console.log(JSON.stringify(summaryView(report), null, 2))
}

function summaryView(report: OrchestratorReport): unknown {
  return {
    target: report.target,
    users: report.users,
    ingest: {
      totalRequests: report.ingest.totalRequests,
      wallSeconds: Number(report.ingest.wallSeconds.toFixed(1)),
      kneeConcurrency: report.ingest.kneeConcurrency,
      lastStep: lastStepView(report.ingest.steps),
    },
    read: {
      totalRequests: report.read.totalRequests,
      wallSeconds: Number(report.read.wallSeconds.toFixed(1)),
      kneeConcurrency: report.read.kneeConcurrency,
      lastStep: lastStepView(report.read.steps),
    },
  }
}

function lastStepView(
  steps: {
    concurrency: number
    stats: { p95: number; p99: number; rps: number; errorRate: number }
  }[],
): unknown {
  const last = steps[steps.length - 1]
  if (!last) return null
  return {
    concurrency: last.concurrency,
    p95: Number(last.stats.p95.toFixed(0)),
    p99: Number(last.stats.p99.toFixed(0)),
    rps: Number(last.stats.rps.toFixed(0)),
    errorRate: Number(last.stats.errorRate.toFixed(4)),
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
