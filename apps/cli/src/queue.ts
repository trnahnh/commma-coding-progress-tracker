import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import {
  heartbeatEventSchema,
  type HeartbeatEvent,
} from '@commma/shared'
import { z } from 'zod'
import type { QueueStore } from './client.js'
import { queuePath } from './config.js'

const queueSchema = z.array(heartbeatEventSchema)

export class FileQueueStore implements QueueStore {
  load(): HeartbeatEvent[] {
    const path = queuePath()
    if (!existsSync(path)) return []
    try {
      const parsed = queueSchema.safeParse(JSON.parse(readFileSync(path, 'utf8')))
      return parsed.success ? parsed.data : []
    } catch {
      return []
    }
  }

  save(events: HeartbeatEvent[]): void {
    try {
      writeFileSync(queuePath(), JSON.stringify(events))
    } catch {
      void 0
    }
  }
}
