import { describe, expect, it } from 'vitest'
import {
  canManageTeam,
  isValidSlug,
  mergeHeatmaps,
  TEAM_MAX_MEMBERS,
} from '../../src/lib/teams.js'

describe('isValidSlug', () => {
  it('accepts lowercase alphanumerics and hyphens', () => {
    expect(isValidSlug('team-rocket')).toBe(true)
    expect(isValidSlug('a')).toBe(true)
    expect(isValidSlug('dev-team-01')).toBe(true)
  })

  it('rejects empty, uppercase, spaces, and over-long slugs', () => {
    expect(isValidSlug('')).toBe(false)
    expect(isValidSlug('Team')).toBe(false)
    expect(isValidSlug('my team')).toBe(false)
    expect(isValidSlug('under_score')).toBe(false)
    expect(isValidSlug('a'.repeat(40))).toBe(false)
  })
})

describe('canManageTeam', () => {
  it('only owners can manage', () => {
    expect(canManageTeam('owner')).toBe(true)
    expect(canManageTeam('member')).toBe(false)
    expect(canManageTeam('')).toBe(false)
  })
})

describe('TEAM_MAX_MEMBERS', () => {
  it('caps a team at five members', () => {
    expect(TEAM_MAX_MEMBERS).toBe(5)
  })
})

describe('mergeHeatmaps', () => {
  it('sums counts across members and recomputes total and freq', () => {
    const merged = mergeHeatmaps([
      { counts: { a: 3, b: 1 }, freq: {}, total: 4 },
      { counts: { a: 1, c: 4 }, freq: {}, total: 5 },
    ])
    expect(merged.counts).toEqual({ a: 4, b: 1, c: 4 })
    expect(merged.total).toBe(9)
    expect(merged.freq.a).toBeCloseTo(4 / 9)
    expect(merged.freq.c).toBeCloseTo(4 / 9)
  })

  it('returns an empty heatmap for no input', () => {
    expect(mergeHeatmaps([])).toEqual({ counts: {}, freq: {}, total: 0 })
  })

  it('drops null, missing, and non-numeric counts defensively', () => {
    const merged = mergeHeatmaps([
      { counts: { a: 2 }, freq: {}, total: 2 },
      null as unknown as never,
      { counts: undefined as unknown as Record<string, number>, freq: {}, total: 0 },
      { counts: { a: Number.NaN, b: 3 }, freq: {}, total: 3 },
    ])
    expect(merged.counts).toEqual({ a: 2, b: 3 })
    expect(merged.total).toBe(5)
  })

  it('leaves freq empty when total is zero', () => {
    const merged = mergeHeatmaps([{ counts: {}, freq: {}, total: 0 }])
    expect(merged).toEqual({ counts: {}, freq: {}, total: 0 })
  })
})
