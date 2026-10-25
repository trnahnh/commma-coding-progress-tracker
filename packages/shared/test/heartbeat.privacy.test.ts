import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { KEY_LABELS, heartbeatEventSchema } from '../src/index.js'

const ALLOWED = new Set([
  'id',
  'ts',
  'lang',
  'file',
  'project',
  'keystrokes',
  'lines',
  'key_freq',
])
const LABELS = new Set<string>(KEY_LABELS)

const validEvent = {
  id: '6f1c2b8e-4a1d-4c2e-9f3a-2b7d8e9c0a11',
  ts: 1_760_000_000_000,
  lang: 'typescript',
  keystrokes: 3,
  lines: 1,
  key_freq: { a: 2, Enter: 1 },
}

describe('heartbeat contract rejects content-bearing shapes', () => {
  it('accepts the baseline event', () => {
    expect(heartbeatEventSchema.safeParse(validEvent).success).toBe(true)
  })

  it('rejects any field outside the allowlist', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 24 }).filter((k) => !ALLOWED.has(k)),
        fc.oneof(fc.string(), fc.array(fc.string()), fc.object()),
        (field, value) => {
          const result = heartbeatEventSchema.safeParse({
            ...validEvent,
            [field]: value,
          })
          expect(result.success).toBe(false)
        },
      ),
      { numRuns: 2000, seed: 7 },
    )
  })

  it('rejects any key_freq key that is not a physical key label', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 32 }).filter((k) => !LABELS.has(k)),
        fc.nat(),
        (label, count) => {
          const result = heartbeatEventSchema.safeParse({
            ...validEvent,
            key_freq: { [label]: count },
          })
          expect(result.success).toBe(false)
        },
      ),
      { numRuns: 2000, seed: 11 },
    )
  })
})
