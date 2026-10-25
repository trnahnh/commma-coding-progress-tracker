import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  clock: 0,
  store: new Map<string, { value: string; expiresAt: number }>(),
  rows: new Map<string, string>(),
  dbReads: 0,
  gate: null as Promise<void> | null,
}))

vi.mock('../../src/redis.js', () => ({
  redis: {
    get: async (key: string) => {
      const entry = state.store.get(key)
      if (!entry || entry.expiresAt <= state.clock) return null
      return entry.value
    },
    set: async (key: string, value: string, ...args: (string | number)[]) => {
      const ttlIndex = args.indexOf('EX')
      const ttlS = ttlIndex >= 0 ? Number(args[ttlIndex + 1]) : Infinity
      const existing = state.store.get(key)
      const live = existing && existing.expiresAt > state.clock
      if (args.includes('NX') && live) return null
      state.store.set(key, { value, expiresAt: state.clock + ttlS * 1000 })
      return 'OK'
    },
    del: async (key: string) => (state.store.delete(key) ? 1 : 0),
  },
}))

vi.mock('../../src/db.js', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            state.dbReads += 1
            const privacy = state.rows.get('u1')
            if (state.gate) await state.gate
            return privacy === undefined ? [] : [{ privacy }]
          },
        }),
      }),
    }),
  },
}))

const { getPrivacyMode, invalidatePrivacyMode } = await import(
  '../../src/lib/privacyCache.js'
)

function deferred() {
  let release = () => undefined as void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

async function staleWindowMs(expected: string | null): Promise<number> {
  const start = state.clock
  for (let t = 0; t <= 120_000; t += 1000) {
    state.clock = start + t
    if ((await getPrivacyMode('u1')) === expected) return t
  }
  return Infinity
}

beforeEach(() => {
  state.clock = 0
  state.store.clear()
  state.rows.clear()
  state.dbReads = 0
  state.gate = null
})

describe('privacy mode cache', () => {
  it('serves repeat reads from cache after the first miss', async () => {
    state.rows.set('u1', 'full')
    await getPrivacyMode('u1')
    await getPrivacyMode('u1')
    await getPrivacyMode('u1')
    expect(state.dbReads).toBe(1)
  })

  it('reflects a privacy change on the very next read', async () => {
    state.rows.set('u1', 'full')
    expect(await getPrivacyMode('u1')).toBe('full')
    state.rows.set('u1', 'off')
    await invalidatePrivacyMode('u1', 'off')
    expect(await getPrivacyMode('u1')).toBe('off')
  })

  it('reflects account deletion on the very next read', async () => {
    state.rows.set('u1', 'full')
    expect(await getPrivacyMode('u1')).toBe('full')
    state.rows.delete('u1')
    await invalidatePrivacyMode('u1', null)
    expect(await getPrivacyMode('u1')).toBeNull()
  })

  it('does not let an in-flight read re-cache the old mode after a change', async () => {
    state.rows.set('u1', 'full')
    const gate = deferred()
    state.gate = gate.promise
    const inFlight = getPrivacyMode('u1')
    await vi.waitFor(() => expect(state.dbReads).toBe(1))

    state.rows.set('u1', 'off')
    await invalidatePrivacyMode('u1', 'off')
    state.gate = null
    gate.release()
    expect(await inFlight).toBe('full')

    const window = await staleWindowMs('off')
    process.stdout.write(`PRIVACY_CACHE_STALE_WINDOW_MS change=${window}\n`)
    expect(window).toBe(0)
  })

  it('does not let an in-flight read re-cache a deleted account', async () => {
    state.rows.set('u1', 'full')
    const gate = deferred()
    state.gate = gate.promise
    const inFlight = getPrivacyMode('u1')
    await vi.waitFor(() => expect(state.dbReads).toBe(1))

    state.rows.delete('u1')
    await invalidatePrivacyMode('u1', null)
    state.gate = null
    gate.release()
    await inFlight

    const window = await staleWindowMs(null)
    process.stdout.write(`PRIVACY_CACHE_STALE_WINDOW_MS delete=${window}\n`)
    expect(window).toBe(0)
  })
})
