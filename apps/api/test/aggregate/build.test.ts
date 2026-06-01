import { describe, expect, it } from 'vitest'
import { buildSession } from '../../src/aggregate/build.js'
import type { EventRow } from '../../src/aggregate/types.js'

const BASE = Date.UTC(2026, 5, 1, 12, 0, 0)

function row(overrides: Partial<EventRow> & { ts: Date }): EventRow {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    userId: '00000000-0000-0000-0000-000000000001',
    lang: null,
    file: null,
    project: null,
    keystrokes: 0,
    lines: 0,
    keyFreq: null,
    processed: false,
    ...overrides,
  }
}

function at(offsetMs: number, overrides: Partial<EventRow> = {}): EventRow {
  return row({ ts: new Date(BASE + offsetMs), ...overrides })
}

describe('buildSession', () => {
  it('adds the heartbeat window to the event span for duration', () => {
    const draft = buildSession([
      at(0, { keystrokes: 10 }),
      at(120_000, { keystrokes: 20 }),
    ])
    expect(draft.durationS).toBe(120 + 60)
    expect(draft.startedAt.getTime()).toBe(BASE)
    expect(draft.endedAt.getTime()).toBe(BASE + 120_000)
  })

  it('gives a single event a duration of one heartbeat window', () => {
    const draft = buildSession([at(0, { keystrokes: 5 })])
    expect(draft.durationS).toBe(60)
  })

  it('sums keystrokes into pace and lines into linesDelta', () => {
    const draft = buildSession([
      at(0, { keystrokes: 60, lines: 3 }),
      at(60_000, { keystrokes: 120, lines: -1 }),
    ])
    expect(draft.linesDelta).toBe(2)
    expect(draft.paceCpm).toBe(Math.round(180 / (120 / 60)))
  })

  it('finds the busiest one-minute bucket as the peak', () => {
    const draft = buildSession([
      at(0, { keystrokes: 10 }),
      at(60_000, { keystrokes: 90 }),
      at(120_000, { keystrokes: 30 }),
    ])
    expect(draft.peakCpm).toBe(90)
    expect(draft.peakAt.getTime()).toBe(BASE + 60_000)
  })

  it('merges key frequency maps into counts, freq and total', () => {
    const draft = buildSession([
      at(0, { keystrokes: 3, keyFreq: { a: 2, b: 1 } }),
      at(60_000, { keystrokes: 1, keyFreq: { a: 1 } }),
    ])
    expect(draft.keyboardHeatmap.counts).toEqual({ a: 3, b: 1 })
    expect(draft.keyboardHeatmap.total).toBe(4)
    expect(draft.keyboardHeatmap.freq.a).toBeCloseTo(0.75)
    expect(draft.keyboardHeatmap.freq.b).toBeCloseTo(0.25)
  })

  it('leaves freq empty when there are no key labels', () => {
    const draft = buildSession([at(0, { keystrokes: 5 })])
    expect(draft.keyboardHeatmap.total).toBe(0)
    expect(draft.keyboardHeatmap.freq).toEqual({})
  })

  it('splits language share by keystrokes and falls back to unknown', () => {
    const draft = buildSession([
      at(0, { keystrokes: 75, lang: 'typescript' }),
      at(60_000, { keystrokes: 25, lang: null }),
    ])
    const ts = draft.langs.find((l) => l.lang === 'typescript')
    const unknown = draft.langs.find((l) => l.lang === 'unknown')
    expect(ts?.pct).toBe(75)
    expect(unknown?.pct).toBe(25)
  })

  it('aggregates file changes by keystrokes and skips null files', () => {
    const draft = buildSession([
      at(0, { keystrokes: 4, file: 'a.ts' }),
      at(60_000, { keystrokes: 6, file: 'a.ts' }),
      at(120_000, { keystrokes: 9, file: null }),
    ])
    expect(draft.files).toEqual([{ path: 'a.ts', changes: 10 }])
  })

  it('lists every UTC day the session spans, inclusive', () => {
    const draft = buildSession([
      row({ ts: new Date(Date.UTC(2026, 5, 1, 23, 50, 0)), keystrokes: 1 }),
      row({ ts: new Date(Date.UTC(2026, 5, 2, 0, 20, 0)), keystrokes: 1 }),
    ])
    expect(draft.activeDates).toEqual(['2026-06-01', '2026-06-02'])
  })
})
