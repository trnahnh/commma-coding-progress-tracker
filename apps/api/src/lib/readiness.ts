import { log } from '../logger.js'

export type ProbeState = 'ok' | 'down'

export interface Readiness {
  ready: boolean
  db: ProbeState
  cache: ProbeState
  checkedAt: number
}

export interface ReadinessProbes {
  db: () => Promise<unknown>
  cache: () => Promise<unknown>
}

export interface ReadinessOptions {
  timeoutMs: number
  okTtlMs: number
  downTtlMs: number
  now?: () => number
}

function withTimeout(
  probe: () => Promise<unknown>,
  timeoutMs: number,
): Promise<unknown> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`probe timed out after ${timeoutMs}ms`)),
      timeoutMs,
    )
  })
  return Promise.race([probe(), timeout]).finally(() => clearTimeout(timer))
}

async function runProbe(
  name: keyof ReadinessProbes,
  probe: () => Promise<unknown>,
  timeoutMs: number,
): Promise<ProbeState> {
  try {
    await withTimeout(probe, timeoutMs)
    return 'ok'
  } catch (err) {
    log.error('readiness_probe_failed', {
      probe: name,
      message: err instanceof Error ? err.message : String(err),
    })
    return 'down'
  }
}

export function createReadinessCheck(
  probes: ReadinessProbes,
  options: ReadinessOptions,
): () => Promise<Readiness> {
  const now = options.now ?? Date.now
  let cached: { value: Readiness; expiresAt: number } | null = null
  let inFlight: Promise<Readiness> | null = null

  async function evaluate(): Promise<Readiness> {
    const [db, cache] = await Promise.all([
      runProbe('db', probes.db, options.timeoutMs),
      runProbe('cache', probes.cache, options.timeoutMs),
    ])
    const checkedAt = now()
    const value: Readiness = {
      ready: db === 'ok' && cache === 'ok',
      db,
      cache,
      checkedAt,
    }
    const ttl = value.ready ? options.okTtlMs : options.downTtlMs
    cached = { value, expiresAt: checkedAt + ttl }
    return value
  }

  return async () => {
    if (cached && now() < cached.expiresAt) return cached.value
    if (!inFlight) {
      inFlight = evaluate().finally(() => {
        inFlight = null
      })
    }
    return inFlight
  }
}
