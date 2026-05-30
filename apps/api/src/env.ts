import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  REFRESH_TOKEN_SECRET: z.string().min(1),
  WEB_ORIGIN: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
})

export const env = envSchema.parse(process.env)
