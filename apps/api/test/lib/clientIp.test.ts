import { describe, expect, it } from 'vitest'
import { selectClientIp } from '../../src/lib/clientIp.js'

const REMOTE = '10.0.0.1'
const CLIENT = '203.0.113.7'
const FAKE = '1.2.3.4'

describe('selectClientIp', () => {
  it('ignores x-forwarded-for entirely when no proxy is trusted', () => {
    expect(selectClientIp(`${FAKE}, ${CLIENT}`, REMOTE, 0)).toBe(REMOTE)
  })

  it('falls back to the socket address when there is no forwarded header', () => {
    expect(selectClientIp(null, REMOTE, 1)).toBe(REMOTE)
  })

  it('reads the client from a single trusted proxy', () => {
    expect(selectClientIp(CLIENT, REMOTE, 1)).toBe(CLIENT)
  })

  it('cannot be spoofed by a prepended fake hop behind one proxy', () => {
    expect(selectClientIp(`${FAKE}, ${CLIENT}`, REMOTE, 1)).toBe(CLIENT)
  })

  it('reads the client through two trusted proxies', () => {
    expect(selectClientIp(`${CLIENT}, 70.132.0.5`, REMOTE, 2)).toBe(CLIENT)
  })

  it('cannot be spoofed by a prepended fake hop behind two proxies', () => {
    expect(selectClientIp(`${FAKE}, ${CLIENT}, 70.132.0.5`, REMOTE, 2)).toBe(
      CLIENT,
    )
  })

  it('falls back to the socket address when fewer hops arrived than configured', () => {
    expect(selectClientIp(CLIENT, REMOTE, 3)).toBe(REMOTE)
  })

  it('trims whitespace around addresses', () => {
    expect(selectClientIp(`  ${CLIENT}  `, REMOTE, 1)).toBe(CLIENT)
  })
})
