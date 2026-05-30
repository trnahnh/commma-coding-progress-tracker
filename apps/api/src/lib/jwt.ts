import { sign, verify } from 'hono/jwt'
import { env } from '../env.js'

const ACCESS_TTL_SECONDS = 15 * 60

export async function signAccessToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return sign(
    { sub: userId, iat: now, exp: now + ACCESS_TTL_SECONDS },
    env.JWT_SECRET,
  )
}

export async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const payload = await verify(token, env.JWT_SECRET, 'HS256')
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}
