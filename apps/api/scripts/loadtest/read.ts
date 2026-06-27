import 'dotenv/config'
import {
  argFloat,
  argInt,
  argList,
  createLoadtestDb,
  isMainModule,
  listLoadtestUserIds,
  loadConfig,
  parseArgs,
  pct,
  pick,
  printStep,
  randInt,
  runConcurrent,
  signToken,
  summarize,
  timedFetch,
  type PhaseStats,
  type Sample,
} from './shared.js'

const READ_PATHS = ['/v1/me', '/v1/feed?limit=20', '/v1/sessions?limit=20'] as const

export interface ReadOptions {
  ramp: number[]
  perStep: number
  maxRequests: number
  maxSeconds: number
  errorCeiling: number
  p95CeilingMs: number
}

export interface ReadReport {
  totalRequests: number
  wallSeconds: number
  kneeConcurrency: number | null
  steps: { concurrency: number; stats: PhaseStats }[]
}

export async function runRead(options: ReadOptions): Promise<ReadReport> {
  const config = loadConfig()
  const db = createLoadtestDb(config.databaseUrl)
  const userIds = await listLoadtestUserIds(db)
  await db.$client.end()
  if (userIds.length === 0) {
    throw new Error('no loadtest users found; run seed first')
  }
  const tokens = await Promise.all(
    userIds.map((id) => signToken(id, config.jwtSecret)),
  )

  console.log(
    `[read] users=${userIds.length} api=${config.apiUrl} paths=${READ_PATHS.join(' ')} ` +
      `ramp=${options.ramp.join(',')} maxRequests=${options.maxRequests}`,
  )

  const report: ReadReport = {
    totalRequests: 0,
    wallSeconds: 0,
    kneeConcurrency: null,
    steps: [],
  }

  const startedAll = performance.now()
  for (const concurrency of options.ramp) {
    if (report.totalRequests >= options.maxRequests) break
    if ((performance.now() - startedAll) / 1000 >= options.maxSeconds) break

    const n = Math.min(options.perStep, options.maxRequests - report.totalRequests)
    const samples: Sample[] = new Array(n)
    const stepStart = performance.now()
    await runConcurrent(n, concurrency, async (i) => {
      const token = tokens[randInt(0, tokens.length - 1)]
      const path = pick(READ_PATHS)
      samples[i] = await timedFetch(`${config.apiUrl}${path}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      })
    })
    const stats = summarize(samples, performance.now() - stepStart)
    report.totalRequests += n
    report.steps.push({ concurrency, stats })
    printStep('read', concurrency, stats)

    if (stats.errorRate > options.errorCeiling || stats.p95 > options.p95CeilingMs) {
      report.kneeConcurrency = concurrency
      console.log(
        `[read] knee at concurrency=${concurrency} errorRate=${pct(stats.errorRate)} p95=${stats.p95.toFixed(0)}ms`,
      )
      break
    }
  }

  report.wallSeconds = (performance.now() - startedAll) / 1000
  console.log(
    `[read] totalRequests=${report.totalRequests} wall=${report.wallSeconds.toFixed(1)}s`,
  )
  return report
}

export function readOptionsFromArgs(args: Map<string, string>): ReadOptions {
  return {
    ramp: argList(args, 'read-ramp', [10, 25, 50, 100, 200, 400]),
    perStep: argInt(args, 'read-per-step', 2000),
    maxRequests: argInt(args, 'read-max-requests', 30000),
    maxSeconds: argInt(args, 'read-max-seconds', 600),
    errorCeiling: argFloat(args, 'error-ceiling', 0.02),
    p95CeilingMs: argInt(args, 'read-p95-ceiling', 1500),
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  await runRead(readOptionsFromArgs(args))
}

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
