import { resolve } from 'node:path'
import { config } from 'dotenv'
import postgres from 'postgres'

config({ path: resolve(process.cwd(), '../../apps/api/.env'), quiet: true })

const url = process.env.DATABASE_URL
if (!url) {
  process.stderr.write('db preflight: DATABASE_URL is not set\n')
  process.exit(1)
}

const sql = postgres(url, { max: 1, connect_timeout: 10, onnotice: () => {} })
const started = Date.now()
try {
  const [row] = await sql`select current_database() as db, version() as version`
  process.stdout.write(
    `db preflight: ok db=${row.db} ms=${Date.now() - started} ${row.version.split(' on ')[0]}\n`,
  )
  await sql.end({ timeout: 5 })
} catch (err) {
  const code = err && typeof err === 'object' && 'code' in err ? err.code : 'unknown'
  const nested =
    err instanceof AggregateError
      ? err.errors.map((e) => (e instanceof Error ? e.message : String(e)))
      : []
  const message =
    (err instanceof Error && err.message) || nested.join('; ') || String(err)
  process.stderr.write(`db preflight: FAILED code=${code} message=${message}\n`)
  await sql.end({ timeout: 1 }).catch(() => {})
  process.exit(1)
}
