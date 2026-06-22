import { Hono } from 'hono'
import { eq, inArray, or } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  events,
  follows,
  pushSubscriptions,
  recapEmails,
  refreshTokens,
  sessionFiles,
  sessionLangs,
  sessions,
  streaks,
  teamInvites,
  teamMembers,
  teams,
  users,
} from '@commma/db'
import { db } from '../db.js'
import { env } from '../env.js'
import { apiError } from '../lib/errors.js'
import { log } from '../logger.js'
import { stripe } from '../lib/stripe.js'
import { removeLeaderboardUser } from '../aggregate/leaderboard.js'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit, userKey } from '../middleware/rateLimit.js'
import type { AppEnv } from '../types.js'

export const meRoutes = new Hono<AppEnv>()

function httpUrl(max: number) {
  return z
    .string()
    .trim()
    .url()
    .max(max)
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol
        return protocol === 'http:' || protocol === 'https:'
      } catch {
        return false
      }
    }, 'Must be an http or https URL')
}

const patchMeSchema = z
  .object({
    display_name: z.string().max(64).nullable().optional(),
    bio: z.string().max(160).nullable().optional(),
    website: z.union([httpUrl(256), z.null()]).optional(),
    location: z.string().max(64).nullable().optional(),
    school: z.string().max(128).nullable().optional(),
    field_of_study: z.string().max(64).nullable().optional(),
    company: z.string().max(128).nullable().optional(),
    job_title: z.string().max(64).nullable().optional(),
    pronouns: z.string().max(32).nullable().optional(),
    linkedin: z.union([httpUrl(160), z.null()]).optional(),
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
    billing_enabled: !env.FREE_MODE,
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

meRoutes.delete(
  '/',
  requireAuth,
  rateLimit({ scope: 'write', limit: 300, windowS: 3600, key: userKey }),
  async (c) => {
    const userId = c.get('userId')

    const rows = await db
      .select({ subscriptionId: users.stripeSubscriptionId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!rows[0]) return apiError(c, 'NOT_FOUND', 'User not found')

    const subscriptionId = rows[0].subscriptionId
    if (subscriptionId && stripe) {
      try {
        await stripe.subscriptions.cancel(subscriptionId)
      } catch (err) {
        log.error('account_delete_stripe_cancel_error', {
          message: err instanceof Error ? err.message : String(err),
        })
      }
    }

    const ownedTeams = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.ownerId, userId))
    const ownedTeamIds = ownedTeams.map((t) => t.id)

    await db.transaction(async (tx) => {
      await tx.delete(sessionLangs).where(
        inArray(
          sessionLangs.sessionId,
          tx
            .select({ id: sessions.id })
            .from(sessions)
            .where(eq(sessions.userId, userId)),
        ),
      )
      await tx.delete(sessionFiles).where(
        inArray(
          sessionFiles.sessionId,
          tx
            .select({ id: sessions.id })
            .from(sessions)
            .where(eq(sessions.userId, userId)),
        ),
      )
      await tx.delete(sessions).where(eq(sessions.userId, userId))
      await tx.delete(events).where(eq(events.userId, userId))
      await tx
        .delete(follows)
        .where(or(eq(follows.followerId, userId), eq(follows.followeeId, userId)))
      await tx
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId))
      await tx.delete(recapEmails).where(eq(recapEmails.userId, userId))
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
      await tx.delete(streaks).where(eq(streaks.userId, userId))
      await tx
        .delete(teamInvites)
        .where(
          or(
            eq(teamInvites.inviteeId, userId),
            eq(teamInvites.invitedBy, userId),
          ),
        )
      await tx.delete(teamMembers).where(eq(teamMembers.userId, userId))
      if (ownedTeamIds.length > 0) {
        await tx
          .delete(teamInvites)
          .where(inArray(teamInvites.teamId, ownedTeamIds))
        await tx
          .delete(teamMembers)
          .where(inArray(teamMembers.teamId, ownedTeamIds))
        await tx.delete(teams).where(inArray(teams.id, ownedTeamIds))
      }
      await tx.delete(users).where(eq(users.id, userId))
    })

    try {
      await removeLeaderboardUser(userId, new Date())
    } catch (err) {
      log.error('account_delete_leaderboard_error', {
        message: err instanceof Error ? err.message : String(err),
      })
    }

    log.info('account_deleted', { userId })
    return c.body(null, 204)
  },
)
