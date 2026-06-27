import 'dotenv/config'
import { count, inArray } from 'drizzle-orm'
import { events, sessions } from '@commma/db'
import {
  createLoadtestDb,
  isMainModule,
  listLoadtestUserIds,
  loadConfig,
  redactUrl,
} from './shared.js'

export interface LoadtestStatus {
  users: number
  sessions: number
  pendingEvents: number
}

export async function runStatus(): Promise<LoadtestStatus> {
  const config = loadConfig()
  const db = createLoadtestDb(config.databaseUrl)
  const ids = await listLoadtestUserIds(db)

  let sessionCount = 0
  let eventCount = 0
  if (ids.length > 0) {
    const [s] = await db
      .select({ value: count() })
      .from(sessions)
      .where(inArray(sessions.userId, ids))
    const [e] = await db
      .select({ value: count() })
      .from(events)
      .where(inArray(events.userId, ids))
    sessionCount = s?.value ?? 0
    eventCount = e?.value ?? 0
  }

  await db.$client.end()
  console.log(
    `[status] target=${config.target} db=${redactUrl(config.databaseUrl)} ` +
      `users=${ids.length} sessions=${sessionCount} pendingEvents=${eventCount}`,
  )
  return { users: ids.length, sessions: sessionCount, pendingEvents: eventCount }
}

async function main(): Promise<void> {
  await runStatus()
}

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
