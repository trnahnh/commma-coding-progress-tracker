import { ApiError } from './api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidWaitlistEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function waitlistErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.code === 'RATE_LIMITED') {
    return 'Too many tries — give it a minute, then retry.'
  }
  if (err instanceof ApiError && err.status === 0) {
    return 'Could not reach the server. Check your connection.'
  }
  return 'Something went wrong. Try again in a moment.'
}
