import { createDb } from '@commma/db'
import { env } from './env.js'

export const db = createDb(env.DATABASE_URL)
