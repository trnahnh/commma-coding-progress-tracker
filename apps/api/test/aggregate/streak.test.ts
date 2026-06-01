import { describe, expect, it } from 'vitest'
import {
  applyActiveDate,
  streakBreakCutoff,
} from '../../src/aggregate/streak.js'
import type { StreakState } from '../../src/aggregate/streak.js'

const FRESH: StreakState = {
  currentDays: 0,
  longestDays: 0,
  lastActiveDate: null,
}

describe('applyActiveDate', () => {
  it('starts a streak on the first active date', () => {
    expect(applyActiveDate(FRESH, '2026-06-01')).toEqual({
      currentDays: 1,
      longestDays: 1,
      lastActiveDate: '2026-06-01',
    })
  })

  it('increments on a consecutive day and tracks the longest', () => {
    const day1 = applyActiveDate(FRESH, '2026-06-01')
    const day2 = applyActiveDate(day1, '2026-06-02')
    expect(day2).toEqual({
      currentDays: 2,
      longestDays: 2,
      lastActiveDate: '2026-06-02',
    })
  })

  it('resets the current run after a skipped day but keeps the longest', () => {
    const built = ['2026-06-01', '2026-06-02', '2026-06-03'].reduce(
      applyActiveDate,
      FRESH,
    )
    const afterGap = applyActiveDate(built, '2026-06-10')
    expect(afterGap.currentDays).toBe(1)
    expect(afterGap.longestDays).toBe(3)
    expect(afterGap.lastActiveDate).toBe('2026-06-10')
  })

  it('ignores a repeated active date', () => {
    const day1 = applyActiveDate(FRESH, '2026-06-01')
    expect(applyActiveDate(day1, '2026-06-01')).toBe(day1)
  })

  it('ignores an out-of-order earlier date', () => {
    const day2 = applyActiveDate(
      applyActiveDate(FRESH, '2026-06-02'),
      '2026-06-03',
    )
    expect(applyActiveDate(day2, '2026-06-01')).toBe(day2)
  })

  it('crosses a month boundary as consecutive', () => {
    const last = applyActiveDate(FRESH, '2026-06-30')
    expect(applyActiveDate(last, '2026-07-01').currentDays).toBe(2)
  })
})

describe('streakBreakCutoff', () => {
  it('returns the UTC date one day before now', () => {
    expect(streakBreakCutoff(Date.UTC(2026, 5, 1, 9, 0, 0))).toBe('2026-05-31')
  })

  it('rolls back across a month boundary', () => {
    expect(streakBreakCutoff(Date.UTC(2026, 6, 1, 0, 0, 0))).toBe('2026-06-30')
  })
})
