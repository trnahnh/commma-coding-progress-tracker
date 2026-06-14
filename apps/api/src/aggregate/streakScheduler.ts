import { log } from '../logger.js'
import { acquireLeader } from '../lib/scheduling.js'
import { resetBrokenStreaks } from './streakReset.js'

const INTERVAL_MS = 60 * 60 * 1000

let timer: NodeJS.Timeout | null = null
let running = false

async function tick(): Promise<void> {
  if (running) return
  if (!(await acquireLeader('streak-reset', INTERVAL_MS))) return
  running = true
  try {
    const count = await resetBrokenStreaks()
    if (count > 0) log.info('streaks_reset', { count })
  } catch (err) {
    log.error('streak_reset_tick_failed', {
      message: err instanceof Error ? err.message : String(err),
    })
  } finally {
    running = false
  }
}

export function startStreakReset(): void {
  if (timer) return
  log.info('streak_reset_started', { intervalMs: INTERVAL_MS })
  void tick()
  timer = setInterval(() => void tick(), INTERVAL_MS)
  timer.unref()
}

export function stopStreakReset(): void {
  if (!timer) return
  clearInterval(timer)
  timer = null
}
