export interface FileMeasure {
  chars: number
  newlines: number
}

export interface FileSnapshot extends FileMeasure {
  mtimeMs: number
}

export interface ChangeTally {
  keystrokes: number
  lines: number
}

const MAX_COUNT = 1_000_000

export function measure(content: string): FileMeasure {
  let newlines = 0
  for (let i = 0; i < content.length; i += 1) {
    if (content.charCodeAt(i) === 10) newlines += 1
  }
  return { chars: content.length, newlines }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function tallyDelta(prev: FileMeasure, next: FileMeasure): ChangeTally {
  const keystrokes = clamp(Math.abs(next.chars - prev.chars), 0, MAX_COUNT)
  const lines = clamp(next.newlines - prev.newlines, -MAX_COUNT, MAX_COUNT)
  return { keystrokes, lines }
}
