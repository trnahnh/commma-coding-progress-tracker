import { and, eq, lt, or } from 'drizzle-orm'
import { sessions } from '@commma/db'

export interface SessionCursor {
  startedAt: string
  id: string
}

export function encodeCursor(cursor: SessionCursor): string {
  return Buffer.from(`${cursor.startedAt}|${cursor.id}`).toString('base64url')
}

export function decodeCursor(raw: string): SessionCursor | null {
  const decoded = Buffer.from(raw, 'base64url').toString('utf8')
  const sep = decoded.lastIndexOf('|')
  if (sep === -1) return null
  const startedAt = decoded.slice(0, sep)
  const id = decoded.slice(sep + 1)
  if (!id || Number.isNaN(Date.parse(startedAt))) return null
  return { startedAt, id }
}

export function sessionKeyset(cursor: SessionCursor) {
  const cursorDate = new Date(cursor.startedAt)
  return or(
    lt(sessions.startedAt, cursorDate),
    and(eq(sessions.startedAt, cursorDate), lt(sessions.id, cursor.id)),
  )
}

export function parseLimit(
  raw: string | undefined,
  fallback: number,
  max: number,
): number {
  const value = Number(raw ?? String(fallback))
  if (!Number.isFinite(value)) return fallback
  return Math.min(Math.max(Math.trunc(value), 1), max)
}
