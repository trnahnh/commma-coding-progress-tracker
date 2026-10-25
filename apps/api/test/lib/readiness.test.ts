import { describe, expect, it, vi } from 'vitest'
import { createReadinessCheck } from '../../src/lib/readiness.js'

const options = { timeoutMs: 50, okTtlMs: 30_000, downTtlMs: 5_000 }

describe('createReadinessCheck', () => {
  it('reports ready when both probes succeed', async () => {
    const check = createReadinessCheck(
      { db: async () => 1, cache: async () => 'PONG' },
      options,
    )
    expect(await check()).toMatchObject({ ready: true, db: 'ok', cache: 'ok' })
  })

  it('reports not ready with db down when the db probe rejects', async () => {
    const check = createReadinessCheck(
      {
        db: async () => {
          throw new Error('Your project has exceeded the compute time quota')
        },
        cache: async () => 'PONG',
      },
      options,
    )
    expect(await check()).toMatchObject({
      ready: false,
      db: 'down',
      cache: 'ok',
    })
  })

  it('reports db down when the db probe hangs past the timeout', async () => {
    const check = createReadinessCheck(
      { db: () => new Promise(() => undefined), cache: async () => 'PONG' },
      options,
    )
    const started = Date.now()
    const result = await check()
    expect(result).toMatchObject({ ready: false, db: 'down' })
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('collapses a burst of concurrent checks into one probe per backend', async () => {
    const db = vi.fn(async () => 1)
    const cache = vi.fn(async () => 'PONG')
    const check = createReadinessCheck({ db, cache }, options)
    const results = await Promise.all(
      Array.from({ length: 100 }, () => check()),
    )
    expect(results.every((r) => r.ready)).toBe(true)
    expect(db).toHaveBeenCalledTimes(1)
    expect(cache).toHaveBeenCalledTimes(1)
  })

  it('serves cached results within the ttl and re-probes after it', async () => {
    let clock = 0
    const db = vi.fn(async () => 1)
    const check = createReadinessCheck(
      { db, cache: async () => 'PONG' },
      { ...options, now: () => clock },
    )
    await check()
    clock = 29_999
    await check()
    expect(db).toHaveBeenCalledTimes(1)
    clock = 30_000
    await check()
    expect(db).toHaveBeenCalledTimes(2)
  })

  it('re-probes a down result sooner than an ok result', async () => {
    let clock = 0
    let healthy = false
    const db = vi.fn(async () => {
      if (!healthy) throw new Error('down')
    })
    const check = createReadinessCheck(
      { db, cache: async () => 'PONG' },
      { ...options, now: () => clock },
    )
    expect((await check()).ready).toBe(false)
    healthy = true
    clock = 5_000
    expect((await check()).ready).toBe(true)
    expect(db).toHaveBeenCalledTimes(2)
  })
})
