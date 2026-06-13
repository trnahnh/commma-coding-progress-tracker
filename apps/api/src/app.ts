import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { env } from './env.js'
import { log } from './logger.js'
import { apiError } from './lib/errors.js'
import { authRoutes } from './routes/auth.js'
import { meRoutes } from './routes/me.js'
import { ingestRoutes } from './routes/ingest.js'
import { sessionRoutes } from './routes/sessions.js'
import { userRoutes } from './routes/users.js'
import { feedRoutes } from './routes/feed.js'
import { leaderboardRoutes } from './routes/leaderboard.js'
import { statsRoutes } from './routes/stats.js'
import { activityRoutes } from './routes/activity.js'
import { billingRoutes } from './routes/billing.js'
import { teamRoutes } from './routes/teams.js'
import { pushRoutes } from './routes/push.js'
import { recapRoutes } from './routes/recap.js'
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
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  )
  app.use(
    '/v1/*',
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: (c) =>
        apiError(c, 'PAYLOAD_TOO_LARGE', 'Request body too large'),
    }),
  )

  app.get('/health', (c) => c.json({ status: 'ok', ts: Date.now() }))

  app.route('/v1/auth', authRoutes)
  app.route('/v1/me', meRoutes)
  app.route('/v1/ingest', ingestRoutes)
  app.route('/v1/sessions', sessionRoutes)
  app.route('/v1/users', userRoutes)
  app.route('/v1/feed', feedRoutes)
  app.route('/v1/leaderboard', leaderboardRoutes)
  app.route('/v1/stats', statsRoutes)
  app.route('/v1/activity', activityRoutes)
  app.route('/v1/billing', billingRoutes)
  app.route('/v1/teams', teamRoutes)
  app.route('/v1/push', pushRoutes)
  app.route('/v1/recap', recapRoutes)

  app.notFound((c) => apiError(c, 'NOT_FOUND', 'Resource not found'))
  app.onError((err, c) => {
    const cause = err instanceof Error ? err.cause : undefined
    log.error('unhandled_error', {
      message: err instanceof Error ? err.message : String(err),
      cause: cause instanceof Error ? cause.message : cause,
    })
    return apiError(c, 'INTERNAL_ERROR', 'Unexpected server error')
  })

  return app
}
