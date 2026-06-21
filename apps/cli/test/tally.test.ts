import { describe, expect, it } from 'vitest'
import { measure, tallyDelta } from '../src/tally.js'

describe('measure', () => {
  it('counts characters and newlines', () => {
    expect(measure('')).toEqual({ chars: 0, newlines: 0 })
    expect(measure('abc')).toEqual({ chars: 3, newlines: 0 })
    expect(measure('a\nb\n')).toEqual({ chars: 4, newlines: 2 })
  })
})

describe('tallyDelta', () => {
  it('treats added characters as keystrokes', () => {
    const prev = measure('const a = 1')
    const next = measure('const ab = 12')
    expect(tallyDelta(prev, next)).toEqual({ keystrokes: 2, lines: 0 })
  })

  it('treats removed characters as keystrokes', () => {
    const prev = measure('hello world')
    const next = measure('hello')
    expect(tallyDelta(prev, next)).toEqual({ keystrokes: 6, lines: 0 })
  })

  it('reports a positive line delta when lines are added', () => {
    const prev = measure('a\nb')
    const next = measure('a\nb\nc\nd')
    expect(tallyDelta(prev, next).lines).toBe(2)
  })

  it('reports a negative line delta when lines are removed', () => {
    const prev = measure('a\nb\nc\n')
    const next = measure('a\n')
    expect(tallyDelta(prev, next).lines).toBe(-2)
  })

  it('clamps a runaway delta to the schema bound', () => {
    const prev = measure('')
    const next = { chars: 5_000_000, newlines: 5_000_000 }
    const tally = tallyDelta(prev, next)
    expect(tally.keystrokes).toBe(1_000_000)
    expect(tally.lines).toBe(1_000_000)
  })
})
