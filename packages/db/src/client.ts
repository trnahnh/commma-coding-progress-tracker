import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

export interface CreateDbOptions {
  max?: number
}

export function createDb(connectionString: string, options: CreateDbOptions = {}) {
  const client = postgres(connectionString, { max: options.max ?? 10 })
  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof createDb>
