import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { pushSubscriptions } from '@commma/db'
import { db } from '../db.js'
import { apiError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit, userKey } from '../middleware/rateLimit.js'
import { isWebPushEnabled } from '../lib/webPush.js'
import { env } from '../env.js'
import type { AppEnv } from '../types.js'

export const pushRoutes = new Hono<AppEnv>()

pushRoutes.get('/vapid-public-key', (c) => {
  if (!isWebPushEnabled()) return apiError(c, 'SERVICE_UNAVAILABLE', 'Push notifications not configured')
  return c.json({ key: env.VAPID_PUBLIC_KEY })
})

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(1).max(256),
  auth: z.string().min(1).max(64),
})

pushRoutes.post(
  '/subscribe',
  requireAuth,
  rateLimit({ scope: 'write', limit: 20, windowS: 3600, key: userKey }),
  zValidator('json', subscribeSchema, (result, c) => {
    if (!result.success) return apiError(c, 'VALIDATION_ERROR', 'Invalid subscription data', result.error.issues)
  }),
  async (c) => {
    if (!isWebPushEnabled()) return apiError(c, 'SERVICE_UNAVAILABLE', 'Push notifications not configured')
    const userId = c.get('userId')
    const { endpoint, p256dh, auth } = c.req.valid('json')
    await db
      .insert(pushSubscriptions)
      .values({ userId, endpoint, p256dh, auth })
      .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh, auth } })
    return c.json({ ok: true }, 201)
  },
)

pushRoutes.delete(
  '/subscribe',
  requireAuth,
  rateLimit({ scope: 'write', limit: 20, windowS: 3600, key: userKey }),
  zValidator('json', z.object({ endpoint: z.string().url().max(2048) }), (result, c) => {
    if (!result.success) return apiError(c, 'VALIDATION_ERROR', 'Invalid request', result.error.issues)
  }),
  async (c) => {
    const userId = c.get('userId')
    const { endpoint } = c.req.valid('json')
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)))
    return c.body(null, 204)
  },
)
