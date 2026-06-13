import { describe, expect, it } from 'vitest'
import type { RecapStats } from '../../src/recap/aggregate.js'
import type { RecapProse } from '../../src/recap/prose.js'

process.env.DATABASE_URL ??= 'postgres://test/test'
process.env.REDIS_URL ??= 'redis://localhost:6379'
process.env.GITHUB_CLIENT_ID ??= 'test-client'
process.env.GITHUB_CLIENT_SECRET ??= 'test-secret'
process.env.GITHUB_CALLBACK_URL ??= 'http://localhost:3000/cb'
process.env.JWT_SECRET ??= 'test-jwt'
process.env.REFRESH_TOKEN_SECRET ??= 'test-refresh'
process.env.WEB_ORIGIN = 'https://commma.dev'

const { composeRecapEmail } = await import('../../src/recap/compose.js')

const stats: RecapStats = {
  sessionCount: 4,
  totalDurationS: 7200,
  bestDurationS: 3000,
  bestSessionId: 'sess-123',
  topLang: 'TypeScript',
  currentStreakDays: 5,
  priorWeekDurationS: 3600,
}

const prose: RecapProse = {
  headline: 'Big week, ada',
  note: 'You shipped four sessions.',
}

describe('composeRecapEmail', () => {
  it('uses the prose headline as the subject', () => {
    expect(composeRecapEmail(stats, prose).subject).toBe('Big week, ada')
  })

  it('renders the exact stat figures, not invented ones', () => {
    const { html, text } = composeRecapEmail(stats, prose)
    expect(text).toContain('Sessions: 4')
    expect(text).toContain('Coding time: 2h')
    expect(text).toContain('Best session: 50m')
    expect(text).toContain('Top language: TypeScript')
    expect(text).toContain('Streak: 5 days')
    expect(html).toContain('TypeScript')
    expect(html).toContain('You shipped four sessions.')
  })

  it('links to the best session on the web origin', () => {
    const { html, text } = composeRecapEmail(stats, prose)
    expect(html).toContain('https://commma.dev/sessions/sess-123')
    expect(text).toContain('https://commma.dev/sessions/sess-123')
  })

  it('escapes HTML in prose to avoid injection', () => {
    const { html } = composeRecapEmail(stats, {
      headline: 'Hi <script>',
      note: 'a & b',
    })
    expect(html).toContain('Hi &lt;script&gt;')
    expect(html).toContain('a &amp; b')
  })

  it('omits the streak line when there is no streak', () => {
    const { text } = composeRecapEmail(
      { ...stats, currentStreakDays: 0 },
      prose,
    )
    expect(text).not.toContain('Streak:')
  })
})
