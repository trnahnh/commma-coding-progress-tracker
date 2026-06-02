const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export interface SessionLang {
  lang: string
  duration_s: number
  pct: number
}

export interface SessionFile {
  path: string
  changes: number
}

export interface KeyboardHeatmap {
  counts: Record<string, number>
  freq: Record<string, number>
  total: number
}

export interface SessionDetail {
  id: string
  started_at: string
  ended_at: string
  duration_s: number
  lines_delta: number
  pace_cpm: number | null
  peak_cpm: number | null
  peak_at: string | null
  langs: SessionLang[]
  files: SessionFile[]
  keyboard_heatmap: KeyboardHeatmap | null
}

interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init)
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server')
  }

  if (!res.ok) {
    let code = 'INTERNAL_ERROR'
    let message = res.statusText
    try {
      const body = (await res.json()) as ApiErrorBody
      if (body.error?.code) code = body.error.code
      if (body.error?.message) message = body.error.message
    } catch {
      void 0
    }
    throw new ApiError(res.status, code, message)
  }

  return (await res.json()) as T
}

export interface SessionSummary {
  id: string
  started_at: string
  ended_at: string
  duration_s: number
  lines_delta: number
  pace_cpm: number | null
  top_lang: string | null
}

export interface SessionPage {
  sessions: SessionSummary[]
  next_cursor: string | null
}

export interface UserStreak {
  current_days: number
  longest_days: number
}

export interface UserStats {
  total_sessions: number
  total_duration_s: number
  top_lang: string | null
}

export interface Badge {
  id: string
  name: string
  description: string
  earned_at: string
}

export interface UserProfile {
  handle: string
  avatar_url: string
  created_at: string
  streak: UserStreak
  stats: UserStats
  badges: Badge[]
}

export interface AuthUser {
  id: string
  handle: string
  email: string
  avatar_url: string
}

export interface ExchangeResult {
  access_token: string
  refresh_token: string
  user: AuthUser
}

export interface RefreshResult {
  access_token: string
  refresh_token?: string
}

export interface MeResult extends AuthUser {
  privacy: string
  created_at: string
  plan?: 'free' | 'pro' | 'team'
  streak: {
    current_days: number
    longest_days: number
    last_active_date: string | null
  }
}

export function exchangeCode(code: string): Promise<ExchangeResult> {
  return getJson<ExchangeResult>('/v1/auth/cli/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
}

export function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshResult> {
  return getJson<RefreshResult>('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

export function signOut(token: string, refreshToken: string): Promise<void> {
  return getJson<void>('/v1/auth/signout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

export function getMe(token: string): Promise<MeResult> {
  return getJson<MeResult>('/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getSession(id: string): Promise<SessionDetail> {
  return getJson<SessionDetail>(`/v1/sessions/${encodeURIComponent(id)}`)
}

export type LeaderboardPeriod = 'week' | 'month' | 'alltime'

export interface LeaderboardEntry {
  rank: number
  handle: string
  avatar_url: string | null
  duration_s: number
  top_lang: string | null
  streak_days: number
}

export interface LeaderboardData {
  period: LeaderboardPeriod
  updated_at: string
  entries: LeaderboardEntry[]
}

export function getLeaderboard(
  period: LeaderboardPeriod,
): Promise<LeaderboardData> {
  return getJson<LeaderboardData>(`/v1/leaderboard?period=${period}`)
}

export interface FeedEntry {
  session: SessionSummary
  user: { handle: string; avatar_url: string | null }
}

export interface FeedPage {
  entries: FeedEntry[]
  next_cursor: string | null
}

export function getFeed(token: string, cursor?: string): Promise<FeedPage> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return getJson<FeedPage>(`/v1/feed${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getProfile(handle: string): Promise<UserProfile> {
  return getJson<UserProfile>(`/v1/users/${encodeURIComponent(handle)}`)
}

export interface FeaturedSession {
  id: string
  started_at: string
  ended_at: string
  duration_s: number
  lines_delta: number
  pace_cpm: number | null
  peak_cpm: number | null
  user: { handle: string; avatar_url: string | null }
  langs: SessionLang[]
  files: SessionFile[]
  keyboard_heatmap: KeyboardHeatmap | null
}

export interface ActivityDay {
  date: string
  duration_s: number
}

export interface StreamEntry {
  who: string
  what: string
  em: string
  session_id: string
  ts: string
}

export function getFeaturedSession(): Promise<FeaturedSession> {
  return getJson<FeaturedSession>('/v1/sessions/featured')
}

export function getActivityStats(): Promise<{ days: ActivityDay[] }> {
  return getJson<{ days: ActivityDay[] }>('/v1/stats/activity')
}

export function getActivityStream(): Promise<{ entries: StreamEntry[] }> {
  return getJson<{ entries: StreamEntry[] }>('/v1/activity/stream')
}

export function getProfileSessions(
  handle: string,
  cursor?: string,
): Promise<SessionPage> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return getJson<SessionPage>(
    `/v1/users/${encodeURIComponent(handle)}/sessions${qs}`,
  )
}
