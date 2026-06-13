# Roadmap

Version 1.0 · May 2026

Items move from Planned → In Progress → Done as work proceeds. The roadmap is
not date-locked beyond the current phase so it can flex with contributor
availability.

Metric targets in the Definition-of-Done sections (latency, Lighthouse, growth)
are defined canonically in `METRICS.md` — update numbers there, not here.

Current phase: Phase 1 — Foundation

---

## Phase 1 — Foundation (Weeks 1–2)

Goal: working ingest pipeline end-to-end.

### In Progress

- [x] PostgreSQL schema migration (users, events, sessions, streaks, follows)
- [x] GitHub OAuth flow (API ↔ GitHub)
- [x] JWT issuance and middleware
- [x] VSCode extension: SecretStorage token management (loopback one-time-code
      auth, ADR-011)
- [x] VSCode extension: `commma: Sign In` command (+ `Sign Out`)

### Planned

- [x] `POST /v1/ingest` with Zod validation and idempotency
- [x] Interval aggregator (ADR-010, not BullMQ): session boundary detection and
      aggregation
- [x] Aggregator: `keyboard_heatmap` merge from `key_freq` events
- [x] Aggregator: streak update
- [x] Leaderboard sorted-set maintenance (`ZINCRBY` on session write; read
      endpoint is Phase 2)
- [x] Redis fixed-window rate limiting (ingest/read/auth tiers, `429` +
      `X-RateLimit-*`) — built early; ROADMAP-listed in Phase 3
- [x] `GET /v1/sessions` (basic list)
- [x] Extension heartbeat flush (60s interval; simple in-memory retry —
      persistent offline queue w/ backoff is Phase 3)

**Definition of Done:**

- GitHub OAuth works from VSCode.
- Extension ships a real heartbeat with `key_freq`.
- API writes to DB; worker creates session row with `keyboard_heatmap`
  populated.
- `tsc --noEmit` passes everywhere.

---

## Phase 2 — Core Product (Weeks 3–4)

Goal: something a real user can experience end-to-end.

### Planned

- [x] `GET /v1/sessions/:id` with lang breakdown, files, and heatmap data
- [x] Session detail page in web app (lang-breakdown bar, file list; KPM line
      chart dropped — no time series in the endpoint, events pruned per ADR-010)
- [x] Keyboard heatmap Canvas renderer component (QWERTY layout in
      `@commma/shared` per ADR-005; purple freq ramp; basic transparent-PNG
      download — presets/OG render still deferred below)
- [x] Heatmap completeness (E) — added a `Space` label (the single most-pressed
      key, previously invisible) and the eleven punctuation physical keys;
      shifted symbols now map to their physical key (e.g. `!`→`1`) instead of
      collapsing to `Other`; `@commma/shared` `KEY_LABELS` change. Full
      per-layout mapping (Dvorak/Colemak) still aligns with the Phase 4
      keyboard-layout configs.
- [x] PNG export (9:16, 1:1, 16:9 presets, transparent background) — three
      preset export buttons on the session heatmap; offscreen canvas letterboxes
      the keyboard into the target dimensions (8% margin)
- [x] Streak calculation cron job — in-process hourly interval (ADR-010 style,
      gated by `RUN_AGGREGATION`) that zeroes `current_days` for users whose
      `last_active_date` is older than yesterday (UTC), preserving
      `longest_days` and `last_active_date` so the next session restarts the
      streak at 1. The aggregator only _bumps_ streaks on activity; this closes
      the missed-day gap so reads stop showing a stale streak. Pure cutoff
      helper `streakBreakCutoff` (testable).
- [x] Profile page at `/@handle` (live data) — avatar, handle, 4-stat grid
      (sessions/time/streak/top-lang), keyset-paginated session feed with "Load
      more". Route `/@:handle` in react-router-dom.
- [x] Redis leaderboard sorted set (incremental `ZINCRBY` on session write —
      done in step 4)
- [x] `GET /v1/leaderboard` endpoint — public; `period` week/month/alltime, top
      100 from Redis sorted sets, hydrated from PostgreSQL
      (handle/avatar/streak/top-lang), `privacy='off'` excluded. Includes the
      cold-start rebuild summing `sessions.duration_s` over the period window
      (never `events`, which are pruned; ADR-007/ADR-010). Deferred: `lang`
      filter (needs per-language sorted sets) and `delta` rank change (needs
      period snapshots).
- [x] Follow/unfollow API — `POST`/`DELETE /v1/users/:handle/follow` (auth,
      idempotent `204`; self-follow `400`, following a `privacy='off'` user
      `404`).
- [x] `GET /v1/feed` endpoint — auth; sessions from followed users newest-first,
      keyset-paginated (`limit` default 20/max 50), excludes followees now
      `privacy='off'`. `SessionSummary` + `{ handle, avatar_url }` per entry.
- [x] Leaderboard page in web app — period tabs (week/month/alltime), ranked
      entries with rank badge, avatar, handle linked to `/@handle`, lang dot,
      streak, duration. Route `/leaderboard`.
- [x] Feed page — auth-gated (`localStorage` token, Phase 3 will add OAuth UI);
      signed-out state directs to extension sign-in; session cards with user
      attribution and pagination. Route `/feed`. Heatmap thumbnails deferred to
      Phase 3 (requires server-side `POST /v1/sessions/:id/heatmap-card`).

**Definition of Done:**

- Visit a session page, see real heatmap, export a transparent PNG.
- Visit `/@handle`, see real data and streak; leaderboard shows real data.
- p95 latency `<200ms` at 100 concurrent users.

---

## Phase 3 — Hardening (Weeks 5–6)

Goal: production-safe. No known P0/P1 bugs. Published extension.

### Planned

- [x] Redis rate limiter middleware (built early in step 4) — XFF-trust now
      configurable via `TRUST_PROXY_HOPS` (0=direct, 1=ALB, 2=CloudFront→ALB);
      `selectClientIp` counts hops from the trusted right end so a forged
      `x-forwarded-for` can't spoof the client IP. Deploy must also lock the
      security group so only the LB reaches the instance (ADR-010 (B) resolved).
- [x] Privacy mode: `key_freq` and file paths suppressed when
      `privacy = summary` — enforced server-side: ingest drops `file`/`key_freq`
      for `summary` (stores nothing for `off`); `GET /v1/sessions/:id` also
      suppresses `files`/`keyboard_heatmap` to non-owners for `summary` owners.
- [x] Unit tests (Vitest) for the pure aggregator functions (D) — Vitest runner
      wired (`pnpm test`); covers `splitIntoSessions`, `buildSession`, `streak`,
      and extension `tallyChange`/`addKeyFreq`. Route/integration tests still
      pending.
- [x] Expired `refresh_tokens` cleanup job (C) — in-process daily interval
      (gated by `RUN_AGGREGATION`) deletes rows past `expires_at`.
- [x] Extension offline queue with exponential backoff retry — `IngestClient`
      persists the unsent buffer to VSCode `globalState` (survives crash/reload)
      and applies exponential backoff (60s→15min cap) on consecutive send
      failures so the 60s flush stops hammering an unreachable API. A
      single-flight guard plus a 15s request timeout prevent overlapping drains
      and hung connections from racing the buffer; a 413 batch is split in half
      and retried (down to a single event) instead of dropped, and only
      genuinely non-retryable 4xx batches are discarded to avoid a poisoned
      queue.
- [x] Structured error responses across all endpoints — audited: every error
      path returns the `apiError` shape (explicit returns, all `zValidator`
      hooks, `notFound`, `onError`, `bodyLimit.onError`); the only `throw`s
      (`lib/github.ts`) funnel through `app.onError`. No code change needed.
- [x] Input validation hardening (edge cases, large payloads) — 1 MB `/v1/*`
      body limit (`413`); bounded `lang`/`file`/`project` lengths and
      `keystrokes`/`lines`/`ts` ranges in the heartbeat contract; `:handle` path
      param validated before DB lookup.
- [x] `POST /v1/sessions/:id/heatmap-card` (server-side `sharp` PNG for OG
      images) — SVG (reuses `QWERTY_LAYOUT` + the cold→`accent` ramp) rasterized
      by `sharp`; auth-required, privacy-gated (non-`full` owners are
      owner-only); `aspect` 9:16/1:1/16:9; `layout` only `qwerty`
      (dvorak/colemak are Phase 4); own `card` rate bucket (120/hr).
  - [x] **Follow-up:** heatmap-card PNG cache (Redis, privacy re-checked per
        request) — rendered PNG cached 10 min keyed by session + render options
        (`card:v1:…`), fail-open; shared by the `POST` and the public `GET`.
  - [x] **Follow-up:** public `GET` heatmap-card variant for crawler `og:image`
        — unauthenticated, `privacy='full'` only (404 otherwise), 120/hr per IP,
        `Cache-Control: public, max-age=600` plus the shared Redis PNG cache.
  - [ ] **Deploy note:** the API host must provide a monospace font (e.g.
        DejaVu/Liberation) for server-side text; `⌘` already renders as `Cmd` to
        avoid a glyph gap.
- [x] Route/integration test harness (throwaway Postgres) —
      `apps/api/test/helpers/integration.ts` + `test/routes/integration.test.ts`
      exercise the real app via `app.request()` against Postgres + Redis, gated
      on `TEST_DATABASE_URL` (skips cleanly when unset, so default `pnpm test`
      never touches a DB) and self-cleaning. Covers healthz, the structured
      404/401/validation shapes, and the ingest + `sessions/:id` privacy gates
      (full/summary/off). Verified green (9/9) against the local stack. Still
      pending: a dedicated CI test database + the heatmap-card endpoint case.
- [x] Open Graph meta tags on public session and profile URLs — `og:title`,
      `og:description`, `og:type`, `twitter:card` injected dynamically on
      SessionDetail and Profile pages.
- [x] Web sign-in / sign-out — API callback redirects to
      `${WEB_ORIGIN}/auth/callback?code=…` (reuses `oauth:cli:code` +
      `POST /v1/auth/cli/exchange`); `AuthProvider` context with refresh token
      in `localStorage`, access token in memory, auto-refresh 60s before JWT
      expiry; nav shows avatar + sign-out when authenticated.
- [x] Replace all mocked landing page data with live API — leaderboard section
      now fetches `GET /v1/leaderboard?period=week` (real avatars, lang colors,
      streak, self-highlight); SESSION/CHART/TICKER sections remain mocked (no
      suitable endpoint yet — scheduled in Phase 4).
- [ ] Extension published to VSCode Marketplace (unlisted)
- [x] `CONTRIBUTING.md`, `ONBOARDING.md`, `SECURITY.md` complete — added
      `SECURITY.md` (private reporting, scope, safe harbor, the no-keylogging
      invariant); reconciled `ONBOARDING.md` with reality (interval aggregation
      not BullMQ, real `aggregate/`+`maintenance/` paths, flat `shared` layout,
      gated test harness, `app.ts` route registration); README status/stack
      refreshed and security links added throughout.
- [ ] `good-first-issue` label sweep
- [ ] Load test: k6 at 1,000 concurrent users, p95 <150ms
- [ ] GitHub repo made public

**Definition of Done:**

- Rate limiting enforced; privacy=summary sends no file paths or `key_freq`.
- Extension on marketplace; load test passes.
- Repo public with complete docs.

---

## Pricing Model

Free, Pro, and Team tiers ship at public launch (Phase 4). The free tier is
intentionally generous — free users on the leaderboard are the primary
conversion surface.

| Tier | Price             | Features                                                                  |
| ---- | ----------------- | ------------------------------------------------------------------------- |
| Free | $0                | Last 7 days of sessions · public profile · leaderboard                    |
| Pro  | $5/mo or $50/yr   | Full history · heatmap PNG export · private sessions · weekly recap email |
| Team | $20/mo or $200/yr | Up to 5 members · private team leaderboard · team aggregate stats         |

$50/yr ($4.17/mo) is a 17% annual discount for Pro. $200/yr ($16.67/mo) is a 17%
annual discount for Team, saving $40 versus monthly.

Conversion pressure is built into the product: free users see Pro users with
longer streaks and full history in the same leaderboard — no separate free vs
paid views needed.

---

## Phase 4 — Scale & Community (Weeks 7–10)

Goal: growth mechanics live. First external contributors merged.

### Planned

- [x] `/pricing` page — Free / Pro / Team tier comparison with monthly/annual
      toggle; `Pricing` nav + footer links wired
- [x] Pro tier enforcement — 7-day session-history window for free accounts,
      heatmap PNG export gate (`isPro` prop on `KeyboardHeatmap`), session
      history gate on own free-plan profile; `MeResult.plan` field added
- [x] Stripe integration — subscription billing for Pro/Team
      (`POST /v1/billing/checkout` + `/portal`); signature-verified webhook
      (`POST /v1/billing/webhook`) flips `users.plan` on
      `checkout.session.completed` and `customer.subscription.*`. All-optional
      Stripe env: with no keys the endpoints return `503` and plans stay free.
      `users` gained `stripe_customer_id`/`stripe_subscription_id` (migration
      `0004`).
- [x] Waitlist-to-paid conversion — landing-page email-capture CTA replaced with
      two-button row: Get early access (→ /pricing) + Install free (→
      marketplace); all `href='#'` removed site-wide
- [x] Weekly recap email: session count, best session, streak, top lang —
      Pro/Team-only, in-process hourly interval (Monday at/after
      `RECAP_SEND_HOUR_UTC`, gated by `RUN_AGGREGATION`) over the prior Mon–Sun
      week from `sessions`; sent via Resend, idempotent per
      `recap_emails (user_id, week_start)` with up-to-3 retry. Optional AI prose
      (OpenAI `gpt-4.1-nano`) writes only the headline/note for `privacy='full'`
      users when `OPENAI_API_KEY` is set; numbers are always deterministic and
      it falls back to a template otherwise. All clients are optional env
      (no keys → job no-ops), mirroring Stripe/VAPID.
- [x] Style badges: Vim athlete, Mouse-free, Backspace heavy, Arrow navigator —
      defined in `BadgeRow` (Profile.tsx); earned=accent-2, unearned=dim
- [x] Badge display on profile page
- [x] Server-side badge computation — `GET /v1/users/:handle` derives earned
      badges from the all-time `keyboard_heatmap` key counts (`lib/badges.ts`,
      pure + unit-tested); 2000-keystroke floor before any award
- [x] Team model: create team, invite members, team role (`POST /v1/teams`,
      gated to `plan: "team"`; handle-based invites with an accept/decline
      inbox; owner/member roles; five-member cap)
- [x] Private team leaderboard — `GET /v1/teams/:slug/leaderboard`, members
      only, ranked by coding time over week/month/alltime
- [x] Team aggregate heatmap endpoint — `GET /v1/teams/:slug/heatmap`, members'
      `keyboard_heatmap` counts merged and Redis-cached; team dashboard shows
      the heatmap via the existing Canvas `KeyboardHeatmap` component
- [x] Dvorak keyboard layout config
- [x] Colemak keyboard layout config
- [x] Wire the landing page `SESSION`/`CHART`/`TICKER` sections to live data
      (currently mocked in `App.tsx`) — needs new read endpoints: a featured
      public session for `SESSION`, a daily activity time-series for `CHART`
      (derived from `sessions`, not `events`, which are pruned per ADR-010), and
      a recent public-activity feed for `TICKER`. Land before public launch so
      the landing page is fully real.
- [ ] Contributor onboarding: Dockerfile for dev environment
- [ ] First 3 external PR merges
- [ ] Public launch: Product Hunt, social posts
- [ ] Remove early-access gate

**Definition of Done:**

- Style badges visible on profiles; team leaderboards functional.
- ≥3 external PRs merged.
- 200 GitHub stars within 72 hours of launch.

---

## Phase 5 — Growth (Weeks 11–16)

Goal: mobile, multi-editor, self-hosted.

### Planned

- [x] Full mobile layout audit and fixes
- [x] PWA manifest
- [x] Push notifications for streak reminders
- [x] Heatmap export on mobile (touch-friendly)
- [ ] JetBrains plugin scaffold (community-contributed)
- [ ] Neovim Lua plugin scaffold (community-contributed)
- [ ] Standalone CLI client (`commma login` / `commma watch`) as a headless data
      source — **auth is already unblocked by ADR-011** (the loopback
      one-time-code flow + `POST /v1/auth/cli/exchange` were built CLI-first in
      step 5; a CLI just reuses them). Sessions stay server-derived, so no
      manual "start session" command — same passive model as the extension.
- [ ] Third-party client event schema documentation (including `key_freq` spec)
- [ ] `docker-compose.yml` for full self-hosted stack
- [ ] Helm chart scaffold for Kubernetes
- [x] Lighthouse mobile score ≥90

---

## Icebox

Ideas worth tracking but not scheduled. Open a GitHub Discussion before picking
one up.

- Commit correlation — link sessions to git commits (user opt-in)
- Project-scoped leaderboards — compete within a repo/org
- API access tokens — personal access tokens for third-party integrations
- Embed widgets — embeddable streak badge and heatmap card for READMEs
- Language achievement system — milestones per language (100h TypeScript, etc.)
- Cohort leaderboards — compete only against users who joined in the same month
- Custom heatmap themes — user-selectable color gradients for exported cards
- Browser extension — track time in browser-based editors (GitHub Codespaces,
  etc.)

---

## How to Influence the Roadmap

1. Open a GitHub Issue with the label `roadmap-proposal`
2. Describe the problem it solves, who it helps, and rough implementation
   complexity
3. Maintainers will discuss and schedule or icebox it within 2 weeks

Roadmap decisions are made in the open. No private backlog.
