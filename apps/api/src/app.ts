import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { env } from './env.js'
import { log } from './logger.js'
import { apiError } from './lib/errors.js'
import { authRoutes } from './routes/auth.js'
import { meRoutes } from './routes/me.js'
import { ingestRoutes } from './routes/ingest.js'
import { sessionRoutes } from './routes/sessions.js'
import { leaderboardRoutes } from './routes/leaderboard.js'
import type { AppEnv } from './types.js'

export function createApp() {
  const app = new Hono<AppEnv>()

  app.use(
    '*',
    logger((str) => log.info(str.trim())),
  )
  app.use(
    '/v1/*',
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    }),
  )

  app.get('/healthz', (c) => c.json({ status: 'ok', ts: Date.now() }))

  app.route('/v1/auth', authRoutes)
  app.route('/v1/me', meRoutes)
  app.route('/v1/ingest', ingestRoutes)
  app.route('/v1/sessions', sessionRoutes)
  app.route('/v1/leaderboard', leaderboardRoutes)

  app.notFound((c) => apiError(c, 'NOT_FOUND', 'Resource not found'))
  app.onError((err, c) => {
    log.error('unhandled_error', {
      message: err instanceof Error ? err.message : String(err),
    })
    return apiError(c, 'INTERNAL_ERROR', 'Unexpected server error')
  })

  return app
}
