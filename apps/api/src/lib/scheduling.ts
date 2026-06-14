import { redis } from '../redis.js'
import { log } from '../logger.js'

export async function acquireLeader(name: string, ttlMs: number): Promise<boolean> {
  try {
    const res = await redis.set(
      `leader:${name}`,
      String(process.pid),
      'PX',
      ttlMs,
      'NX',
    )
    return res === 'OK'
  } catch (err) {
    log.error('leader_lock_error', {
      name,
      message: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

export async function acquireLock(key: string, ttlMs: number): Promise<boolean> {
  try {
    const res = await redis.set(key, '1', 'PX', ttlMs, 'NX')
    return res === 'OK'
  } catch {
    return false
  }
}

export async function releaseLock(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch {
    return
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
