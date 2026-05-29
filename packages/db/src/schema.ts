import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export type KeyFreq = Record<string, number>

export interface KeyboardHeatmap {
  counts: Record<string, number>
  freq: Record<string, number>
  total: number
}

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  handle: text('handle').notNull().unique(),
  email: text('email').notNull().unique(),
  githubId: text('github_id').notNull().unique(),
  avatarUrl: text('avatar_url'),
  privacy: text('privacy').notNull().default('full'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const events = pgTable(
  'events',
  {
    id: uuid('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    ts: timestamp('ts', { withTimezone: true }).notNull(),
    lang: text('lang'),
    file: text('file'),
    project: text('project'),
    keystrokes: integer('keystrokes').notNull().default(0),
    lines: integer('lines').notNull().default(0),
    keyFreq: jsonb('key_freq').$type<KeyFreq>(),
    processed: boolean('processed').notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.ts] }),
    index('events_user_unprocessed')
      .on(t.userId, t.ts)
      .where(sql`${t.processed} = false`),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
    durationS: integer('duration_s').notNull(),
    linesDelta: integer('lines_delta').notNull().default(0),
    paceCpm: integer('pace_cpm'),
    peakCpm: integer('peak_cpm'),
    peakAt: timestamp('peak_at', { withTimezone: true }),
    keyboardHeatmap: jsonb('keyboard_heatmap').$type<KeyboardHeatmap>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('sessions_user_started').on(t.userId, t.startedAt.desc())],
)

export const sessionLangs = pgTable(
  'session_langs',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id),
    lang: text('lang').notNull(),
    durationS: integer('duration_s').notNull(),
    pct: numeric('pct', { precision: 5, scale: 2 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.lang] })],
)

export const sessionFiles = pgTable(
  'session_files',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id),
    path: text('path').notNull(),
    changes: integer('changes').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.path] })],
)

export const streaks = pgTable('streaks', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  currentDays: integer('current_days').notNull().default(0),
  longestDays: integer('longest_days').notNull().default(0),
  lastActiveDate: date('last_active_date'),
})

export const follows = pgTable(
  'follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id),
    followeeId: uuid('followee_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followeeId] }),
    index('follows_followee').on(t.followeeId),
  ],
)
