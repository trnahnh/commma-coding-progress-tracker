import type { Context } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'

const REFRESH_COOKIE = 'commma_refresh'
const REFRESH_PATH = '/v1/auth'
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60

const OAUTH_STATE_COOKIE = 'commma_oauth_state'
const OAUTH_STATE_MAX_AGE = 10 * 60

export const refreshCookieName = REFRESH_COOKIE
export const oauthStateCookieName = OAUTH_STATE_COOKIE

export function setRefreshCookie(c: Context, token: string) {
  setCookie(c, REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: REFRESH_PATH,
    maxAge: REFRESH_MAX_AGE,
  })
}

export function clearRefreshCookie(c: Context) {
  deleteCookie(c, REFRESH_COOKIE, { path: REFRESH_PATH })
}

export function setOAuthStateCookie(c: Context, state: string) {
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: REFRESH_PATH,
    maxAge: OAUTH_STATE_MAX_AGE,
  })
}

export function clearOAuthStateCookie(c: Context) {
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: REFRESH_PATH })
}
