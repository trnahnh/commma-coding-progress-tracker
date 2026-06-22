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
  card_available: boolean
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
  display_name: string | null
  pronouns: string | null
  bio: string | null
  website: string | null
  location: string | null
  company: string | null
  job_title: string | null
  linkedin: string | null
  open_to_work: boolean
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
  plan?: 'free' | 'pro' | 'team'
  display_name: string | null
  bio: string | null
  website: string | null
  location: string | null
  school: string | null
  field_of_study: string | null
  company: string | null
  job_title: string | null
  pronouns: string | null
  linkedin: string | null
  open_to_work: boolean
  created_at: string
  streak: {
    current_days: number
    longest_days: number
    last_active_date: string | null
  }
}

export interface ProfileUpdate {
  display_name?: string | null
  bio?: string | null
  website?: string | null
  location?: string | null
  school?: string | null
  field_of_study?: string | null
  company?: string | null
  job_title?: string | null
  pronouns?: string | null
  linkedin?: string | null
  open_to_work?: boolean
  privacy?: 'full' | 'summary' | 'off'
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

export function updateProfile(
  token: string,
  data: ProfileUpdate,
): Promise<MeResult> {
  return getJson<MeResult>('/v1/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
}

export function deleteAccount(token: string): Promise<void> {
  return requestVoid('/v1/me', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getSession(id: string): Promise<SessionDetail> {
  return getJson<SessionDetail>(`/v1/sessions/${encodeURIComponent(id)}`)
}

export function heatmapCardUrl(id: string): string {
  return `${API_BASE_URL}/v1/sessions/${encodeURIComponent(id)}/heatmap-card?aspect=16:9`
}

export type PaidPlan = 'pro' | 'team'
export type BillingInterval = 'monthly' | 'yearly'

export function createCheckout(
  token: string,
  plan: PaidPlan,
  interval: BillingInterval,
): Promise<{ url: string }> {
  return getJson<{ url: string }>('/v1/billing/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan, interval }),
  })
}

export function openBillingPortal(token: string): Promise<{ url: string }> {
  return getJson<{ url: string }>('/v1/billing/portal', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
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

export type HealthState = 'ok' | 'down'

export interface SystemStatus {
  api: HealthState
  db: HealthState
  cache: HealthState
  ts: number
}

export function getStatus(): Promise<SystemStatus> {
  return getJson<SystemStatus>('/v1/status')
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

async function requestVoid(path: string, init?: RequestInit): Promise<void> {
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
}

export interface TeamSummary {
  slug: string
  name: string
  role: string
  created_at: string
  frozen: boolean
}

export interface TeamMember {
  handle: string
  avatar_url: string | null
  role: string
  joined_at: string
}

export interface TeamDetail {
  slug: string
  name: string
  created_at: string
  frozen: boolean
  member_count: number
  max_members: number
  members: TeamMember[]
}

export interface TeamInvite {
  id: string
  team: { slug: string; name: string }
  invited_by: string
  created_at: string
}

export interface TeamLeaderboardEntry {
  rank: number
  handle: string
  avatar_url: string | null
  role: string
  duration_s: number
  streak_days: number
}

export interface TeamLeaderboardData {
  slug: string
  period: LeaderboardPeriod
  updated_at: string
  entries: TeamLeaderboardEntry[]
}

export function getMyTeams(token: string): Promise<{ teams: TeamSummary[] }> {
  return getJson<{ teams: TeamSummary[] }>('/v1/teams', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function createTeam(
  token: string,
  data: { name: string; slug: string },
): Promise<{ slug: string; name: string; created_at: string }> {
  return getJson('/v1/teams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
}

export function getTeamInvites(
  token: string,
): Promise<{ invites: TeamInvite[] }> {
  return getJson<{ invites: TeamInvite[] }>('/v1/teams/invites', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function acceptInvite(
  token: string,
  id: string,
): Promise<{ team: { slug: string; name: string } }> {
  return getJson(
    `/v1/teams/invites/${encodeURIComponent(id)}/accept`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
}

export function declineInvite(token: string, id: string): Promise<void> {
  return requestVoid(
    `/v1/teams/invites/${encodeURIComponent(id)}/decline`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
}

export function getTeam(token: string, slug: string): Promise<TeamDetail> {
  return getJson<TeamDetail>(`/v1/teams/${encodeURIComponent(slug)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function updateTeam(
  token: string,
  slug: string,
  data: { name: string },
): Promise<{ slug: string; name: string; created_at: string }> {
  return getJson(`/v1/teams/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
}

export function deleteTeam(token: string, slug: string): Promise<void> {
  return requestVoid(`/v1/teams/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function inviteMember(
  token: string,
  slug: string,
  handle: string,
): Promise<{ id: string }> {
  return getJson(`/v1/teams/${encodeURIComponent(slug)}/invites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ handle }),
  })
}

export function removeMember(
  token: string,
  slug: string,
  handle: string,
): Promise<void> {
  return requestVoid(
    `/v1/teams/${encodeURIComponent(slug)}/members/${encodeURIComponent(handle)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  )
}

export function getTeamLeaderboard(
  token: string,
  slug: string,
  period: LeaderboardPeriod,
): Promise<TeamLeaderboardData> {
  return getJson<TeamLeaderboardData>(
    `/v1/teams/${encodeURIComponent(slug)}/leaderboard?period=${period}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
}

export function getTeamHeatmap(
  token: string,
  slug: string,
): Promise<KeyboardHeatmap> {
  return getJson<KeyboardHeatmap>(
    `/v1/teams/${encodeURIComponent(slug)}/heatmap`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
}

export interface RecapData {
  week_start: string
  week_end: string
  session_count: number
  total_duration_s: number
  best_duration_s: number
  best_session_id: string | null
  top_lang: string | null
  current_streak_days: number
  prior_week_duration_s: number
  week_over_week_pct: number | null
  headline: string
  note: string
}

export function getRecap(token: string): Promise<RecapData> {
  return getJson<RecapData>('/v1/recap', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function joinWaitlist(
  email: string,
  source = 'landing',
): Promise<{ ok: boolean }> {
  return getJson<{ ok: boolean }>('/v1/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source }),
  })
}
