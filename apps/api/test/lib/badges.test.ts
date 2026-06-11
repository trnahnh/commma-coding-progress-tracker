import { describe, expect, it } from 'vitest'
import { computeBadges, keySignals } from '../../src/lib/badges.js'

function ids(counts: Record<string, number>): string[] {
  return computeBadges(counts).map((badge) => badge.id)
}

describe('keySignals', () => {
  it('sums totals and groups navigation keys', () => {
    const signals = keySignals({
      a: 100,
      ArrowUp: 10,
      ArrowLeft: 5,
      Home: 3,
      Backspace: 7,
      Delete: 1,
      Escape: 4,
    })
    expect(signals.total).toBe(130)
    expect(signals.arrows).toBe(15)
    expect(signals.navigation).toBe(18)
    expect(signals.backspaceDelete).toBe(8)
    expect(signals.escape).toBe(4)
  })
})

describe('computeBadges', () => {
  it('returns nothing for an empty heatmap', () => {
    expect(ids({})).toEqual([])
  })

  it('earns nothing below the minimum-keystroke gate', () => {
    expect(ids({ a: 900, Backspace: 900 })).toEqual([])
  })

  it('earns backspace-heavy on a high correction share', () => {
    expect(ids({ a: 8700, Backspace: 1000, Delete: 300 })).toContain(
      'backspace-heavy',
    )
  })

  it('earns arrow-navigator without mouse-free at a moderate arrow share', () => {
    const earned = ids({ a: 9300, ArrowUp: 400, ArrowDown: 300 })
    expect(earned).toContain('arrow-navigator')
    expect(earned).not.toContain('mouse-free')
  })

  it('earns mouse-free from jump-key navigation', () => {
    const earned = ids({ a: 8500, Home: 600, End: 600, PageUp: 300, ArrowUp: 200 })
    expect(earned).toContain('mouse-free')
    expect(earned).not.toContain('arrow-navigator')
  })

  it('earns vim-athlete on heavy Escape with almost no arrows', () => {
    const earned = ids({ a: 9650, Escape: 300, ArrowUp: 50 })
    expect(earned).toContain('vim-athlete')
    expect(earned).not.toContain('arrow-navigator')
  })

  it('never earns both vim-athlete and arrow-navigator', () => {
    const earned = ids({ a: 6000, ArrowUp: 2000, ArrowDown: 2000, Escape: 1000 })
    expect(earned).toContain('arrow-navigator')
    expect(earned).not.toContain('vim-athlete')
  })

  it('earns nothing for a plain typing profile', () => {
    expect(ids({ a: 4500, Backspace: 300, ArrowUp: 200 })).toEqual([])
  })
})
