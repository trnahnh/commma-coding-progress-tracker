import { Hono, type Context } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '../db.js'
import { redis } from '../redis.js'
import { createReadinessCheck, type Readiness } from '../lib/readiness.js'
import type { AppEnv } from '../types.js'

const PROBE_TIMEOUT_MS = 2000
const READY_OK_TTL_MS = 30_000
const READY_DOWN_TTL_MS = 5_000

const defaultReadiness = createReadinessCheck(
  {
    db: () => db.execute(sql`select 1`),
    cache: async () => {
      const pong = await redis.ping()
      if (pong !== 'PONG') throw new Error(`unexpected ping reply ${pong}`)
    },
  },
  {
    timeoutMs: PROBE_TIMEOUT_MS,
    okTtlMs: READY_OK_TTL_MS,
    downTtlMs: READY_DOWN_TTL_MS,
  },
)

export function createHealthRoutes(
  readiness: () => Promise<Readiness> = defaultReadiness,
) {
  const routes = new Hono<AppEnv>()

  const live = (c: Context<AppEnv>) => {
    c.header('Cache-Control', 'no-store')
    return c.json({ status: 'ok', ts: Date.now() })
  }

  routes.get('/', live)
  routes.get('/live', live)
  routes.get('/ready', async (c) => {
    const result = await readiness()
    c.header('Cache-Control', 'no-store')
    return c.json(
      {
        status: result.ready ? 'ready' : 'not_ready',
        db: result.db,
        cache: result.cache,
        checkedAt: result.checkedAt,
      },
      result.ready ? 200 : 503,
    )
  })

  return routes
}
