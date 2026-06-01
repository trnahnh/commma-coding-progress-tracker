import { describe, expect, it } from 'vitest'
import { heartbeatBatchSchema, heartbeatEventSchema } from '../src/heartbeat.js'

function validEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    ts: 1_717_000_000_000,
    lang: 'typescript',
    file: 'src/index.ts',
    project: 'commma',
    keystrokes: 42,
    lines: 3,
    key_freq: { a: 10, Enter: 2 },
    ...overrides,
  }
}

describe('heartbeatEventSchema', () => {
  it('accepts a well-formed event', () => {
    expect(heartbeatEventSchema.safeParse(validEvent()).success).toBe(true)
  })

  it('rejects an oversized file path', () => {
    const event = validEvent({ file: 'a'.repeat(1025) })
    expect(heartbeatEventSchema.safeParse(event).success).toBe(false)
  })

  it('rejects keystrokes beyond the per-event cap', () => {
    const event = validEvent({ keystrokes: 1_000_001 })
    expect(heartbeatEventSchema.safeParse(event).success).toBe(false)
  })

  it('rejects lines outside the bounded range', () => {
    expect(
      heartbeatEventSchema.safeParse(validEvent({ lines: -1_000_001 })).success,
    ).toBe(false)
  })

  it('rejects a timestamp past the sanity ceiling', () => {
    const event = validEvent({ ts: 4_102_444_800_001 })
    expect(heartbeatEventSchema.safeParse(event).success).toBe(false)
  })

  it('rejects an unknown key label in key_freq', () => {
    const event = validEvent({ key_freq: { notakey: 1 } })
    expect(heartbeatEventSchema.safeParse(event).success).toBe(false)
  })

  it('rejects a negative key_freq count', () => {
    const event = validEvent({ key_freq: { a: -1 } })
    expect(heartbeatEventSchema.safeParse(event).success).toBe(false)
  })
})

describe('heartbeatBatchSchema', () => {
  it('rejects an empty batch', () => {
    expect(heartbeatBatchSchema.safeParse({ events: [] }).success).toBe(false)
  })

  it('rejects a batch larger than 500 events', () => {
    const events = Array.from({ length: 501 }, () => validEvent())
    expect(heartbeatBatchSchema.safeParse({ events }).success).toBe(false)
  })

  it('accepts a batch at the upper bound', () => {
    const events = Array.from({ length: 500 }, () => validEvent())
    expect(heartbeatBatchSchema.safeParse({ events }).success).toBe(true)
  })
})
