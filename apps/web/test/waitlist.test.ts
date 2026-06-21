import { describe, expect, it } from 'vitest'
import { ApiError } from '../src/lib/api'
import { isValidWaitlistEmail, waitlistErrorMessage } from '../src/lib/waitlist'

describe('isValidWaitlistEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidWaitlistEmail('dev@commma.dev')).toBe(true)
  })

  it('trims surrounding whitespace', () => {
    expect(isValidWaitlistEmail('  dev@commma.dev  ')).toBe(true)
  })

  it('rejects a missing domain', () => {
    expect(isValidWaitlistEmail('dev@')).toBe(false)
  })

  it('rejects a missing at-sign', () => {
    expect(isValidWaitlistEmail('devcommma.dev')).toBe(false)
  })

  it('rejects whitespace inside the address', () => {
    expect(isValidWaitlistEmail('de v@commma.dev')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidWaitlistEmail('')).toBe(false)
  })
})

describe('waitlistErrorMessage', () => {
  it('maps a rate-limited error', () => {
    expect(waitlistErrorMessage(new ApiError(429, 'RATE_LIMITED', 'x'))).toMatch(
      /give it a minute/,
    )
  })

  it('maps a network error with status 0', () => {
    expect(waitlistErrorMessage(new ApiError(0, 'NETWORK', 'x'))).toMatch(
      /reach the server/,
    )
  })

  it('falls back for an unrecognized ApiError', () => {
    expect(
      waitlistErrorMessage(new ApiError(500, 'INTERNAL_ERROR', 'x')),
    ).toMatch(/went wrong/)
  })

  it('falls back for a non-ApiError value', () => {
    expect(waitlistErrorMessage(new Error('boom'))).toMatch(/went wrong/)
  })
})
