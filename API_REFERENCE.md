# API Reference

Version 1.0 · May 2026

**Base URL (production):** `https://api.commma.dev`  
**Base URL (local dev):** `http://localhost:3000`

All request and response bodies are JSON. All timestamps are ISO 8601 strings unless noted.

---

## Authentication

commma uses JWT bearer tokens with HTTP-only cookie refresh tokens.

```text
Authorization: Bearer <access_token>
```

Access tokens expire in 15 minutes. Use the refresh endpoint to rotate.

---

## Auth Endpoints

### `GET /v1/auth/github`

Redirects the browser to GitHub OAuth. Use from a browser-based sign-in flow or from the extension's loopback flow (ADR-011).

**Auth:** None  
**Query params:** `redirect_uri` *(optional)* — a loopback URL (`http://127.0.0.1:<port>/...` or `http://localhost:<port>/...`) to send the browser to after auth completes. Present only for the extension/CLI flow; rejected with `400 VALIDATION_ERROR` if not a loopback address.  
**Response:** `302` redirect to GitHub

---

### `GET /v1/auth/github/callback`

Exchanges the GitHub code for a user identity. Behaviour depends on the flow:

- **Browser flow** (no `redirect_uri` was sent to `/github`): mints a single-use
  one-time code (60s TTL, Redis) and `302`-redirects to
  `${WEB_ORIGIN}/auth/callback?code=<code>`. The web app exchanges the code at
  `POST /v1/auth/cli/exchange` to receive tokens.
- **Extension/CLI flow** (`redirect_uri` was sent): same one-time code mechanism,
  but redirects to the loopback `redirect_uri?code=<code>`.

**Auth:** None  
**Query params:** `code` — GitHub authorization code; `state` — CSRF state

**Response:** `302` redirect in both flows — no JSON body.

---

### `POST /v1/auth/cli/exchange`

Exchanges a one-time code (from the extension/CLI loopback flow) for tokens. The code is single-use and expires after 60 seconds.

**Auth:** None  
**Body:** `{ "code": "<one-time-code>" }`

**Response:**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "<opaque>",
  "user": {
    "id": "uuid",
    "handle": "yoursquid",
    "email": "user@example.com",
    "avatar_url": "https://avatars.githubusercontent.com/..."
  }
}
```

Returns `401 UNAUTHORIZED` if the code is invalid or expired.

---

### `POST /v1/auth/refresh`

Rotates the refresh token and issues a new access token.

**Auth:** the refresh token, supplied **either** as the HTTP-only cookie (browser) **or** in the JSON body `{ "refresh_token": "<opaque>" }` (extension).

**Response:**

- Cookie flow: `{ "access_token": "eyJ..." }` (rotated token set as the new cookie).
- Body flow: `{ "access_token": "eyJ...", "refresh_token": "<opaque>" }` (rotated token returned for the caller to persist).

---

### `POST /v1/auth/signout`

Revokes the refresh token (the cookie's, and/or the one supplied in the body).

**Auth:** JWT. Optionally include `{ "refresh_token": "<opaque>" }` in the body to revoke the extension's stored token.  
**Response:** `204 No Content`

---

## User Endpoints

### `GET /v1/me`

Returns the authenticated user's profile.

**Auth:** Required

**Response:**

```json
{
  "id": "uuid",
  "handle": "yoursquid",
  "email": "user@example.com",
  "avatar_url": "...",
  "privacy": "full",
  "created_at": "2026-05-01T10:00:00Z",
  "streak": {
    "current_days": 12,
    "longest_days": 34,
    "last_active_date": "2026-05-27"
  }
}
```

---

### `GET /v1/users/:handle`

Returns a public profile.

**Auth:** None

**Response:**

```json
{
  "handle": "yoursquid",
  "avatar_url": "...",
  "created_at": "2026-05-01T10:00:00Z",
  "streak": { "current_days": 12, "longest_days": 34 },
  "stats": {
    "total_sessions": 142,
    "total_duration_s": 1843200,
    "top_lang": "TypeScript"
  },
  "badges": ["vim-athlete", "mouse-free"]
}
```

**Implementation status (Phase 2):** live. `stats` are aggregated from
`sessions`/`session_langs` (`total_sessions`, `total_duration_s`, and the
all-time `top_lang`). Gated by `privacy`: an `off` user is `404` to everyone but
the owner (send a bearer). `badges` is always `[]` for now (the badge system is
Phase 4).

---

### `GET /v1/users/:handle/sessions`

Returns a public session list for a user. Paginated.

**Auth:** None  
**Query params:**

- `cursor` — opaque pagination cursor
- `limit` — items per page (default `20`, max `100`)

**Response:**

```json
{
  "sessions": [ ...SessionSummary ],
  "next_cursor": "opaque-string-or-null"
}
```

---

### `POST /v1/users/:handle/follow`

Follow a user.

**Auth:** Required  
**Response:** `204 No Content`

---

### `DELETE /v1/users/:handle/follow`

Unfollow a user.

**Auth:** Required  
**Response:** `204 No Content`

**Implementation status (Phase 2):** both follow and unfollow are live and
idempotent (re-following or unfollowing when no edge exists still returns
`204`). Following yourself is `400 VALIDATION_ERROR`; following a `privacy='off'`
user (invisible to you) is `404`. `GET /v1/users/:handle/sessions` is also live
with the same privacy gating and keyset cursor as `GET /v1/sessions`.

---

## Ingest Endpoint

### `POST /v1/ingest`

Ingests a batch of heartbeat events from the extension.

**Auth:** Required

**Request body:**

```json
{
  "events": [
    {
      "id": "uuid",
      "ts": 1748390400000,
      "lang": "TypeScript",
      "file": "apps/api/src/routes/ingest.ts",
      "project": "commma",
      "keystrokes": 234,
      "lines": 12,
      "key_freq": {
        "j": 14,
        "k": 11,
        "Backspace": 8,
        "Enter": 5
      }
    }
  ]
}
```

**Notes:**

- `file` and `key_freq` are dropped server-side (never stored) when the user's privacy is `summary`; an `off` user's events are discarded entirely — enforcement does not rely on the client
- `id` is used for idempotency — duplicate event IDs are silently dropped
- Maximum 500 events per batch; the whole request body is capped at 1 MB (`413 PAYLOAD_TOO_LARGE` over that)
- Field caps: `lang` ≤ 64, `file` ≤ 1024, `project` ≤ 256 chars; `keystrokes` 0–1,000,000; `lines` −1,000,000–1,000,000; `ts` ≤ `4102444800000` — anything over fails `400 VALIDATION_ERROR`
- All `key_freq` keys must be normalized key labels (see [Key Label Reference](#key-label-reference))

**Response:** `202 Accepted`

```json
{ "received": 1, "duplicate": 0 }
```

**Errors:**

- `400` — Zod validation failed
- `429` — rate limit exceeded (1,000 req/hour per user)

---

## Session Endpoints

### `GET /v1/sessions`

Returns the authenticated user's sessions, paginated.

**Auth:** Required  
**Query params:** `cursor`, `limit` (default `20`, max `100`)

**Response:**

```json
{
  "sessions": [
    {
      "id": "uuid",
      "started_at": "2026-05-26T08:42:00Z",
      "ended_at": "2026-05-26T11:00:00Z",
      "duration_s": 8280,
      "lines_delta": 1247,
      "pace_cpm": 184,
      "top_lang": "TypeScript"
    }
  ],
  "next_cursor": "..."
}
```

---

### `GET /v1/sessions/:id`

Returns full session detail including language breakdown, top files, and keyboard heatmap.

**Auth:** Optional. Public, gated by the owner's `privacy`: sessions of `full`/`summary` users are viewable by anyone; sessions of `off` users are owner-only (a valid bearer matching the owner). Non-owners requesting an `off` user's session receive `404`. For `summary` owners, non-owners receive an empty `files` array and `keyboard_heatmap: null` (the owner still sees them); this covers data captured before the user switched to `summary`.

**Response:**

```json
{
  "id": "uuid",
  "started_at": "2026-05-26T08:42:00Z",
  "ended_at": "2026-05-26T11:00:00Z",
  "duration_s": 8280,
  "lines_delta": 1247,
  "pace_cpm": 184,
  "peak_cpm": 241,
  "peak_at": "2026-05-26T09:51:00Z",
  "langs": [
    { "lang": "TypeScript", "duration_s": 4320, "pct": 52.2 },
    { "lang": "Python",     "duration_s": 1860, "pct": 22.5 }
  ],
  "files": [
    { "path": "apps/api/src/routes/sessions.ts", "changes": 423 }
  ],
  "keyboard_heatmap": {
    "counts": { "j": 1420, "k": 980, "Backspace": 610 },
    "freq":   { "j": 0.21, "k": 0.14, "Backspace": 0.09 },
    "total":  6844
  }
}
```

---

### `POST /v1/sessions/:id/heatmap-card`

Generates a server-side PNG of the keyboard heatmap card for OG image use.

**Auth:** Required

**Request body:**

```json
{
  "layout":       "qwerty",
  "aspect":       "16:9",
  "show_handle":  true,
  "show_stats":   true
}
```

`layout`: `qwerty` | `dvorak` | `colemak` — only `qwerty` is implemented; others return `400 VALIDATION_ERROR` (dvorak/colemak are Phase 4)  
`aspect`: `9:16` (1080×1920) | `1:1` (1080×1080) | `16:9` (1920×1080, default)  
`show_handle` / `show_stats`: default `true` — overlay `@handle` and `<pace> cpm · <top lang>`

All fields are optional; an empty `{}` body uses the defaults.

**Privacy:** gated like `GET /v1/sessions/:id` — a session whose owner is not `full` is renderable only by the owner; otherwise `404`. A session with no heatmap returns `404`.

**Caching:** `Cache-Control: private, max-age=300`.

**Response:** `image/png` (binary)

---

## Leaderboard Endpoint

### `GET /v1/leaderboard`

Returns the top 100 users by coding time for the given period.

**Auth:** None  
**Query params:**

- `period` — `week` (default) | `month` | `alltime`
- `lang` — filter by language (e.g. `lang=TypeScript`)

**Response:**

```json
{
  "period": "week",
  "updated_at": "2026-05-26T12:00:00Z",
  "entries": [
    {
      "rank": 1,
      "handle": "falsetto",
      "avatar_url": "...",
      "duration_s": 152284,
      "top_lang": "Rust",
      "streak_days": 87,
      "delta": 0
    }
  ]
}
```

`delta` — rank change since the previous period snapshot (`+N` up, `-N` down, `0` unchanged).

**Implementation status (Phase 2):** live, public. Reads the period's Redis
sorted set (top 100) and hydrates handle/avatar/streak/top-lang from PostgreSQL;
users with `privacy = 'off'` are excluded. If the period's set is missing (Redis
wiped), it is rebuilt by summing `sessions.duration_s` over the period window
(ADR-007/ADR-010). **Not yet implemented:** the `lang` query param (requires
per-language sorted sets, not maintained today) and the `delta` field (requires
period snapshots) — both are omitted from the current response.

---

## Feed Endpoint

### `GET /v1/feed`

Returns recent sessions from users the authenticated user follows.

**Auth:** Required  
**Query params:** `cursor`, `limit` (default `20`, max `50`)

**Response:**

```json
{
  "entries": [
    {
      "session": { "...SessionSummary": "..." },
      "user": {
        "handle": "lumen.dev",
        "avatar_url": "..."
      }
    }
  ],
  "next_cursor": "..."
}
```

**Implementation status (Phase 2):** live. Returns sessions from users the
caller follows, newest first, keyset-paginated (`limit` default `20`, max `50`).
Followees who later set `privacy='off'` are excluded from the feed. Each
`session` is the same `SessionSummary` shape as `GET /v1/sessions`.

---

## Error Format

All errors follow this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": []
  }
}
```

| Code | HTTP Status | Description |
| ------ | ------------- | ------------- |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Request body/params failed Zod validation |
| `PAYLOAD_TOO_LARGE` | 413 | Request body exceeded the 1 MB `/v1/*` limit |
| `RATE_LIMITED` | 429 | Per-user rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limits

| Endpoint group | Limit | Window |
| ---------------- | ------- | -------- |
| `POST /v1/ingest` | 1,000 requests | 1 hour (per user) |
| All read endpoints | 300 requests | 1 hour (per user) |
| Auth endpoints | 20 requests | 1 hour (per IP) |

**Rate limit headers:**

```text
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1748394000
```

---

## Key Label Reference

`key_freq` keys must use normalized labels from this set:

| Category | Labels |
| ---------- | -------- |
| Letters | `a`–`z` (lowercase) |
| Digits | `0`–`9` |
| Editing | `Backspace`, `Delete`, `Enter`, `Tab`, `Escape` |
| Modifiers | `Shift`, `Control`, `Alt`, `Meta` |
| Navigation | `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Home`, `End`, `PageUp`, `PageDown` |
| Function | `F1`–`F12` |
| Other | Anything outside this set — omit or bucket as `Other` |
