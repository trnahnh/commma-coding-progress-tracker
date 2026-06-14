import { log } from '../logger.js'
import { acquireLeader, delay } from '../lib/scheduling.js'
import { runAggregation } from './run.js'

const INTERVAL_MS = 5 * 60 * 1000

let timer: NodeJS.Timeout | null = null
let inFlight: Promise<void> | null = null

async function tick(): Promise<void> {
  if (inFlight) return
  if (!(await acquireLeader('aggregation', INTERVAL_MS))) return
  inFlight = (async () => {
    try {
      await runAggregation()
    } catch (err) {
      log.error('aggregation_tick_failed', {
        message: err instanceof Error ? err.message : String(err),
      })
    }
  })()
  try {
    await inFlight
  } finally {
    inFlight = null
  }
}

export function startAggregation(): void {
  if (timer) return
  log.info('aggregation_started', { intervalMs: INTERVAL_MS })
  void tick()
  timer = setInterval(() => void tick(), INTERVAL_MS)
  timer.unref()
}

export function stopAggregation(): void {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

export async function whenAggregationIdle(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (inFlight && Date.now() < deadline) {
    await Promise.race([inFlight, delay(250)])
  }
}
