import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

const statusByCode: Record<ErrorCode, ContentfulStatusCode> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
}

export function apiError(
  c: Context,
  code: ErrorCode,
  message: string,
  details: unknown[] = [],
) {
  return c.json({ error: { code, message, details } }, statusByCode[code])
}
