import type { HeartbeatEvent } from '@commma/shared'
import type { Auth } from './auth.js'
import { getApiBaseUrl } from './privacy.js'

const MAX_BATCH = 500
const MAX_BUFFER_EVENTS = 5000
const BACKOFF_BASE_MS = 60 * 1000
const BACKOFF_MAX_MS = 15 * 60 * 1000
const REQUEST_TIMEOUT_MS = 15 * 1000

type PostResult = 'ok' | 'retry' | 'drop' | 'too_large'

export interface QueueStore {
  load(): HeartbeatEvent[]
  save(events: HeartbeatEvent[]): void | PromiseLike<void>
}

export class IngestClient {
  private buffer: HeartbeatEvent[]
  private failures = 0
  private nextAttemptAt = 0
  private sending = false

  constructor(
    private readonly auth: Auth,
    private readonly store?: QueueStore,
    private readonly now: () => number = Date.now,
  ) {
    this.buffer = store?.load() ?? []
  }

  async send(events: HeartbeatEvent[]): Promise<boolean> {
    this.enqueue(events)
    if (this.buffer.length === 0) return true
    if (this.now() < this.nextAttemptAt) return false
    if (this.sending) return false

    this.sending = true
    try {
      const token = await this.auth.getAccessToken()
      if (!token) return this.fail()
      return await this.drain(token)
    } finally {
      this.sending = false
    }
  }

  private async drain(token: string): Promise<boolean> {
    let chunkSize = MAX_BATCH
    while (this.buffer.length > 0) {
      const chunk = this.buffer.slice(0, chunkSize)
      const result = await this.post(chunk, token)

      if (result === 'retry') {
        await this.persist()
        return this.fail()
      }
      if (result === 'too_large') {
        if (chunk.length <= 1) {
          this.buffer = this.buffer.slice(1)
          await this.persist()
          chunkSize = MAX_BATCH
          continue
        }
        chunkSize = Math.floor(chunk.length / 2)
        continue
      }

      this.buffer = this.buffer.slice(chunk.length)
      await this.persist()
    }
    return this.succeed()
  }

  private enqueue(events: HeartbeatEvent[]): void {
    if (events.length === 0) return
    this.buffer = [...this.buffer, ...events].slice(-MAX_BUFFER_EVENTS)
    void this.persist()
  }

  private succeed(): boolean {
    this.failures = 0
    this.nextAttemptAt = 0
    return true
  }

  private fail(): boolean {
    this.failures += 1
    const delay = Math.min(
      BACKOFF_BASE_MS * 2 ** (this.failures - 1),
      BACKOFF_MAX_MS,
    )
    this.nextAttemptAt = this.now() + delay
    return false
  }

  private async persist(): Promise<void> {
    await this.store?.save(this.buffer)
  }

  private async post(
    events: HeartbeatEvent[],
    token: string,
  ): Promise<PostResult> {
    let res: Response
    try {
      res = await fetch(`${getApiBaseUrl()}/v1/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ events }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch {
      return 'retry'
    }

    if (res.status === 401) {
      const refreshed = await this.auth.refresh()
      if (!refreshed) return 'retry'
      return this.post(events, refreshed)
    }
    if (res.ok) return 'ok'
    if (res.status === 413) return 'too_large'
    if (res.status === 429 || res.status >= 500) return 'retry'
    return 'drop'
  }
}
