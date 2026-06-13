import { and, eq, gte, inArray, lt, or, sql } from 'drizzle-orm'
import { recapEmails, sessions, users } from '@commma/db'
import { db } from '../db.js'
import { isEmailEnabled, sendEmail } from '../lib/email.js'
import { isRecapAIEnabled } from '../lib/openai.js'
import { log } from '../logger.js'
import { buildRecapStats } from './aggregate.js'
import { composeRecapEmail } from './compose.js'
import { aiProse, defaultProse, type RecapProse } from './prose.js'
import { lastCompletedWeek, priorWeekOf, type RecapWindow } from './week.js'

const MAX_ATTEMPTS = 3
const CONCURRENCY = 5

interface Recipient {
  id: string
  handle: string
  displayName: string | null
  email: string
}

function recipientName(recipient: Recipient): string {
  const display = recipient.displayName?.trim()
  return display ? display : `@${recipient.handle}`
}

async function eligibleRecipients(window: RecapWindow): Promise<Recipient[]> {
  const candidates = await db
    .selectDistinct({
      id: users.id,
      handle: users.handle,
      displayName: users.displayName,
      email: users.email,
    })
    .from(users)
    .innerJoin(sessions, eq(sessions.userId, users.id))
    .where(
      and(
        inArray(users.plan, ['pro', 'team']),
        gte(sessions.startedAt, window.start),
        lt(sessions.startedAt, window.end),
      ),
    )

  if (candidates.length === 0) return []

  const blocked = await db
    .select({ userId: recapEmails.userId })
    .from(recapEmails)
    .where(
      and(
        eq(recapEmails.weekStart, window.weekStart),
        or(
          eq(recapEmails.status, 'sent'),
          gte(recapEmails.attempts, MAX_ATTEMPTS),
        ),
      ),
    )

  const blockedIds = new Set(blocked.map((b) => b.userId))
  return candidates.filter((c) => !blockedIds.has(c.id))
}

async function resolveProse(
  recipient: Recipient,
  stats: Parameters<typeof composeRecapEmail>[0],
): Promise<RecapProse> {
  const name = recipientName(recipient)
  if (!isRecapAIEnabled()) return defaultProse(stats, name)
  try {
    return await aiProse(stats, name)
  } catch {
    return defaultProse(stats, name)
  }
}

async function recordOutcome(
  userId: string,
  weekStart: string,
  status: 'sent' | 'failed',
  lastError: string | null,
): Promise<void> {
  await db
    .insert(recapEmails)
    .values({ userId, weekStart, status, attempts: 1, lastError })
    .onConflictDoUpdate({
      target: [recapEmails.userId, recapEmails.weekStart],
      set: {
        status,
        attempts: sql`${recapEmails.attempts} + 1`,
        lastError,
        updatedAt: new Date(),
      },
    })
}

async function processRecipient(
  recipient: Recipient,
  window: RecapWindow,
  priorWindow: RecapWindow,
): Promise<'sent' | 'failed'> {
  try {
    const stats = await buildRecapStats(recipient.id, window, priorWindow)
    const prose = await resolveProse(recipient, stats)
    const email = composeRecapEmail(stats, prose)
    const result = await sendEmail({
      to: recipient.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })
    await recordOutcome(
      recipient.id,
      window.weekStart,
      result,
      result === 'failed' ? 'send_failed' : null,
    )
    return result
  } catch (err) {
    await recordOutcome(
      recipient.id,
      window.weekStart,
      'failed',
      err instanceof Error ? err.message : String(err),
    )
    return 'failed'
  }
}

export async function runRecapTick(now: Date): Promise<void> {
  if (!isEmailEnabled()) return

  const window = lastCompletedWeek(now)
  const priorWindow = priorWeekOf(window)
  const recipients = await eligibleRecipients(window)
  if (recipients.length === 0) return

  let sent = 0
  let failed = 0
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const chunk = recipients.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      chunk.map((r) => processRecipient(r, window, priorWindow)),
    )
    for (const r of results) r === 'sent' ? sent++ : failed++
  }

  log.info('recap_emails_processed', { weekStart: window.weekStart, sent, failed })
}
