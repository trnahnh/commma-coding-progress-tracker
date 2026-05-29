import { resolve } from 'node:path'
import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: resolve(process.cwd(), '../../apps/api/.env') })

const url =
  process.env.DATABASE_URL ?? 'postgresql://commma:commma@localhost:5432/commma'

export default defineConfig({
  schema: './src/schema.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
