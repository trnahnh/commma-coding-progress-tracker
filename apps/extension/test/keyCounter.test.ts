import { describe, expect, it } from 'vitest'
import { addKeyFreq, tallyChange } from '../src/keyCounter.js'

describe('tallyChange', () => {
  it('counts a single typed character as one keystroke under its label', () => {
    expect(
      tallyChange({ text: 'a', rangeLength: 0, removedLineCount: 0 }),
    ).toEqual({
      keystrokes: 1,
      lines: 0,
      keyFreq: { a: 1 },
    })
  })

  it('lowercases a shifted letter to its physical key', () => {
    expect(
      tallyChange({ text: 'A', rangeLength: 0, removedLineCount: 0 }).keyFreq,
    ).toEqual({
      a: 1,
    })
  })

  it('maps a shifted symbol to its physical key', () => {
    expect(
      tallyChange({ text: '!', rangeLength: 0, removedLineCount: 0 }).keyFreq,
    ).toEqual({
      '1': 1,
    })
  })

  it('labels whitespace characters by their physical key', () => {
    expect(
      tallyChange({ text: ' ', rangeLength: 0, removedLineCount: 0 }).keyFreq,
    ).toEqual({
      Space: 1,
    })
    expect(
      tallyChange({ text: '\t', rangeLength: 0, removedLineCount: 0 }).keyFreq,
    ).toEqual({
      Tab: 1,
    })
  })

  it('counts a newline as Enter and adds a line', () => {
    expect(
      tallyChange({ text: '\n', rangeLength: 0, removedLineCount: 0 }),
    ).toEqual({
      keystrokes: 1,
      lines: 1,
      keyFreq: { Enter: 1 },
    })
  })

  it('falls back to Other for an unmapped character', () => {
    expect(
      tallyChange({ text: 'é', rangeLength: 0, removedLineCount: 0 }).keyFreq,
    ).toEqual({
      Other: 1,
    })
  })

  it('counts a single-character deletion as Backspace', () => {
    expect(
      tallyChange({ text: '', rangeLength: 1, removedLineCount: 0 }),
    ).toEqual({
      keystrokes: 1,
      lines: 0,
      keyFreq: { Backspace: 1 },
    })
  })

  it('counts a multi-line deletion as one Backspace with negative lines', () => {
    expect(
      tallyChange({ text: '', rangeLength: 12, removedLineCount: 2 }),
    ).toEqual({
      keystrokes: 1,
      lines: -2,
      keyFreq: { Backspace: 1 },
    })
  })

  it('does not count a multi-character paste as a keystroke', () => {
    const result = tallyChange({
      text: 'hello\nworld',
      rangeLength: 0,
      removedLineCount: 0,
    })
    expect(result.keystrokes).toBe(0)
    expect(result.lines).toBe(1)
    expect(result.keyFreq).toEqual({})
  })

  it('nets added against removed lines on a replacement', () => {
    expect(
      tallyChange({ text: 'a\nb\nc', rangeLength: 4, removedLineCount: 1 })
        .lines,
    ).toBe(1)
  })
})

describe('addKeyFreq', () => {
  it('accumulates label counts in place', () => {
    const into = { a: 1, b: 2 }
    addKeyFreq(into, { a: 3, c: 1 })
    expect(into).toEqual({ a: 4, b: 2, c: 1 })
  })

  it('treats an empty delta as a no-op', () => {
    const into = { a: 1 }
    addKeyFreq(into, {})
    expect(into).toEqual({ a: 1 })
  })
})
