import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { config as dotenvConfig } from 'dotenv'
import { like } from 'drizzle-orm'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import { createDb, users } from '@commma/db'
import type { Db } from '@commma/db'
import { KEY_LABELS } from '@commma/shared'
import type { HeartbeatEvent, KeyFreq, KeyLabel } from '@commma/shared'

export const LOADTEST_PREFIX = 'loadtest-'
export const LOADTEST_EMAIL_DOMAIN = 'loadtest.commma.invalid'

const targetSchema = z.enum(['local', 'prod'])
const urlSchema = z.string().url()

export type LoadtestTarget = z.infer<typeof targetSchema>

export interface LoadtestConfig {
  target: LoadtestTarget
  apiUrl: string
  databaseUrl: string
  jwtSecret: string
  redisUrl: string | null
}

function firstDefined(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (value !== undefined && value !== '') return value
  }
  return undefined
}

function loadProdEnvFile(): Record<string, string> {
  const path = fileURLToPath(new URL('../../.env.production', import.meta.url))
  if (!existsSync(path)) return {}
  const result = dotenvConfig({ path, processEnv: {} as NodeJS.ProcessEnv })
  return result.parsed ?? {}
}

export function loadConfig(): LoadtestConfig {
  const target = targetSchema.parse(process.env.LOADTEST_TARGET ?? 'local')
  const prod = target === 'prod' ? loadProdEnvFile() : {}
  const apiUrl = urlSchema.parse(
    firstDefined(
      process.env.LOADTEST_API_URL,
      target === 'prod' ? 'https://api.commma.dev' : undefined,
      `http://localhost:${process.env.PORT ?? '3000'}`,
    ),
  )
  const databaseUrl = urlSchema.parse(
    firstDefined(
      process.env.LOADTEST_DATABASE_URL,
      prod.DATABASE_URL,
      process.env.DATABASE_URL,
    ),
  )
  const jwtSecret = z
    .string()
    .min(1)
    .parse(
      firstDefined(
        process.env.LOADTEST_JWT_SECRET,
        prod.JWT_SECRET,
        process.env.JWT_SECRET,
      ),
    )
  const redisRaw = firstDefined(
    process.env.LOADTEST_REDIS_URL,
    prod.REDIS_URL,
    process.env.REDIS_URL,
  )
  return {
    target,
    apiUrl,
    databaseUrl,
    jwtSecret,
    redisUrl: redisRaw ? urlSchema.parse(redisRaw) : null,
  }
}

export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
  } catch {
    return 'invalid-url'
  }
}

export function parseArgs(argv: string[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const token of argv) {
    if (!token.startsWith('--')) continue
    const eq = token.indexOf('=')
    if (eq === -1) out.set(token.slice(2), 'true')
    else out.set(token.slice(2, eq), token.slice(eq + 1))
  }
  return out
}

export function argInt(args: Map<string, string>, key: string, fallback: number): number {
  const raw = args.get(key)
  if (raw === undefined) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function argFloat(args: Map<string, string>, key: string, fallback: number): number {
  const raw = args.get(key)
  if (raw === undefined) return fallback
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function argStr(args: Map<string, string>, key: string, fallback: string): string {
  return args.get(key) ?? fallback
}

export function argBool(args: Map<string, string>, key: string): boolean {
  return args.get(key) === 'true'
}

export function argList(args: Map<string, string>, key: string, fallback: number[]): number[] {
  const raw = args.get(key)
  if (raw === undefined) return fallback
  const parsed = raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0)
  return parsed.length > 0 ? parsed : fallback
}

export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export function createLoadtestDb(url: string): Db {
  return createDb(url, { max: 20 })
}

export async function listLoadtestUserIds(db: Db): Promise<string[]> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.handle, `${LOADTEST_PREFIX}%`))
  return rows.map((row) => row.id)
}

export async function signToken(userId: string, secret: string, ttlS = 7200): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return sign({ sub: userId, iat: now, exp: now + ttlS }, secret)
}

const LANGS = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Go',
  'Rust',
  'Java',
  'C++',
  'HTML',
  'CSS',
  'Markdown',
  'JSON',
  'Shell',
] as const

const PROJECTS = ['commma', 'webapp', 'api-server', 'infra', 'notes'] as const

const FILES = [
  'src/index.ts',
  'src/app.ts',
  'src/routes/handler.ts',
  'src/lib/util.ts',
  'src/components/View.tsx',
  'src/styles/main.css',
  'README.md',
  'package.json',
  'scripts/build.sh',
  'docs/design.md',
] as const

const IDLE_GAP_MS = 15 * 60 * 1000
const MIN_LATEST_AGE_MS = 20 * 60 * 1000

function keyFreq(total: number): KeyFreq {
  const out: Partial<Record<KeyLabel, number>> = {}
  let remaining = total
  const buckets = randInt(6, 14)
  for (let i = 0; i < buckets && remaining > 0; i++) {
    const label = KEY_LABELS[randInt(0, KEY_LABELS.length - 1)]
    const take = i === buckets - 1 ? remaining : randInt(1, Math.max(1, Math.floor(remaining / 2)))
    out[label] = (out[label] ?? 0) + take
    remaining -= take
  }
  return out as KeyFreq
}

export interface SessionBatchOptions {
  size: number
  windowDays: number
  now: number
}

export function generateSessionBatch(options: SessionBatchOptions): HeartbeatEvent[] {
  const { size, windowDays, now } = options
  const span = windowDays * 24 * 60 * 60 * 1000
  const slack = span - MIN_LATEST_AGE_MS
  const latest = now - MIN_LATEST_AGE_MS - Math.floor(Math.random() * Math.max(0, slack))
  const lang = pick(LANGS)
  const project = pick(PROJECTS)
  const file = `${project}/${pick(FILES)}`

  const gaps: number[] = []
  let cumulative = 0
  for (let i = 0; i < size; i++) {
    const gap = randInt(20_000, Math.min(40_000, IDLE_GAP_MS - 1))
    cumulative += gap
    gaps.push(cumulative)
  }
  const startTs = latest - cumulative

  const events: HeartbeatEvent[] = []
  for (let i = 0; i < size; i++) {
    const keystrokes = randInt(40, 160)
    events.push({
      id: randomUUID(),
      ts: startTs + gaps[i],
      lang,
      file,
      project,
      keystrokes,
      lines: randInt(-3, 20),
      key_freq: keyFreq(keystrokes),
    })
  }
  return events
}

export interface Sample {
  status: number
  ms: number
  networkError: boolean
}

export async function timedFetch(
  url: string,
  init: RequestInit,
  timeoutMs = 15_000,
): Promise<Sample> {
  const start = performance.now()
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    await res.arrayBuffer()
    return { status: res.status, ms: performance.now() - start, networkError: false }
  } catch {
    return { status: 0, ms: performance.now() - start, networkError: true }
  }
}

export async function runConcurrent(
  total: number,
  concurrency: number,
  task: (index: number) => Promise<void>,
): Promise<void> {
  let next = 0
  async function worker(): Promise<void> {
    for (;;) {
      const index = next++
      if (index >= total) return
      await task(index)
    }
  }
  const lanes = Math.max(1, Math.min(concurrency, total))
  await Promise.all(Array.from({ length: lanes }, () => worker()))
}

export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length))
  return sortedAsc[idx]
}

export interface PhaseStats {
  count: number
  wallMs: number
  rps: number
  p50: number
  p95: number
  p99: number
  max: number
  errorRate: number
  status: Record<string, number>
}

export function summarize(samples: Sample[], wallMs: number): PhaseStats {
  const latencies = samples.map((s) => s.ms).sort((a, b) => a - b)
  const status: Record<string, number> = {}
  let errors = 0
  for (const sample of samples) {
    const key = sample.networkError ? 'net' : String(sample.status)
    status[key] = (status[key] ?? 0) + 1
    if (sample.networkError || sample.status >= 500) errors++
  }
  return {
    count: samples.length,
    wallMs,
    rps: wallMs > 0 ? samples.length / (wallMs / 1000) : 0,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies[latencies.length - 1] ?? 0,
    errorRate: samples.length > 0 ? errors / samples.length : 0,
    status,
  }
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export function printStep(phase: string, concurrency: number, stats: PhaseStats): void {
  console.log(
    `[${phase}] c=${String(concurrency).padStart(4)} n=${String(stats.count).padStart(6)} ` +
      `rps=${stats.rps.toFixed(0).padStart(6)} ` +
      `p50=${stats.p50.toFixed(0)}ms p95=${stats.p95.toFixed(0)}ms p99=${stats.p99.toFixed(0)}ms ` +
      `max=${stats.max.toFixed(0)}ms err=${pct(stats.errorRate)} ` +
      `status=${JSON.stringify(stats.status)}`,
  )
}

export function isMainModule(url: string): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return url === pathToFileURL(entry).href
  } catch {
    return false
  }
}
