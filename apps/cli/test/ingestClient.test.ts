import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HeartbeatEvent } from '@commma/shared'
import { IngestClient, type QueueStore } from '../src/client.js'
import type { Auth } from '../src/auth.js'

const API = 'https://api.test'

function makeEvent(id: string): HeartbeatEvent {
  return { id, ts: 1_700_000_000_000, lang: 'ts', keystrokes: 1, lines: 0 }
}

function makeStore(initial: HeartbeatEvent[] = []) {
  let saved = initial
  return {
    store: {
      load: () => saved,
      save: (events: HeartbeatEvent[]) => {
        saved = events
      },
    } satisfies QueueStore,
    current: () => saved,
  }
}

const auth = {
  getAccessToken: async () => 'token',
  refresh: async () => 'token',
} as unknown as Auth

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('IngestClient', () => {
  it('posts to the configured API base url', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }))
    const { store } = makeStore()
    const client = new IngestClient(auth, API, store)

    await client.send([makeEvent('a')])
    const [url] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe(`${API}/v1/ingest`)
  })

  it('drains the buffer and clears the store on success', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }))
    const { store, current } = makeStore()
    const client = new IngestClient(auth, API, store)

    expect(await client.send([makeEvent('a'), makeEvent('b')])).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(current()).toEqual([])
  })

  it('persists unsent events when the network fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    const { store, current } = makeStore()
    const client = new IngestClient(auth, API, store)

    expect(await client.send([makeEvent('a')])).toBe(false)
    expect(current()).toEqual([makeEvent('a')])
  })

  it('backs off after a failure and does not hit the network again', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    let clock = 0
    const { store } = makeStore()
    const client = new IngestClient(auth, API, store, () => clock)

    expect(await client.send([makeEvent('a')])).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    clock += 30_000
    expect(await client.send([makeEvent('b')])).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries once the backoff window elapses and replays queued events', async () => {
    let clock = 0
    const { store } = makeStore()
    const client = new IngestClient(auth, API, store, () => clock)

    fetchMock.mockRejectedValueOnce(new Error('offline'))
    expect(await client.send([makeEvent('a')])).toBe(false)

    clock += 60_000
    let body: unknown
    fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      body = JSON.parse(init.body as string)
      return new Response(null, { status: 202 })
    })
    expect(await client.send([makeEvent('b')])).toBe(true)
    expect(body).toEqual({ events: [makeEvent('a'), makeEvent('b')] })
  })

  it('resumes a queue persisted by a previous session', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }))
    const { store, current } = makeStore([makeEvent('old')])
    const client = new IngestClient(auth, API, store)

    expect(await client.send([])).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(current()).toEqual([])
  })

  it('drops a rejected batch instead of looping on it forever', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 400 }))
    const { store, current } = makeStore()
    const client = new IngestClient(auth, API, store)

    expect(await client.send([makeEvent('bad')])).toBe(true)
    expect(current()).toEqual([])
  })

  it('splits a 413 batch into smaller chunks and retries', async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const { events } = JSON.parse(init.body as string)
      return events.length > 1
        ? new Response(null, { status: 413 })
        : new Response(null, { status: 202 })
    })
    const { store, current } = makeStore()
    const client = new IngestClient(auth, API, store)

    expect(await client.send([makeEvent('a'), makeEvent('b')])).toBe(true)
    expect(current()).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('refreshes the token on 401 and retries', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
    const { store } = makeStore()
    const client = new IngestClient(auth, API, store)

    expect(await client.send([makeEvent('a')])).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
