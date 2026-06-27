import 'dotenv/config'
import {
  argFloat,
  argInt,
  argList,
  createLoadtestDb,
  generateSessionBatch,
  isMainModule,
  listLoadtestUserIds,
  loadConfig,
  parseArgs,
  pct,
  printStep,
  randInt,
  runConcurrent,
  signToken,
  summarize,
  type PhaseStats,
  type Sample,
} from './shared.js'

export interface IngestOptions {
  batch: number
  windowDays: number
  ramp: number[]
  perStep: number
  maxRequests: number
  maxSeconds: number
  errorCeiling: number
  p95CeilingMs: number
}

export interface IngestReport {
  totalRequests: number
  wallSeconds: number
  kneeConcurrency: number | null
  steps: { concurrency: number; stats: PhaseStats }[]
  estimatedRedisCommands: number
}

export async function runIngest(options: IngestOptions): Promise<IngestReport> {
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

  const url = `${config.apiUrl}/v1/ingest`
  console.log(
    `[ingest] users=${userIds.length} api=${config.apiUrl} batch=${options.batch} ` +
      `ramp=${options.ramp.join(',')} maxRequests=${options.maxRequests} maxSeconds=${options.maxSeconds}`,
  )

  const report: IngestReport = {
    totalRequests: 0,
    wallSeconds: 0,
    kneeConcurrency: null,
    steps: [],
    estimatedRedisCommands: 0,
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
      const events = generateSessionBatch({
        size: options.batch,
        windowDays: options.windowDays,
        now: Date.now(),
      })
      samples[i] = await timedIngest(url, token, events)
    })
    const stats = summarize(samples, performance.now() - stepStart)
    report.totalRequests += n
    report.steps.push({ concurrency, stats })
    printStep('ingest', concurrency, stats)

    if (stats.errorRate > options.errorCeiling || stats.p95 > options.p95CeilingMs) {
      report.kneeConcurrency = concurrency
      console.log(
        `[ingest] knee at concurrency=${concurrency} errorRate=${pct(stats.errorRate)} p95=${stats.p95.toFixed(0)}ms`,
      )
      break
    }
  }

  report.wallSeconds = (performance.now() - startedAll) / 1000
  report.estimatedRedisCommands = report.totalRequests
  console.log(
    `[ingest] totalRequests=${report.totalRequests} wall=${report.wallSeconds.toFixed(1)}s ` +
      `estUpstashCmds≈${report.estimatedRedisCommands}`,
  )
  return report
}

async function timedIngest(
  url: string,
  token: string,
  events: ReturnType<typeof generateSessionBatch>,
): Promise<Sample> {
  const start = performance.now()
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ events }),
      signal: AbortSignal.timeout(15_000),
    })
    await res.arrayBuffer()
    return { status: res.status, ms: performance.now() - start, networkError: false }
  } catch {
    return { status: 0, ms: performance.now() - start, networkError: true }
  }
}

export function ingestOptionsFromArgs(args: Map<string, string>): IngestOptions {
  return {
    batch: argInt(args, 'batch', 60),
    windowDays: argInt(args, 'window-days', 14),
    ramp: argList(args, 'ramp', [10, 25, 50, 100, 200, 400]),
    perStep: argInt(args, 'per-step', 2000),
    maxRequests: argInt(args, 'max-requests', 40000),
    maxSeconds: argInt(args, 'max-seconds', 600),
    errorCeiling: argFloat(args, 'error-ceiling', 0.02),
    p95CeilingMs: argInt(args, 'p95-ceiling', 2000),
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  await runIngest(ingestOptionsFromArgs(args))
}

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
