import 'dotenv/config'
import { Redis } from 'ioredis'
import { inArray, like, or } from 'drizzle-orm'
import {
  events,
  follows,
  pushSubscriptions,
  recapEmails,
  refreshTokens,
  sessionFiles,
  sessionLangs,
  sessions,
  streaks,
  teamInvites,
  teamMembers,
  teams,
  users,
} from '@commma/db'
import {
  LOADTEST_PREFIX,
  argBool,
  chunk,
  createLoadtestDb,
  isMainModule,
  listLoadtestUserIds,
  loadConfig,
  parseArgs,
  redactUrl,
} from './shared.js'

export interface TeardownResult {
  users: number
  sessions: number
  events: number
}

export async function runTeardown(confirm: boolean): Promise<TeardownResult> {
  const config = loadConfig()
  if (config.target === 'prod' && !confirm) {
    throw new Error(
      'refusing to tear down against prod without --confirm (LOADTEST_TARGET=prod)',
    )
  }

  const db = createLoadtestDb(config.databaseUrl)
  const ids = await listLoadtestUserIds(db)
  console.log(
    `[teardown] target=${config.target} db=${redactUrl(config.databaseUrl)} loadtestUsers=${ids.length}`,
  )
  if (ids.length === 0) {
    await db.$client.end()
    return { users: 0, sessions: 0, events: 0 }
  }

  let deletedEvents = 0
  for (const part of chunk(ids, 500)) {
    const removed = await db
      .delete(events)
      .where(inArray(events.userId, part))
      .returning({ id: events.id })
    deletedEvents += removed.length
  }

  let deletedSessions = 0
  for (let attempt = 0; attempt < 12; attempt++) {
    const live = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(inArray(sessions.userId, ids))
    if (live.length === 0) break
    const liveIds = live.map((row) => row.id)
    for (const part of chunk(liveIds, 500)) {
      await db.delete(sessionLangs).where(inArray(sessionLangs.sessionId, part))
      await db.delete(sessionFiles).where(inArray(sessionFiles.sessionId, part))
      await db.delete(sessions).where(inArray(sessions.id, part))
    }
    deletedSessions += liveIds.length
    await new Promise<void>((resolve) => setTimeout(resolve, 1000))
  }

  const ownedTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(inArray(teams.ownerId, ids))
  const teamIds = ownedTeams.map((row) => row.id)

  for (const part of chunk(ids, 500)) {
    await db.delete(streaks).where(inArray(streaks.userId, part))
    await db
      .delete(follows)
      .where(or(inArray(follows.followerId, part), inArray(follows.followeeId, part)))
    await db.delete(refreshTokens).where(inArray(refreshTokens.userId, part))
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.userId, part))
    await db.delete(recapEmails).where(inArray(recapEmails.userId, part))
    await db
      .delete(teamInvites)
      .where(or(inArray(teamInvites.inviteeId, part), inArray(teamInvites.invitedBy, part)))
    await db.delete(teamMembers).where(inArray(teamMembers.userId, part))
  }

  for (const part of chunk(teamIds, 500)) {
    await db.delete(teamInvites).where(inArray(teamInvites.teamId, part))
    await db.delete(teamMembers).where(inArray(teamMembers.teamId, part))
    await db.delete(teams).where(inArray(teams.id, part))
  }

  const deletedUsers = await db
    .delete(users)
    .where(like(users.handle, `${LOADTEST_PREFIX}%`))
    .returning({ id: users.id })
  await db.$client.end()

  if (config.redisUrl) {
    await cleanRedis(config.redisUrl, ids)
  }

  const result = {
    users: deletedUsers.length,
    sessions: deletedSessions,
    events: deletedEvents,
  }
  console.log(
    `[teardown] deleted users=${result.users} sessions=${result.sessions} events=${result.events}`,
  )
  return result
}

async function cleanRedis(url: string, ids: string[]): Promise<void> {
  const redis = new Redis(url, { maxRetriesPerRequest: 3 })
  try {
    const lbKeys = await redis.keys('leaderboard:*')
    for (const key of lbKeys) {
      for (const part of chunk(ids, 500)) {
        await redis.zrem(key, ...part)
      }
    }
    for (const part of chunk(ids.map((id) => `badges:v1:${id}`), 500)) {
      await redis.del(...part)
    }
    console.log(`[teardown] redis cleaned leaderboardKeys=${lbKeys.length}`)
  } finally {
    await redis.quit()
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  await runTeardown(argBool(args, 'confirm'))
}

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
