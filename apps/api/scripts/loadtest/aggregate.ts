import 'dotenv/config'
import { runAggregation } from '../../src/aggregate/run.js'
import type { AggregationStats } from '../../src/aggregate/run.js'
import { closeDb } from '../../src/db.js'
import { redis } from '../../src/redis.js'
import { isMainModule } from './shared.js'

export async function runAggregateOnce(): Promise<AggregationStats> {
  console.log('[aggregate] running one pass against the configured DB/Redis...')
  const stats = await runAggregation()
  console.log(`[aggregate] ${JSON.stringify(stats)}`)
  return stats
}

async function main(): Promise<void> {
  try {
    await runAggregateOnce()
  } finally {
    await redis.quit()
    await closeDb()
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
