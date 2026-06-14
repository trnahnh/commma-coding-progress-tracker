import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { streaks, users } from '@commma/db'
import { db } from '../db.js'
import { apiError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit, userKey } from '../middleware/rateLimit.js'
import type { AppEnv } from '../types.js'

export const meRoutes = new Hono<AppEnv>()

const patchMeSchema = z
  .object({
    display_name: z.string().max(64).nullable().optional(),
    bio: z.string().max(160).nullable().optional(),
    website: z.union([z.string().url().max(256), z.null()]).optional(),
    location: z.string().max(64).nullable().optional(),
    school: z.string().max(128).nullable().optional(),
    field_of_study: z.string().max(64).nullable().optional(),
    company: z.string().max(128).nullable().optional(),
    job_title: z.string().max(64).nullable().optional(),
    pronouns: z.string().max(32).nullable().optional(),
    linkedin: z.union([z.string().url().max(160), z.null()]).optional(),
    open_to_work: z.boolean().optional(),
    privacy: z.enum(['full', 'summary', 'off']).optional(),
  })
  .strict()

type UserRow = typeof users.$inferSelect
type StreakRow = typeof streaks.$inferSelect

function meJson(u: UserRow, s: StreakRow | undefined) {
  return {
    id: u.id,
    handle: u.handle,
    email: u.email,
    avatar_url: u.avatarUrl,
    plan: u.plan,
    privacy: u.privacy,
    display_name: u.displayName,
    bio: u.bio,
    website: u.website,
    location: u.location,
    school: u.school,
    field_of_study: u.fieldOfStudy,
    company: u.company,
    job_title: u.jobTitle,
    pronouns: u.pronouns,
    linkedin: u.linkedin,
    open_to_work: u.openToWork,
    created_at: u.createdAt,
    streak: {
      current_days: s?.currentDays ?? 0,
      longest_days: s?.longestDays ?? 0,
      last_active_date: s?.lastActiveDate ?? null,
    },
  }
}

meRoutes.get(
  '/',
  requireAuth,
  rateLimit({ scope: 'read', limit: 300, windowS: 3600, key: userKey }),
  async (c) => {
    const userId = c.get('userId')
    const rows = await db
      .select()
      .from(users)
      .leftJoin(streaks, eq(streaks.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1)

    const row = rows[0]
    if (!row) return apiError(c, 'NOT_FOUND', 'User not found')

    return c.json(meJson(row.users, row.streaks ?? undefined))
  },
)

meRoutes.patch(
  '/',
  requireAuth,
  rateLimit({ scope: 'write', limit: 300, windowS: 3600, key: userKey }),
  zValidator('json', patchMeSchema, (result, c) => {
    if (!result.success)
      return apiError(
        c,
        'VALIDATION_ERROR',
        'Invalid profile data',
        result.error.issues,
      )
  }),
  async (c) => {
    const userId = c.get('userId')
    const data = c.req.valid('json')

    const updated = await db
      .update(users)
      .set({
        ...(data.display_name !== undefined && { displayName: data.display_name }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.school !== undefined && { school: data.school }),
        ...(data.field_of_study !== undefined && {
          fieldOfStudy: data.field_of_study,
        }),
        ...(data.company !== undefined && { company: data.company }),
        ...(data.job_title !== undefined && { jobTitle: data.job_title }),
        ...(data.pronouns !== undefined && { pronouns: data.pronouns }),
        ...(data.linkedin !== undefined && { linkedin: data.linkedin }),
        ...(data.open_to_work !== undefined && {
          openToWork: data.open_to_work,
        }),
        ...(data.privacy !== undefined && { privacy: data.privacy }),
      })
      .where(eq(users.id, userId))
      .returning()

    const u = updated[0]
    if (!u) return apiError(c, 'NOT_FOUND', 'User not found')

    const streakRows = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId))
      .limit(1)

    return c.json(meJson(u, streakRows[0]))
  },
)
