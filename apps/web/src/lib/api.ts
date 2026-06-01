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

export interface UserProfile {
  handle: string
  avatar_url: string
  created_at: string
  streak: UserStreak
  stats: UserStats
  badges: never[]
}

export function getSession(id: string): Promise<SessionDetail> {
  return getJson<SessionDetail>(`/v1/sessions/${encodeURIComponent(id)}`)
}

export function getProfile(handle: string): Promise<UserProfile> {
  return getJson<UserProfile>(`/v1/users/${encodeURIComponent(handle)}`)
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
