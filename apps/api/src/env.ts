import 'dotenv/config'
import { z } from 'zod'

const optionalSecret = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().min(1).optional(),
)

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  REFRESH_TOKEN_SECRET: z.string().min(1),
  WEB_ORIGIN: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
  RUN_AGGREGATION: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(0),
  FREE_MODE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  STRIPE_SECRET_KEY: optionalSecret,
  STRIPE_WEBHOOK_SECRET: optionalSecret,
  STRIPE_PRICE_PRO_MONTHLY: optionalSecret,
  STRIPE_PRICE_PRO_YEARLY: optionalSecret,
  STRIPE_PRICE_TEAM_MONTHLY: optionalSecret,
  STRIPE_PRICE_TEAM_YEARLY: optionalSecret,
  VAPID_PUBLIC_KEY: optionalSecret,
  VAPID_PRIVATE_KEY: optionalSecret,
  VAPID_SUBJECT: optionalSecret,
  RESEND_API_KEY: optionalSecret,
  RECAP_FROM_EMAIL: optionalSecret,
  OPENAI_API_KEY: optionalSecret,
  RECAP_SEND_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(13),
  PUSH_REMINDER_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(17),
})

export const env = envSchema.parse(process.env)
