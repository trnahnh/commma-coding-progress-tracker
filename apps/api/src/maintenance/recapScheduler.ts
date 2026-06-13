import { env } from '../env.js'
import { log } from '../logger.js'
import { isEmailEnabled } from '../lib/email.js'
import { runRecapTick } from '../recap/run.js'
import { isRecapSendTime } from '../recap/week.js'

const INTERVAL_MS = 60 * 60 * 1000

let timer: NodeJS.Timeout | null = null
let running = false

async function tick(): Promise<void> {
  if (!isEmailEnabled()) return
  if (running) return
  const now = new Date()
  if (!isRecapSendTime(now, env.RECAP_SEND_HOUR_UTC)) return
  running = true
  try {
    await runRecapTick(now)
  } catch (err) {
    log.error('recap_scheduler_tick_failed', {
      message: err instanceof Error ? err.message : String(err),
    })
  } finally {
    running = false
  }
}

export function startRecapScheduler(): void {
  if (timer) return
  log.info('recap_scheduler_started', { intervalMs: INTERVAL_MS })
  timer = setInterval(() => void tick(), INTERVAL_MS)
  timer.unref()
}

export function stopRecapScheduler(): void {
  if (!timer) return
  clearInterval(timer)
  timer = null
}
