import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../db.js'
import { redis } from '../redis.js'
import { ipKey, rateLimit } from '../middleware/rateLimit.js'
import { log } from '../logger.js'
import type { AppEnv } from '../types.js'

export const statusRoutes = new Hono<AppEnv>()

const CACHE_KEY = 'status:probe:v1'
const CACHE_TTL_S = 15

type Health = 'ok' | 'down'

interface StatusBody {
  api: Health
  db: Health
  cache: Health
  ts: number
}

async function probeDb(): Promise<Health> {
  try {
    await db.execute(sql`select 1`)
    return 'ok'
  } catch (err) {
    log.error('status_db_probe_failed', {
      message: err instanceof Error ? err.message : String(err),
    })
    return 'down'
  }
}

async function probeCache(): Promise<Health> {
  try {
    const pong = await redis.ping()
    return pong === 'PONG' ? 'ok' : 'down'
  } catch (err) {
    log.error('status_cache_probe_failed', {
      message: err instanceof Error ? err.message : String(err),
    })
    return 'down'
  }
}

statusRoutes.get(
  '/',
  rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: ipKey }),
  async (c) => {
    try {
      const cached = await redis.get(CACHE_KEY)
      if (cached) {
        c.header('Cache-Control', 'public, max-age=15')
        return c.json(JSON.parse(cached) as StatusBody)
      }
    } catch {
      void 0
    }

    const [database, cache] = await Promise.all([probeDb(), probeCache()])
    const body: StatusBody = { api: 'ok', db: database, cache, ts: Date.now() }

    if (cache === 'ok') {
      try {
        await redis.set(CACHE_KEY, JSON.stringify(body), 'EX', CACHE_TTL_S)
      } catch {
        void 0
      }
    }

    c.header('Cache-Control', 'public, max-age=15')
    return c.json(body)
  },
)
