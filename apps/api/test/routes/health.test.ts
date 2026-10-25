import { createServer, type Server } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let deadDb: Server
let deadPort = 0

beforeAll(async () => {
  deadDb = createServer((socket) => socket.destroy())
  await new Promise<void>((resolve) => deadDb.listen(0, '127.0.0.1', resolve))
  const address = deadDb.address()
  deadPort = typeof address === 'object' && address ? address.port : 0
  process.env.DATABASE_URL = `postgres://commma:commma@127.0.0.1:${deadPort}/commma`
  process.env.REDIS_URL =
    process.env.TEST_REDIS_URL ?? 'redis://127.0.0.1:6379/9'
  process.env.GITHUB_CLIENT_ID = 'test-client'
  process.env.GITHUB_CLIENT_SECRET = 'test-secret'
  process.env.GITHUB_CALLBACK_URL = 'http://localhost:3000/v1/auth/github/callback'
  process.env.JWT_SECRET = 'test-jwt-secret'
  process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret'
  process.env.WEB_ORIGIN = 'http://localhost:5173'
  process.env.RUN_AGGREGATION = 'false'
})

afterAll(async () => {
  const { redis } = await import('../../src/redis.js')
  const { db } = await import('../../src/db.js')
  redis.disconnect()
  await db.$client.end({ timeout: 1 })
  await new Promise<void>((resolve) => deadDb.close(() => resolve()))
})

describe('health endpoints with Postgres unreachable', () => {
  it('keeps liveness green while readiness reports the database down', async () => {
    const { createApp } = await import('../../src/app.js')
    const app = createApp()

    const live = await app.request('/health')
    expect(live.status).toBe(200)
    expect(await live.json()).toMatchObject({ status: 'ok' })

    const liveAlias = await app.request('/health/live')
    expect(liveAlias.status).toBe(200)

    const ready = await app.request('/health/ready')
    expect(ready.status).toBe(503)
    expect(await ready.json()).toMatchObject({
      status: 'not_ready',
      db: 'down',
    })
  }, 15_000)

  it('answers CORS preflight only for the configured web origin', async () => {
    const { createApp } = await import('../../src/app.js')
    const app = createApp()
    const preflight = (origin: string) =>
      app.request('/v1/me', {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'GET',
        },
      })

    const allowed = await preflight('http://localhost:5173')
    expect(allowed.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:5173',
    )
    expect(allowed.headers.get('access-control-allow-credentials')).toBe(
      'true',
    )

    const foreign = await preflight('https://evil.example')
    expect(foreign.headers.get('access-control-allow-origin')).not.toBe(
      'https://evil.example',
    )
  })
})
