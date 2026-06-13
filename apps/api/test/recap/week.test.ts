import { describe, expect, it } from 'vitest'
import {
  isRecapSendTime,
  lastCompletedWeek,
  priorWeekOf,
} from '../../src/recap/week.js'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

describe('lastCompletedWeek', () => {
  it('spans the Monday-to-Monday week before the current one', () => {
    const now = new Date('2026-06-17T09:00:00.000Z')
    const window = lastCompletedWeek(now)
    expect(window.start.getUTCDay()).toBe(1)
    expect(window.end.getUTCDay()).toBe(1)
    expect(window.end.getTime() - window.start.getTime()).toBe(WEEK_MS)
  })

  it('ends no later than now and within seven days of it', () => {
    const now = new Date('2026-06-17T09:00:00.000Z')
    const window = lastCompletedWeek(now)
    expect(window.end.getTime()).toBeLessThanOrEqual(now.getTime())
    expect(now.getTime() - window.end.getTime()).toBeLessThan(WEEK_MS)
  })

  it('derives weekStart as the ISO date of the window start', () => {
    const window = lastCompletedWeek(new Date('2026-06-17T09:00:00.000Z'))
    expect(window.weekStart).toBe(window.start.toISOString().slice(0, 10))
  })

  it('treats a Monday as the start of the not-yet-complete week', () => {
    const window = lastCompletedWeek(new Date('2026-06-15T00:30:00.000Z'))
    expect(window.end.toISOString().slice(0, 10)).toBe('2026-06-15')
    expect(window.weekStart).toBe('2026-06-08')
  })
})

describe('priorWeekOf', () => {
  it('is the seven days immediately before the window', () => {
    const window = lastCompletedWeek(new Date('2026-06-17T09:00:00.000Z'))
    const prior = priorWeekOf(window)
    expect(prior.end.getTime()).toBe(window.start.getTime())
    expect(window.start.getTime() - prior.start.getTime()).toBe(WEEK_MS)
  })
})

describe('isRecapSendTime', () => {
  it('is true on Monday at or after the send hour', () => {
    expect(isRecapSendTime(new Date('2026-06-15T13:00:00.000Z'), 13)).toBe(true)
    expect(isRecapSendTime(new Date('2026-06-15T20:00:00.000Z'), 13)).toBe(true)
  })

  it('is false before the send hour on Monday', () => {
    expect(isRecapSendTime(new Date('2026-06-15T12:59:00.000Z'), 13)).toBe(false)
  })

  it('stays true later in the week so a missed Monday send catches up', () => {
    expect(isRecapSendTime(new Date('2026-06-16T08:00:00.000Z'), 13)).toBe(true)
    expect(isRecapSendTime(new Date('2026-06-21T23:00:00.000Z'), 13)).toBe(true)
  })
})
