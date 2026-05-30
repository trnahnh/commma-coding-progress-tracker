import { createMiddleware } from 'hono/factory'
import { verifyAccessToken } from '../lib/jwt.js'
import { apiError } from '../lib/errors.js'
import type { AppEnv } from '../types.js'

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return apiError(c, 'UNAUTHORIZED', 'Missing bearer token')
  const userId = await verifyAccessToken(token)
  if (!userId) return apiError(c, 'UNAUTHORIZED', 'Invalid or expired token')
  c.set('userId', userId)
  await next()
})
