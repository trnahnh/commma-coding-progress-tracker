import 'dotenv/config'
import { users } from '@commma/db'
import {
  LOADTEST_EMAIL_DOMAIN,
  LOADTEST_PREFIX,
  argInt,
  chunk,
  createLoadtestDb,
  isMainModule,
  listLoadtestUserIds,
  loadConfig,
  parseArgs,
  redactUrl,
} from './shared.js'

export interface SeedResult {
  requested: number
  inserted: number
  total: number
}

export async function runSeed(count: number): Promise<SeedResult> {
  const config = loadConfig()
  const db = createLoadtestDb(config.databaseUrl)
  console.log(
    `[seed] target=${config.target} db=${redactUrl(config.databaseUrl)} users=${count}`,
  )

  const rows = Array.from({ length: count }, (_, i) => {
    const suffix = String(i).padStart(5, '0')
    const handle = `${LOADTEST_PREFIX}${suffix}`
    return {
      handle,
      email: `${handle}@${LOADTEST_EMAIL_DOMAIN}`,
      githubId: `${LOADTEST_PREFIX}gh-${suffix}`,
      privacy: 'full',
    }
  })

  let inserted = 0
  for (const part of chunk(rows, 500)) {
    const result = await db
      .insert(users)
      .values(part)
      .onConflictDoNothing()
      .returning({ id: users.id })
    inserted += result.length
  }

  const total = (await listLoadtestUserIds(db)).length
  await db.$client.end()
  console.log(`[seed] inserted=${inserted} totalLoadtestUsers=${total}`)
  return { requested: count, inserted, total }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  await runSeed(argInt(args, 'users', 700))
}

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
