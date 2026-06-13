import { z } from 'zod'
import { openai, RECAP_MODEL } from '../lib/openai.js'
import type { RecapStats } from './aggregate.js'
import { formatDuration, weekOverWeekPct } from './format.js'

export const recapProseSchema = z.object({
  headline: z.string().trim().min(1).max(120),
  note: z.string().trim().min(1).max(400),
})

export type RecapProse = z.infer<typeof recapProseSchema>

export function defaultProse(stats: RecapStats, name: string): RecapProse {
  const total = formatDuration(stats.totalDurationS)
  const delta = weekOverWeekPct(stats.totalDurationS, stats.priorWeekDurationS)

  const headline =
    stats.sessionCount === 1
      ? `One session, ${total} on the board`
      : `${stats.sessionCount} sessions, ${total} this week`

  const trend =
    delta === null
      ? 'Fresh week on the clock.'
      : delta > 0
        ? `Up ${delta}% on last week — momentum is yours.`
        : delta < 0
          ? `Down ${Math.abs(delta)}% on last week — time to reclaim the pace.`
          : 'Dead even with last week.'

  const streak =
    stats.currentStreakDays > 1
      ? ` ${stats.currentStreakDays}-day streak still alive.`
      : ''

  const lang = stats.topLang ? ` Top language: ${stats.topLang}.` : ''

  return {
    headline,
    note: `Nice work, ${name}. ${trend}${lang}${streak}`,
  }
}

function statsForModel(stats: RecapStats): Record<string, string | number> {
  const delta = weekOverWeekPct(stats.totalDurationS, stats.priorWeekDurationS)
  return {
    sessions: stats.sessionCount,
    total_time: formatDuration(stats.totalDurationS),
    best_session: formatDuration(stats.bestDurationS),
    top_language: stats.topLang ?? 'none',
    streak_days: stats.currentStreakDays,
    week_over_week_pct: delta === null ? 'no prior week' : delta,
  }
}

export async function aiProse(
  stats: RecapStats,
  name: string,
): Promise<RecapProse> {
  if (!openai) throw new Error('OpenAI not configured')

  const response = await openai.chat.completions.create({
    model: RECAP_MODEL,
    temperature: 0.7,
    max_tokens: 200,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a sports commentator for commma, a coding-activity tracker that treats coding like a sport. Write a punchy weekly recap for a developer. Respond ONLY with JSON {"headline": string, "note": string}. headline is at most 70 characters. note is one or two upbeat sentences, at most 320 characters, addressed to the developer by the name provided. Use ONLY the figures provided. Never invent or alter numbers, and never mention any number not given.',
      },
      {
        role: 'user',
        content: JSON.stringify({ name, ...statsForModel(stats) }),
      },
    ],
  })

  const content = response.choices[0]?.message.content
  if (!content) throw new Error('Empty recap completion')
  return recapProseSchema.parse(JSON.parse(content))
}
