# API Reference

Version 1.0 · May 2026

**Base URL (production):** `https://api.commma.dev`  
**Base URL (local dev):** `http://localhost:3000`

All request and response bodies are JSON. All timestamps are ISO 8601 strings
unless noted.

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

Redirects the browser to GitHub OAuth. Use from a browser-based sign-in flow or
from the extension's loopback flow (ADR-011).

**Auth:** None  
**Query params:** `redirect_uri` _(optional)_ — a loopback URL
(`http://127.0.0.1:<port>/...` or `http://localhost:<port>/...`) to send the
browser to after auth completes. Present only for the extension/CLI flow;
rejected with `400 VALIDATION_ERROR` if not a loopback address.  
**Response:** `302` redirect to GitHub

---

### `GET /v1/auth/github/callback`

Exchanges the GitHub code for a user identity. Behaviour depends on the flow:

- **Browser flow** (no `redirect_uri` was sent to `/github`): mints a single-use
  one-time code (60s TTL, Redis) and `302`-redirects to
  `${WEB_ORIGIN}/auth/callback?code=<code>`. The web app exchanges the code at
  `POST /v1/auth/cli/exchange` to receive tokens.
- **Extension/CLI flow** (`redirect_uri` was sent): same one-time code
  mechanism, but redirects to the loopback `redirect_uri?code=<code>`.

**Auth:** None  
**Query params:** `code` — GitHub authorization code; `state` — CSRF state

**Response:** `302` redirect in both flows — no JSON body.

---

### `POST /v1/auth/cli/exchange`

Exchanges a one-time code (from the extension/CLI loopback flow) for tokens. The
code is single-use and expires after 60 seconds.

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

**Auth:** the refresh token, supplied **either** as the HTTP-only cookie
(browser) **or** in the JSON body `{ "refresh_token": "<opaque>" }` (extension).

**Response:**

- Cookie flow: `{ "access_token": "eyJ..." }` (rotated token set as the new
  cookie).
- Body flow: `{ "access_token": "eyJ...", "refresh_token": "<opaque>" }`
  (rotated token returned for the caller to persist).

---

### `POST /v1/auth/signout`

Revokes the refresh token (the cookie's, and/or the one supplied in the body).

**Auth:** JWT. Optionally include `{ "refresh_token": "<opaque>" }` in the body
to revoke the extension's stored token.  
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
  "badges": [
    {
      "id": "vim-athlete",
      "name": "Vim athlete",
      "description": "Leans on Escape and almost never reaches for the arrow keys."
    },
    {
      "id": "mouse-free",
      "name": "Mouse-free",
      "description": "Moves through the file by keyboard instead of the mouse."
    }
  ]
}
```

**Implementation status (Phase 4):** live. `stats` are aggregated from
`sessions`/`session_langs` (`total_sessions`, `total_duration_s`, and the
all-time `top_lang`). Gated by `privacy`: an `off` user is `404` to everyone but
the owner (send a bearer).

`badges` are computed server-side from the user's all-time `keyboard_heatmap`
key counts (summed across sessions in Postgres) and cached in Redis for ~10
minutes per user, so a hot profile does not re-scan every request. A profile
must have at least 2000 tracked keystrokes before any badge is awarded;
otherwise `badges` is `[]`. The catalog and the share thresholds (over total
keystrokes) are:

| Badge             | Earned when                                               |
| ----------------- | --------------------------------------------------------- |
| `vim-athlete`     | Escape ≥ 2% **and** arrow keys ≤ 1%                       |
| `mouse-free`      | navigation keys (arrows + Home/End/PageUp/PageDown) ≥ 10% |
| `backspace-heavy` | Backspace + Delete ≥ 12%                                  |
| `arrow-navigator` | arrow keys ≥ 6%                                           |

The thresholds are heuristics (centralized in `lib/badges.ts`) and may be
re-tuned once real usage data exists. `vim-athlete` and `arrow-navigator` are
mutually exclusive by construction. Badges are only computed for `full`-privacy
profiles — `summary` and `off` users earn none, applied at request time so a
privacy downgrade hides badges immediately regardless of cache.

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
`204`). Following yourself is `400 VALIDATION_ERROR`; following a
`privacy='off'` user (invisible to you) is `404`.
`GET /v1/users/:handle/sessions` is also live with the same privacy gating and
keyset cursor as `GET /v1/sessions`.

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

- `file` and `key_freq` are dropped server-side (never stored) when the user's
  privacy is `summary`; an `off` user's events are discarded entirely —
  enforcement does not rely on the client
- `id` is used for idempotency — duplicate event IDs are silently dropped
- Maximum 500 events per batch; the whole request body is capped at 1 MB
  (`413 PAYLOAD_TOO_LARGE` over that)
- Field caps: `lang` ≤ 64, `file` ≤ 1024, `project` ≤ 256 chars; `keystrokes`
  0–1,000,000; `lines` −1,000,000–1,000,000; `ts` ≤ `4102444800000` — anything
  over fails `400 VALIDATION_ERROR`
- `ts` is additionally clamped to a server-side window: the batch is rejected
  with `400 VALIDATION_ERROR` if any event is more than 5 minutes in the future
  (clock-skew tolerance) or more than 30 days old (the offline buffer's flush
  horizon). This prevents future-dated events from pinning a session open
  indefinitely
- All `key_freq` keys must be normalized key labels (see
  [Key Label Reference](#key-label-reference))

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

Returns full session detail including language breakdown, top files, and
keyboard heatmap.

**Auth:** Optional. Public, gated by the owner's `privacy`: sessions of
`full`/`summary` users are viewable by anyone; sessions of `off` users are
owner-only (a valid bearer matching the owner). Non-owners requesting an `off`
user's session receive `404`. For `summary` owners, non-owners receive an empty
`files` array and `keyboard_heatmap: null` (the owner still sees them); this
covers data captured before the user switched to `summary`.

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
    { "lang": "Python", "duration_s": 1860, "pct": 22.5 }
  ],
  "files": [{ "path": "apps/api/src/routes/sessions.ts", "changes": 423 }],
  "keyboard_heatmap": {
    "counts": { "j": 1420, "k": 980, "Backspace": 610 },
    "freq": { "j": 0.21, "k": 0.14, "Backspace": 0.09 },
    "total": 6844
  },
  "card_available": true
}
```

`card_available` is `true` only when the owner is `privacy: "full"` and the
session has a non-empty heatmap — exactly the condition the public
`GET /v1/sessions/:id/heatmap-card` below requires to return `200` instead of
`404`. The web session-detail page uses this flag to decide whether to point its
`og:image` at the heatmap card or fall back to the site default.

---

### `POST /v1/sessions/:id/heatmap-card`

Generates a server-side PNG of the keyboard heatmap card for OG image use.

**Auth:** Required

**Request body:**

```json
{
  "layout": "qwerty",
  "aspect": "16:9",
  "show_handle": true,
  "show_stats": true
}
```

`layout`: `qwerty` | `dvorak` | `colemak` — only `qwerty` is implemented; others
return `400 VALIDATION_ERROR` (dvorak/colemak are Phase 4)  
`aspect`: `9:16` (1080×1920) | `1:1` (1080×1080) | `16:9` (1920×1080, default)  
`show_handle` / `show_stats`: default `true` — overlay `@handle` and
`<pace> cpm · <top lang>`

All fields are optional; an empty `{}` body uses the defaults.

**Privacy:** gated like `GET /v1/sessions/:id` — a session whose owner is not
`full` is renderable only by the owner; otherwise `404`. A session with no
heatmap returns `404`.

**Caching:** `Cache-Control: private, max-age=300`. The rendered PNG is cached
in Redis for 10 minutes keyed by session + render options
(`card:v1:<id>:<aspect>:<layout>:h-<handle>|H:<s|S>`), so repeated requests skip
the `sharp` rasterization. The drawn `@handle` is part of the key, so a handle
rename serves a fresh card immediately rather than a stale one. The cache is
fail-open (a Redis outage just re-renders) and stores only the image bytes —
privacy is re-checked against Postgres on every request before any cached image
is served.

**Response:** `image/png` (binary)

> **Notes / limitations:**
>
> - Rate-limited on its own `card` bucket (120/hr/user), separate from reads.
> - Server-side text uses the host's fonts; the deploy must provide a monospace
>   font (e.g. DejaVu/Liberation). The `⌘` cap is drawn as `Cmd` so it never
>   depends on a glyph missing from common Linux fonts.
> - Auth-required `POST` serves in-app (e.g. feed) thumbnails. Crawlers issue
>   unauthenticated `GET`, so use the public `GET` variant below for `og:image`.

---

### `GET /v1/sessions/:id/heatmap-card`

Public crawler-facing variant of the heatmap card, suitable as a literal
`og:image` URL. No auth — only sessions whose owner is `privacy: "full"` are
renderable; any other owner (`summary`/`off`) or a session with no heatmap
returns `404` (no existence leak), exactly like the public
`GET /v1/sessions/:id`.

**Auth:** None

**Query parameters:**

| Param    | Values                                           | Default  |
| -------- | ------------------------------------------------ | -------- |
| `aspect` | `9:16` (1080×1920), `1:1` (1080×1080), `16:9`    | `16:9`   |
| `layout` | `qwerty` (only `qwerty` implemented; else `400`) | `qwerty` |

The `@handle` and `<pace> cpm · <top lang>` overlays are always drawn (there are
no toggles on the public variant). Invalid `aspect`/`layout` →
`400 VALIDATION_ERROR`.

**Caching:** `Cache-Control: public, max-age=600`, plus the same Redis PNG cache
as the `POST` (shared key space — a public `GET` and an owner `POST` with
default options resolve to identical bytes and the same cache entry). Privacy is
re-checked on every request before a cached image is served.

**Anti-DoS:** rate-limited on the `card` bucket at 120/hr **per IP**; the Redis
PNG cache absorbs repeated crawler hits for the same card.

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

`delta` — rank change since the previous period snapshot (`+N` up, `-N` down,
`0` unchanged).

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

### `GET /v1/sessions/featured`

Returns the most recent public session with a keyboard heatmap for use on the
landing page.

**Auth:** None  
**Rate limit:** 300/hr per IP  
**Cache-Control:** `public, max-age=300`

**Response:**

```json
{
  "id": "...",
  "started_at": "2026-06-01T08:42:00Z",
  "ended_at": "2026-06-01T11:00:00Z",
  "duration_s": 8280,
  "lines_delta": 1247,
  "pace_cpm": 184,
  "peak_cpm": 210,
  "user": { "handle": "northbound", "avatar_url": "..." },
  "langs": [{ "lang": "TypeScript", "duration_s": 4320, "pct": 52.0 }],
  "files": [{ "path": "apps/api/src/sessions.ts", "changes": 423 }],
  "keyboard_heatmap": { "counts": {}, "freq": {}, "total": 0 }
}
```

Selection: most recent `privacy='full'` session with a heatmap and
`duration_s >= 300`. Returns `404` if no qualifying session exists.

---

### `GET /v1/stats/activity`

Returns 60 days of aggregated daily coding activity across all public users, for
the landing-page sparkline chart.

**Auth:** None  
**Rate limit:** 300/hr per IP  
**Cache-Control:** `public, max-age=3600`

**Response:**

```json
{
  "days": [
    { "date": "2026-04-04", "duration_s": 18600 },
    { "date": "2026-04-05", "duration_s": 0 }
  ]
}
```

Always returns exactly 60 entries (oldest → newest, UTC calendar days). Missing
days are filled with `duration_s: 0`. Excludes `privacy='off'` users.

---

### `GET /v1/activity/stream`

Returns recent activity entries derived from finished sessions, for the
landing-page ticker marquee.

**Auth:** None  
**Rate limit:** 300/hr per IP  
**Cache-Control:** `public, max-age=60`

**Response:**

```json
{
  "entries": [
    {
      "who": "northbound",
      "what": "finished a 2h 14m session in",
      "em": "Go",
      "session_id": "...",
      "ts": "2026-06-01T11:00:00Z"
    },
    {
      "who": "falsetto",
      "what": "+1,204 lines in",
      "em": "Rust",
      "session_id": "...",
      "ts": "2026-06-01T10:00:00Z"
    }
  ]
}
```

Up to 30 entries from the last 30 days, newest first. Sessions shorter than 10
minutes with fewer than 100 lines are omitted. Excludes `privacy='off'` users.
Each entry maps to exactly one session.

---

## Billing Endpoints

Stripe-backed subscription billing for the Pro and Team tiers. Billing is
optional: if the server has no Stripe keys configured, every billing endpoint
returns `503 SERVICE_UNAVAILABLE` and all accounts stay on `plan: "free"`. The
plan a user is on is read from `GET /v1/me` (`plan` field).

### `POST /v1/billing/checkout`

Creates a Stripe Checkout session for a subscription and returns its hosted URL.
A Stripe customer is created for the user on first use and remembered.

**Auth:** Required  
**Rate limit:** 30/hr per user

**Request:**

```json
{
  "plan": "pro",
  "interval": "monthly"
}
```

`plan` is `pro` or `team`; `interval` is `monthly` or `yearly`. A plan whose
price is not configured returns `503 SERVICE_UNAVAILABLE`. A user who is already
on a paid plan (or already has a subscription on file) gets `409 CONFLICT` —
plan changes go through the billing portal, not a second checkout, so the client
should fall back to `POST /v1/billing/portal`. The session create is idempotent
per `(user, plan, interval)`, so a rapid double-submit returns the same hosted
URL rather than opening two subscriptions.

**Response:**

```json
{
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

Redirect the browser to `url`. On success Stripe redirects to
`${WEB_ORIGIN}/billing/success`; on cancel to `${WEB_ORIGIN}/pricing`.

### `POST /v1/billing/portal`

Creates a Stripe Billing Portal session so the user can manage or cancel their
subscription. Returns `404 NOT_FOUND` if the user has no billing account yet.

**Auth:** Required  
**Rate limit:** 30/hr per user

**Response:**

```json
{
  "url": "https://billing.stripe.com/p/session/..."
}
```

### `POST /v1/billing/webhook`

Stripe → API webhook. Not called by clients; authenticated by the Stripe
signature in the `stripe-signature` header (verified against
`STRIPE_WEBHOOK_SECRET`) rather than a JWT. A missing or invalid signature
returns `401`/`400`. `customer.subscription.created|updated|deleted` owns
`users.plan` (`free`/`pro`/`team`, derived from the subscription's price and
status); `checkout.session.completed` only records the customer/subscription
IDs. Because Stripe delivers at-least-once and unordered, the plan update is
idempotent and ordering-safe: it applies only when the event is newer than the
last one recorded for that customer (a `stripe_event_ts` watermark), so a
redelivered or out-of-order stale event is ignored. Responds
`{ "received": true }`.

**Rate limit:** 600/hr per IP — Stripe is authenticated by signature, so the
bucket only bounds abuse of the unauthenticated path; it fails open if Redis is
down so genuine Stripe retries are never dropped.

---

## Team Endpoints

Teams are private workspaces for the Team tier. Every team endpoint requires
authentication, and team detail, leaderboard, and heatmap are visible only to
members — a non-member receives `404` so a team's existence is never leaked. A
team has one `owner` and up to four `member`s (five total, `TEAM_MAX_MEMBERS`).
Only the owner can rename, invite, remove members, or delete the team. Invites
target an existing user by `handle`; the invitee accepts or declines from their
own invite inbox.

If the owner is no longer on `plan: "team"` (e.g. their subscription lapsed),
the team is **frozen**: growth writes — invite, accept, and rename — return
`403 FORBIDDEN`, while all reads stay available and a member can still leave and
the owner can still delete. `GET /v1/teams` and `GET /v1/teams/:slug` expose a
`frozen` boolean.

### `POST /v1/teams`

Creates a team. The caller must be on `plan: "team"` (else `403 FORBIDDEN`) and
becomes its `owner`. `slug` must match `^[a-z0-9-]{1,39}$` and be unique
(`409 CONFLICT` if taken).

**Auth:** Required  
**Rate limit:** 300/hr per user

**Request:**

```json
{
  "name": "Platform Team",
  "slug": "platform"
}
```

**Response (`201`):**

```json
{
  "slug": "platform",
  "name": "Platform Team",
  "created_at": "2026-06-11T20:00:00.000Z"
}
```

### `GET /v1/teams`

Lists the teams the caller belongs to.

**Auth:** Required  
**Rate limit:** 300/hr per user

**Response:**

```json
{
  "teams": [
    {
      "slug": "platform",
      "name": "Platform Team",
      "role": "owner",
      "created_at": "2026-06-11T20:00:00.000Z",
      "frozen": false
    }
  ]
}
```

### `GET /v1/teams/invites`

Lists the caller's pending invites.

**Auth:** Required  
**Rate limit:** 300/hr per user

**Response:**

```json
{
  "invites": [
    {
      "id": "0547fc57-33ac-401c-bd83-b31d8fb0d698",
      "team": { "slug": "platform", "name": "Platform Team" },
      "invited_by": "octocat",
      "created_at": "2026-06-11T20:05:00.000Z"
    }
  ]
}
```

### `POST /v1/teams/invites/:id/accept`

Accepts an invite addressed to the caller and joins the team. Returns
`404 NOT_FOUND` if the invite is not theirs, `403 FORBIDDEN` if the team is
frozen, and `409 CONFLICT` if the team is already full. The capacity check runs
under a row lock on the team, so concurrent accepts cannot exceed the cap.

**Auth:** Required  
**Rate limit:** 300/hr per user

**Response:**

```json
{
  "team": { "slug": "platform", "name": "Platform Team" }
}
```

### `POST /v1/teams/invites/:id/decline`

Declines (deletes) an invite addressed to the caller. Responds `204`.

**Auth:** Required  
**Rate limit:** 300/hr per user

### `GET /v1/teams/:slug`

Returns team detail and the member roster. Members only.

**Auth:** Required  
**Rate limit:** 300/hr per user

**Response:**

```json
{
  "slug": "platform",
  "name": "Platform Team",
  "created_at": "2026-06-11T20:00:00.000Z",
  "frozen": false,
  "member_count": 3,
  "max_members": 5,
  "members": [
    {
      "handle": "octocat",
      "avatar_url": "https://avatars.githubusercontent.com/u/1",
      "role": "owner",
      "joined_at": "2026-06-11T20:00:00.000Z"
    }
  ]
}
```

### `PATCH /v1/teams/:slug`

Renames the team. Owner only.

**Auth:** Required  
**Rate limit:** 300/hr per user

**Request:**

```json
{ "name": "Platform Guild" }
```

### `DELETE /v1/teams/:slug`

Deletes the team and all its memberships and invites. Owner only. Responds
`204`.

**Auth:** Required  
**Rate limit:** 300/hr per user

### `POST /v1/teams/:slug/invites`

Invites an existing user by `handle`. Owner only. Returns `404 NOT_FOUND` if no
such user, and `409 CONFLICT` if the user is already a member, already invited,
or the team (members plus pending invites) is full.

**Auth:** Required  
**Rate limit:** 300/hr per user

**Request:**

```json
{ "handle": "monalisa" }
```

**Response (`201`):**

```json
{ "id": "0547fc57-33ac-401c-bd83-b31d8fb0d698" }
```

### `DELETE /v1/teams/:slug/members/:handle`

Removes a member. The owner may remove any member; a member may remove only
themselves (leave). The owner cannot leave — delete the team instead
(`400 VALIDATION_ERROR`). Responds `204`.

**Auth:** Required  
**Rate limit:** 300/hr per user

### `GET /v1/teams/:slug/leaderboard`

Private leaderboard ranking each member by total coding time over a period.
Members only. `?period=week|month|alltime` (default `week`). Unlike the public
leaderboard, every member is included regardless of their public `privacy`
setting, since the team is private and members joined deliberately.

**Auth:** Required  
**Rate limit:** 300/hr per user

**Response:**

```json
{
  "slug": "platform",
  "period": "week",
  "updated_at": "2026-06-11T20:10:00.000Z",
  "entries": [
    {
      "rank": 1,
      "handle": "octocat",
      "avatar_url": "https://avatars.githubusercontent.com/u/1",
      "role": "owner",
      "duration_s": 7200,
      "streak_days": 4
    }
  ]
}
```

### `GET /v1/teams/:slug/heatmap`

Aggregate keyboard heatmap merged across all members' sessions. Members only.
Cached in Redis for ~10 minutes per team. Same `{ counts, freq, total }` shape
as a session heatmap.

**Auth:** Required  
**Rate limit:** 300/hr per user

**Response:**

```json
{
  "counts": { "a": 1820, "e": 1640, "Backspace": 540 },
  "freq": { "a": 0.18, "e": 0.16, "Backspace": 0.054 },
  "total": 10000
}
```

---

## Push Notifications

Browser Web Push subscriptions for daily streak reminders. All routes return
`503 SERVICE_UNAVAILABLE` when VAPID environment variables are not configured.

---

### `GET /v1/push/vapid-public-key`

Returns the VAPID public key so a browser can create a `PushSubscription`.

**Auth:** None **Rate limit:** 300/hr per IP

**Response:**

```json
{ "key": "<base64url VAPID public key>" }
```

---

### `POST /v1/push/subscribe`

Registers or refreshes a browser push subscription. `endpoint` is the unique key
— submitting the same endpoint twice is a no-op (upsert).

**Auth:** Required **Rate limit:** 20/hr per user

**Request body:**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "p256dh": "<base64url>",
  "auth": "<base64url>"
}
```

**Response:** `201 Created`

```json
{ "ok": true }
```

---

### `DELETE /v1/push/subscribe`

Removes a push subscription. Safe to call even if the subscription no longer
exists.

**Auth:** Required **Rate limit:** 20/hr per user

**Request body:**

```json
{ "endpoint": "https://fcm.googleapis.com/fcm/send/..." }
```

**Response:** `204 No Content`

---

## Recap Endpoint

Returns current-week coding stats for the authenticated user. Pro and Team plans
only; free accounts receive `403 FORBIDDEN`.

The `week_end` field is the **exclusive** upper bound (next Monday 00:00 UTC) —
i.e. `session.started_at >= week_start AND < week_end`. `formatWeekRange` on the
client subtracts one day to show the inclusive Sunday label.

---

### `GET /v1/recap`

**Auth:** Bearer token **Rate limit:** 300/hr per user (shared `read` bucket)
**Plans:** Pro, Team

**Response:**

```json
{
  "week_start": "2026-06-09",
  "week_end": "2026-06-16",
  "session_count": 5,
  "total_duration_s": 18600,
  "best_duration_s": 5400,
  "best_session_id": "sess_abc123",
  "top_lang": "TypeScript",
  "current_streak_days": 12,
  "prior_week_duration_s": 14880,
  "week_over_week_pct": 25,
  "headline": "5 sessions, 5h 10m this week",
  "note": "Nice work, Anh. Up 25% on last week — momentum is yours. Top language: TypeScript. 12-day streak still alive."
}
```

| Field                   | Type             | Notes                                             |
| ----------------------- | ---------------- | ------------------------------------------------- |
| `week_start`            | `string` (date)  | Monday of the current week, UTC                   |
| `week_end`              | `string` (date)  | Next Monday — exclusive upper bound               |
| `session_count`         | `number`         | Sessions started this week                        |
| `total_duration_s`      | `number`         | Total coding seconds this week                    |
| `best_duration_s`       | `number`         | Longest single session this week                  |
| `best_session_id`       | `string \| null` | ID of the longest session                         |
| `top_lang`              | `string \| null` | Language with most seconds this week              |
| `current_streak_days`   | `number`         | Current streak at time of request                 |
| `prior_week_duration_s` | `number`         | Total seconds from the prior week                 |
| `week_over_week_pct`    | `number \| null` | Change vs prior week (%); `null` if no prior data |
| `headline`              | `string`         | Short prose headline (template or AI)             |
| `note`                  | `string`         | One-to-two sentence coaching note                 |

**Errors:** `401` missing/invalid token · `403` free plan · `404` user not found

---

## Waitlist Endpoint

Public pre-launch email capture for the landing page. No auth.

---

### `POST /v1/waitlist`

**Auth:** none (public) **Rate limit:** 10/hr per IP (fails closed)

**Request:**

```json
{
  "email": "you@domain.dev",
  "source": "landing"
}
```

| Field    | Type     | Notes                                             |
| -------- | -------- | ------------------------------------------------- |
| `email`  | `string` | Required. Trimmed, lowercased, validated, max 254 |
| `source` | `string` | Optional. Where the signup came from, max 64      |

The body is validated with Zod `.strict()` — unknown fields are rejected. The
insert is idempotent on a unique email: a repeat signup returns the same `201`
without revealing that the address already exists (no enumeration). A genuinely
new signup also triggers a best-effort confirmation email via Resend; the send
never blocks or fails the request.

**Response:** `201 Created`

```json
{ "ok": true }
```

**Errors:** `400 VALIDATION_ERROR` invalid/missing email or unknown field ·
`429 RATE_LIMITED` too many signups from this IP · `503 SERVICE_UNAVAILABLE`
limiter backing store unreachable (fails closed)

---

## System Endpoints

### `GET /health`

Trivial liveness probe for the load balancer / PM2 — returns `200` without
touching any dependency. Not rate-limited, no version prefix.

```json
{ "status": "ok", "ts": 1748390400000 }
```

### `GET /v1/status`

Real-time dependency health, backing the public `/status` page. Probes the
database (`SELECT 1`) and Redis (`PING`) and reports each component. The result
is cached in Redis for ~15s, so frequent polling cannot hammer Neon or Upstash;
each probe fails soft (reports `down`, never throws), so the endpoint itself
never `500`s.

**Auth:** None **Rate limit:** 300 requests / hour / IP (public read bucket)

**Response:** `200`

```json
{ "api": "ok", "db": "ok", "cache": "ok", "ts": 1748390400000 }
```

Each of `api`, `db`, `cache` is `"ok"` or `"down"`. A client that cannot reach
the endpoint at all should treat the API as unreachable.

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

| Code                  | HTTP Status | Description                                  |
| --------------------- | ----------- | -------------------------------------------- |
| `UNAUTHORIZED`        | 401         | Missing or invalid JWT                       |
| `FORBIDDEN`           | 403         | Valid JWT but insufficient permissions       |
| `NOT_FOUND`           | 404         | Resource does not exist                      |
| `CONFLICT`            | 409         | State conflict (e.g. taken slug, team full)  |
| `VALIDATION_ERROR`    | 400         | Request body/params failed Zod validation    |
| `PAYLOAD_TOO_LARGE`   | 413         | Request body exceeded the 1 MB `/v1/*` limit |
| `RATE_LIMITED`        | 429         | Rate limit exceeded for the bucket           |
| `SERVICE_UNAVAILABLE` | 503         | Dependency off, or limiter fail-closed       |
| `INTERNAL_ERROR`      | 500         | Unexpected server error                      |

---

## Rate Limits

| Endpoint group                         | Limit          | Window            |
| -------------------------------------- | -------------- | ----------------- |
| `POST /v1/ingest`                      | 1,000 requests | 1 hour (per user) |
| All read endpoints                     | 300 requests   | 1 hour (per user) |
| `POST /v1/sessions/:id/heatmap-card`   | 120 requests   | 1 hour (per user) |
| `GET /v1/sessions/:id/heatmap-card`    | 120 requests   | 1 hour (per IP)   |
| `POST /v1/billing/checkout`, `/portal` | 30 requests    | 1 hour (per user) |
| All team reads and writes              | 300 requests   | 1 hour (per user) |
| `POST`/`DELETE /v1/push/subscribe`     | 20 requests    | 1 hour (per user) |
| `POST /v1/waitlist`                    | 10 requests    | 1 hour (per IP)   |
| Public reads (leaderboard, profiles…)  | 300 requests   | 1 hour (per IP)   |
| `POST /v1/billing/webhook`             | 600 requests   | 1 hour (per IP)   |
| Auth endpoints                         | 20 requests    | 1 hour (per IP)   |

**Rate limit headers:**

```text
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1748394000
```

IP-keyed limits (auth endpoints, public `GET /v1/sessions/:id`) resolve the
client IP via `TRUST_PROXY_HOPS` (see `apps/api/.env.example`): `0` trusts the
socket address, `N` trusts the Nth hop from the right of `x-forwarded-for`. Set
it to the number of proxies in front (1 = ALB, 2 = CloudFront→ALB) so a forged
`x-forwarded-for` cannot spoof or exhaust another visitor's bucket.

**Limiter availability:** when Redis backing the limiter is unreachable, the
write paths that must stay protected — `POST /v1/ingest`, `POST /v1/waitlist`,
and all auth endpoints — **fail closed** with `503 SERVICE_UNAVAILABLE`; read
paths and the Stripe webhook **fail open** so a limiter blip does not take down
browsing or drop a legitimate Stripe retry.

---

## Key Label Reference

`key_freq` keys must use normalized labels from this set:

| Category   | Labels                                                                                 |
| ---------- | -------------------------------------------------------------------------------------- |
| Letters    | `a`–`z` (lowercase)                                                                    |
| Digits     | `0`–`9`                                                                                |
| Editing    | `Backspace`, `Delete`, `Enter`, `Tab`, `Escape`                                        |
| Modifiers  | `Shift`, `Control`, `Alt`, `Meta`                                                      |
| Navigation | `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Home`, `End`, `PageUp`, `PageDown` |
| Function   | `F1`–`F12`                                                                             |
| Other      | Anything outside this set — omit or bucket as `Other`                                  |
