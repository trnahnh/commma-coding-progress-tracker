import { log } from '../logger.js'
import { acquireLeader } from '../lib/scheduling.js'
import { deleteExpiredRefreshTokens } from '../lib/refresh.js'

const INTERVAL_MS = 24 * 60 * 60 * 1000

let timer: NodeJS.Timeout | null = null
let running = false

async function tick(): Promise<void> {
  if (running) return
  if (!(await acquireLeader('refresh-token-cleanup', INTERVAL_MS))) return
  running = true
  try {
    const count = await deleteExpiredRefreshTokens()
    if (count > 0) log.info('refresh_tokens_pruned', { count })
  } catch (err) {
    log.error('refresh_token_cleanup_tick_failed', {
      message: err instanceof Error ? err.message : String(err),
    })
  } finally {
    running = false
  }
}

export function startRefreshTokenCleanup(): void {
  if (timer) return
  log.info('refresh_token_cleanup_started', { intervalMs: INTERVAL_MS })
  void tick()
  timer = setInterval(() => void tick(), INTERVAL_MS)
  timer.unref()
}

export function stopRefreshTokenCleanup(): void {
  if (!timer) return
  clearInterval(timer)
  timer = null
}
