import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { env } from './env.js'
import { log } from './logger.js'
import { closeDb } from './db.js'
import { redis } from './redis.js'
import {
  startAggregation,
  stopAggregation,
  whenAggregationIdle,
} from './aggregate/scheduler.js'
import {
  startStreakReset,
  stopStreakReset,
} from './aggregate/streakScheduler.js'
import {
  startRefreshTokenCleanup,
  stopRefreshTokenCleanup,
} from './maintenance/refreshTokenScheduler.js'
import {
  startPushScheduler,
  stopPushScheduler,
} from './maintenance/pushScheduler.js'
import {
  startRecapScheduler,
  stopRecapScheduler,
} from './maintenance/recapScheduler.js'

const SHUTDOWN_TIMEOUT_MS = 30 * 1000

const app = createApp()

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  log.info('server_started', { port: info.port })
  if (env.RUN_AGGREGATION) {
    startAggregation()
    startStreakReset()
    startRefreshTokenCleanup()
    startPushScheduler()
    startRecapScheduler()
  }
})

let shuttingDown = false

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  log.info('shutdown_started', { signal })

  stopAggregation()
  stopStreakReset()
  stopRefreshTokenCleanup()
  stopPushScheduler()
  stopRecapScheduler()

  await new Promise<void>((resolve) => server.close(() => resolve()))
  await whenAggregationIdle(SHUTDOWN_TIMEOUT_MS)

  try {
    await closeDb()
    await redis.quit()
  } catch (err) {
    log.error('shutdown_cleanup_failed', {
      message: err instanceof Error ? err.message : String(err),
    })
  }

  log.info('shutdown_complete', { signal })
  process.exit(0)
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => void shutdown(signal))
}
