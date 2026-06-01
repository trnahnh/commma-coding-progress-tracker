import { describe, expect, it } from 'vitest'
import {
  IDLE_GAP_MS,
  splitIntoSessions,
} from '../../src/aggregate/boundaries.js'

const BASE = Date.UTC(2026, 5, 1, 12, 0, 0)

function at(offsetMs: number): { ts: Date } {
  return { ts: new Date(BASE + offsetMs) }
}

function counts(
  groups: { events: { ts: Date }[]; closed: boolean }[],
): number[] {
  return groups.map((g) => g.events.length)
}

describe('splitIntoSessions', () => {
  it('returns no groups for an empty input', () => {
    expect(splitIntoSessions([], BASE)).toEqual([])
  })

  it('keeps a single event as one group', () => {
    const groups = splitIntoSessions([at(0)], BASE + 2 * IDLE_GAP_MS)
    expect(counts(groups)).toEqual([1])
    expect(groups[0].closed).toBe(true)
  })

  it('keeps events within the idle gap in one group', () => {
    const rows = [at(0), at(60_000), at(120_000)]
    const groups = splitIntoSessions(rows, BASE + 2 * IDLE_GAP_MS)
    expect(counts(groups)).toEqual([3])
  })

  it('treats a gap exactly equal to the threshold as the same group', () => {
    const rows = [at(0), at(IDLE_GAP_MS)]
    const groups = splitIntoSessions(rows, BASE + 2 * IDLE_GAP_MS)
    expect(counts(groups)).toEqual([2])
  })

  it('splits when the gap exceeds the threshold by 1ms', () => {
    const rows = [at(0), at(IDLE_GAP_MS + 1)]
    const groups = splitIntoSessions(rows, BASE + 3 * IDLE_GAP_MS)
    expect(counts(groups)).toEqual([1, 1])
  })

  it('splits a three-burst sequence into three groups', () => {
    const rows = [
      at(0),
      at(60_000),
      at(60_000 + IDLE_GAP_MS + 1),
      at(60_000 + IDLE_GAP_MS + 61_000),
      at(60_000 + 2 * (IDLE_GAP_MS + 61_000)),
    ]
    const groups = splitIntoSessions(rows, BASE + 10 * IDLE_GAP_MS)
    expect(counts(groups)).toEqual([2, 2, 1])
  })

  it('holds back the trailing group until the idle gap has elapsed', () => {
    const rows = [at(0), at(60_000)]
    const now = BASE + 60_000 + IDLE_GAP_MS - 1
    const groups = splitIntoSessions(rows, now)
    expect(groups[groups.length - 1].closed).toBe(false)
  })

  it('closes the trailing group once the idle gap has elapsed', () => {
    const rows = [at(0), at(60_000)]
    const now = BASE + 60_000 + IDLE_GAP_MS
    const groups = splitIntoSessions(rows, now)
    expect(groups[groups.length - 1].closed).toBe(true)
  })

  it('marks every non-trailing group closed regardless of now', () => {
    const rows = [at(0), at(IDLE_GAP_MS + 1), at(2 * (IDLE_GAP_MS + 1))]
    const now = 2 * (IDLE_GAP_MS + 1) + BASE + 1
    const groups = splitIntoSessions(rows, now)
    expect(groups.slice(0, -1).every((g) => g.closed)).toBe(true)
    expect(groups[groups.length - 1].closed).toBe(false)
  })
})
