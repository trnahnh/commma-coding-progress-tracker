import type { KeyLabel } from './keyLabels.js'

export interface LayoutKey {
  label: KeyLabel | null
  cap: string
  x: number
  y: number
  w: number
  h: number
}

export interface KeyboardLayout {
  cols: number
  rows: number
  keys: LayoutKey[]
}

type KeySpec = [label: KeyLabel | null, cap: string, w?: number]

function buildRow(y: number, startX: number, specs: KeySpec[]): LayoutKey[] {
  const keys: LayoutKey[] = []
  let x = startX
  for (const [label, cap, w = 1] of specs) {
    keys.push({ label, cap, x, y, w, h: 1 })
    x += w
  }
  return keys
}

const functionRow: LayoutKey[] = [
  { label: 'Escape', cap: 'Esc', x: 0, y: 0, w: 1, h: 1 },
  ...buildRow(0, 2, [
    ['F1', 'F1'],
    ['F2', 'F2'],
    ['F3', 'F3'],
    ['F4', 'F4'],
  ]),
  ...buildRow(0, 6.5, [
    ['F5', 'F5'],
    ['F6', 'F6'],
    ['F7', 'F7'],
    ['F8', 'F8'],
  ]),
  ...buildRow(0, 11, [
    ['F9', 'F9'],
    ['F10', 'F10'],
    ['F11', 'F11'],
    ['F12', 'F12'],
  ]),
]

const numberRow = buildRow(1, 0, [
  [null, '`'],
  ['1', '1'],
  ['2', '2'],
  ['3', '3'],
  ['4', '4'],
  ['5', '5'],
  ['6', '6'],
  ['7', '7'],
  ['8', '8'],
  ['9', '9'],
  ['0', '0'],
  [null, '-'],
  [null, '='],
  ['Backspace', '⌫', 2],
])

const tabRow = buildRow(2, 0, [
  ['Tab', 'Tab', 1.5],
  ['q', 'Q'],
  ['w', 'W'],
  ['e', 'E'],
  ['r', 'R'],
  ['t', 'T'],
  ['y', 'Y'],
  ['u', 'U'],
  ['i', 'I'],
  ['o', 'O'],
  ['p', 'P'],
  [null, '['],
  [null, ']'],
  [null, '\\', 1.5],
])

const capsRow = buildRow(3, 0, [
  [null, 'Caps', 1.75],
  ['a', 'A'],
  ['s', 'S'],
  ['d', 'D'],
  ['f', 'F'],
  ['g', 'G'],
  ['h', 'H'],
  ['j', 'J'],
  ['k', 'K'],
  ['l', 'L'],
  [null, ';'],
  [null, "'"],
  ['Enter', '⏎', 2.25],
])

const shiftRow = buildRow(4, 0, [
  ['Shift', '⇧', 2.25],
  ['z', 'Z'],
  ['x', 'X'],
  ['c', 'C'],
  ['v', 'V'],
  ['b', 'B'],
  ['n', 'N'],
  ['m', 'M'],
  [null, ','],
  [null, '.'],
  [null, '/'],
  ['Shift', '⇧', 2.75],
])

const bottomRow = buildRow(5, 0, [
  ['Control', 'Ctrl', 1.25],
  ['Meta', '⌘', 1.25],
  ['Alt', 'Alt', 1.25],
  [null, '', 7.5],
  ['Alt', 'Alt', 1.25],
  ['Meta', '⌘', 1.25],
  ['Control', 'Ctrl', 1.25],
])

const navCluster: LayoutKey[] = [
  { label: 'Delete', cap: 'Del', x: 15.5, y: 1, w: 1, h: 1 },
  { label: 'Home', cap: 'Home', x: 16.5, y: 1, w: 1, h: 1 },
  { label: 'PageUp', cap: 'PgUp', x: 17.5, y: 1, w: 1, h: 1 },
  { label: 'End', cap: 'End', x: 16.5, y: 2, w: 1, h: 1 },
  { label: 'PageDown', cap: 'PgDn', x: 17.5, y: 2, w: 1, h: 1 },
  { label: 'ArrowUp', cap: '↑', x: 16.5, y: 4, w: 1, h: 1 },
  { label: 'ArrowLeft', cap: '←', x: 15.5, y: 5, w: 1, h: 1 },
  { label: 'ArrowDown', cap: '↓', x: 16.5, y: 5, w: 1, h: 1 },
  { label: 'ArrowRight', cap: '→', x: 17.5, y: 5, w: 1, h: 1 },
]

export const QWERTY_LAYOUT: KeyboardLayout = {
  cols: 18.5,
  rows: 6,
  keys: [
    ...functionRow,
    ...numberRow,
    ...tabRow,
    ...capsRow,
    ...shiftRow,
    ...bottomRow,
    ...navCluster,
  ],
}
