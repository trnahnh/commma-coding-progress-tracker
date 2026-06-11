export interface Badge {
  id: string
  name: string
  description: string
}

export type KeyCounts = Record<string, number>

export interface KeySignals {
  total: number
  arrows: number
  backspaceDelete: number
  escape: number
  navigation: number
}

const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const
const JUMP_KEYS = ['Home', 'End', 'PageUp', 'PageDown'] as const

export const MIN_KEYSTROKES = 2000

const VIM_ESCAPE_MIN_SHARE = 0.02
const VIM_ARROW_MAX_SHARE = 0.01
const MOUSE_FREE_NAV_MIN_SHARE = 0.1
const BACKSPACE_HEAVY_MIN_SHARE = 0.12
const ARROW_NAVIGATOR_MIN_SHARE = 0.06

function sumKeys(counts: KeyCounts, keys: readonly string[]): number {
  return keys.reduce((sum, key) => sum + (counts[key] ?? 0), 0)
}

function share(part: number, total: number): number {
  return total > 0 ? part / total : 0
}

export function keySignals(counts: KeyCounts): KeySignals {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
  const arrows = sumKeys(counts, ARROW_KEYS)
  return {
    total,
    arrows,
    backspaceDelete: sumKeys(counts, ['Backspace', 'Delete']),
    escape: counts['Escape'] ?? 0,
    navigation: arrows + sumKeys(counts, JUMP_KEYS),
  }
}

interface BadgeRule extends Badge {
  earned: (signals: KeySignals) => boolean
}

const RULES: readonly BadgeRule[] = [
  {
    id: 'vim-athlete',
    name: 'Vim athlete',
    description: 'Leans on Escape and almost never reaches for the arrow keys.',
    earned: (s) =>
      share(s.escape, s.total) >= VIM_ESCAPE_MIN_SHARE &&
      share(s.arrows, s.total) <= VIM_ARROW_MAX_SHARE,
  },
  {
    id: 'mouse-free',
    name: 'Mouse-free',
    description: 'Moves through the file by keyboard instead of the mouse.',
    earned: (s) => share(s.navigation, s.total) >= MOUSE_FREE_NAV_MIN_SHARE,
  },
  {
    id: 'backspace-heavy',
    name: 'Backspace heavy',
    description: 'Edits in place with a high share of Backspace and Delete.',
    earned: (s) => share(s.backspaceDelete, s.total) >= BACKSPACE_HEAVY_MIN_SHARE,
  },
  {
    id: 'arrow-navigator',
    name: 'Arrow navigator',
    description: 'Gets around the file with the arrow keys.',
    earned: (s) => share(s.arrows, s.total) >= ARROW_NAVIGATOR_MIN_SHARE,
  },
]

export function computeBadges(counts: KeyCounts): Badge[] {
  const signals = keySignals(counts)
  if (signals.total < MIN_KEYSTROKES) return []
  return RULES.filter((rule) => rule.earned(signals)).map(
    ({ id, name, description }) => ({ id, name, description }),
  )
}
