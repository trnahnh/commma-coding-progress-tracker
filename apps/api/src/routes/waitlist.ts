import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { waitlist } from '@commma/db'
import { db } from '../db.js'
import { apiError } from '../lib/errors.js'
import { isEmailEnabled, sendEmail } from '../lib/email.js'
import { composeWaitlistEmail } from '../lib/waitlistEmail.js'
import { log } from '../logger.js'
import { ipKey, rateLimit } from '../middleware/rateLimit.js'
import type { AppEnv } from '../types.js'

const signupSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    source: z.string().trim().max(64).optional(),
  })
  .strict()

export const waitlistRoutes = new Hono<AppEnv>()

waitlistRoutes.post(
  '/',
  rateLimit({
    scope: 'waitlist',
    limit: 10,
    windowS: 3600,
    key: ipKey,
    failClosed: true,
  }),
  zValidator('json', signupSchema, (result, c) => {
    if (!result.success) {
      return apiError(
        c,
        'VALIDATION_ERROR',
        'Enter a valid email address',
        result.error.issues,
      )
    }
  }),
  async (c) => {
    const { email, source } = c.req.valid('json')
    const inserted = await db
      .insert(waitlist)
      .values({ email, source })
      .onConflictDoNothing({ target: waitlist.email })
      .returning({ id: waitlist.id })

    if (inserted.length > 0 && isEmailEnabled()) {
      try {
        const message = composeWaitlistEmail()
        await sendEmail({ to: email, ...message })
      } catch (err) {
        log.error('waitlist_email_failed', {
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return c.json({ ok: true }, 201)
  },
)
