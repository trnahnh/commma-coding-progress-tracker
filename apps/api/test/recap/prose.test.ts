import { describe, expect, it } from 'vitest'
import type { RecapStats } from '../../src/recap/aggregate.js'

process.env.DATABASE_URL ??= 'postgres://test/test'
process.env.REDIS_URL ??= 'redis://localhost:6379'
process.env.GITHUB_CLIENT_ID ??= 'test-client'
process.env.GITHUB_CLIENT_SECRET ??= 'test-secret'
process.env.GITHUB_CALLBACK_URL ??= 'http://localhost:3000/cb'
process.env.JWT_SECRET ??= 'test-jwt'
process.env.REFRESH_TOKEN_SECRET ??= 'test-refresh'
process.env.WEB_ORIGIN ??= 'http://localhost:5173'

const { defaultProse, recapProseSchema } = await import('../../src/recap/prose.js')

const base: RecapStats = {
  sessionCount: 4,
  totalDurationS: 7200,
  bestDurationS: 3000,
  bestSessionId: 'abc',
  topLang: 'TypeScript',
  currentStreakDays: 5,
  priorWeekDurationS: 3600,
}

describe('defaultProse', () => {
  it('addresses the developer by the name passed in', () => {
    const prose = defaultProse(base, 'Ada Lovelace')
    expect(prose.headline).toBe('4 sessions, 2h this week')
    expect(prose.note).toContain('Nice work, Ada Lovelace.')
    expect(prose.note).toContain('Up 100% on last week')
    expect(prose.note).toContain('TypeScript')
    expect(prose.note).toContain('5-day streak')
  })

  it('uses an @handle fallback name verbatim', () => {
    expect(defaultProse(base, '@grace').note).toContain('Nice work, @grace.')
  })

  it('handles a single session and no prior week', () => {
    const prose = defaultProse(
      {
        ...base,
        sessionCount: 1,
        totalDurationS: 1800,
        priorWeekDurationS: 0,
        currentStreakDays: 1,
        topLang: null,
      },
      'Grace Hopper',
    )
    expect(prose.headline).toBe('One session, 30m on the board')
    expect(prose.note).toContain('Fresh week')
    expect(prose.note).not.toContain('streak')
  })

  it('always satisfies the prose schema', () => {
    expect(() =>
      recapProseSchema.parse(defaultProse(base, 'Ada Lovelace')),
    ).not.toThrow()
  })
})

describe('recapProseSchema', () => {
  it('rejects malformed AI output', () => {
    expect(recapProseSchema.safeParse({ headline: '', note: 'x' }).success).toBe(
      false,
    )
    expect(recapProseSchema.safeParse({ note: 'only note' }).success).toBe(false)
    expect(
      recapProseSchema.safeParse({ headline: 'h', note: 'n' }).success,
    ).toBe(true)
  })
})
