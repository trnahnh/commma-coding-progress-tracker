# Architecture Decision Records

Version 1.0 · May 2026

An ADR documents a significant technical decision: what was decided, why, and
what was rejected. New ADRs are added as decisions are made. Existing ADRs are
never deleted — if a decision is reversed, a new ADR supersedes it and
references the old one.

---

## ADR-001: Monorepo with pnpm Workspaces

**Status:** Accepted — 2026-05

### Context

Three distinct deployable artifacts (extension, API, web app) plus two shared
packages. We need to share types and schemas without publishing to npm, run
parallel dev servers from one command, and keep dependency management tractable.

### Decision

pnpm workspace monorepo at the root with Turborepo for task orchestration.

### Consequences

- Single `pnpm install` installs all packages
- `pnpm dev` starts all services in parallel
- `@commma/shared` and `@commma/db` are importable directly from source — no
  build step in dev
- TypeScript project references handle cross-package type checking

### Rejected Alternatives

- **Separate repos per package** — cross-package schema changes would require
  coordinated releases and version bumps
- **Nx** — heavier than needed; pnpm + Turborepo covers the same ground with
  less config

---

## ADR-002: Hono as the API Framework

**Status:** Accepted — 2026-05

### Context

We need a Node.js HTTP framework. Requirements: excellent TypeScript support,
minimal overhead, compatible with edge runtimes for future flexibility.

### Decision

Hono with `@hono/node-server`. Route handlers stay close to the Hono API so
migrating to an edge runtime (Cloudflare Workers, Deno Deploy) later would be
low-friction.

### Consequences

- Route definitions are concise and type-safe
- Middleware is composable
- No ORM bundled — chosen separately (see ADR-003)
- Edge-compatibility means we avoid Node.js-specific APIs in route handlers

### Rejected Alternatives

- **Fastify** — more complex plugin system; heavier runtime
- **Express** — no native TypeScript types; not edge-compatible; large legacy
  surface area
- **tRPC** — extension client would need the tRPC client library, adding bundle
  weight and coupling

---

## ADR-003: Drizzle ORM for Database Access

**Status:** Accepted — 2026-05

### Context

We need type-safe database access for PostgreSQL. Requirements: no code
generation at runtime, migrations-first workflow, low overhead, strong
TypeScript inference.

### Decision

Drizzle ORM. Schema defined in `packages/db/src/schema.ts`. Migrations generated
with `drizzle-kit generate` and applied with `drizzle-kit migrate`.

### Consequences

- Queries are type-safe at compile time with zero runtime overhead
- Migrations are plain SQL files — readable, diffable, auditable
- `@commma/db` exports the schema and a preconfigured db client
- Queries look like SQL, not a custom DSL

### Rejected Alternatives

- **Prisma** — requires a separate client generation step; Prisma Client adds
  bundle overhead; the query engine is a separate binary
- **Raw SQL with pg** — no type safety without significant boilerplate;
  hand-maintained type definitions for every query

---

## ADR-004: PostgreSQL JSONB for key_freq and keyboard_heatmap

**Status:** Accepted — 2026-05

### Context

The keyboard heatmap is a variable-length mapping of key labels to counts. The
set of keys varies per session. We need to store this efficiently without
performing heavy relational operations on it.

### Decision

Store `key_freq` on the events table and `keyboard_heatmap` on the sessions
table as PostgreSQL JSONB columns. The aggregation worker merges `key_freq` maps
in application code and writes the result to `sessions.keyboard_heatmap`.

### Consequences

- No schema migration needed when the key label set changes
- JSONB supports GIN indexing if we need to query specific key counts later
- Merge logic is simple:
  `Object.entries(freq).forEach(([k, v]) => merged[k] = (merged[k] ?? 0) + v)`
- Heatmap data is returned inline in the session detail response — no separate
  join needed

### Rejected Alternatives

- **Separate `key_counts` table (session_id, key_label, count)** — 60+ rows per
  session; unnecessary relational overhead for data always read as a unit
- **Application-level JSON (not JSONB)** — JSONB gives indexing capability and
  type validation at the DB level

---

## ADR-005: Canvas API for Client-Side Heatmap Rendering

**Status:** Accepted — 2026-05

### Context

We need to render the keyboard heatmap as a transparent PNG for export. This can
be done client-side (browser Canvas) or server-side (Node + image library).

### Decision

Use the browser Canvas API as the primary rendering path. A server-side path
using `sharp` is added specifically for Open Graph images.

### Consequences

- Heatmap export is instant — no network round-trip
- Works offline
- `canvas.toBlob('image/png')` produces a transparent PNG ready for download or
  clipboard
- Two implementations of the same rendering logic must be kept in sync (Canvas +
  sharp)
- Keyboard layout config must be shared between both renderers — lives in
  `@commma/shared`

### Rejected Alternatives

- **Server-side only (Puppeteer/headless Chrome)** — expensive, slow, heavy
  dependency
- **SVG export** — inconsistent transparency handling across social platforms;
  PNG is universally supported for story/post sharing

### Amendment — 2026-05 (Phase 2 step 3, Canvas renderer shipped)

The shared layout config now lives at `packages/shared/src/keyboardLayout.ts`
(`QWERTY_LAYOUT`: unit-grid keycap coordinates, pure data so `sharp` can reuse
it verbatim). The browser Canvas path is built
(`apps/web/src/components/KeyboardHeatmap.tsx`) with a basic transparent-PNG
download via `canvas.toBlob`. The server-side `sharp` renderer (OG images) and
the multi-aspect-ratio export presets remain pending — they consume the same
`QWERTY_LAYOUT`. The spacebar/punctuation caps now light up: `KEY_LABELS` gained
`Space` + the punctuation physical keys and shifted symbols map to their
physical key (ROADMAP item E, done).

### Amendment — 2026-06 (Phase 3, server-side `sharp` path shipped)

Both pending pieces are now built. The multi-aspect export presets shipped in
Phase 2, and the server-side renderer landed in Phase 3 as
`POST /v1/sessions/:id/heatmap-card`: `lib/heatmapCard.ts` builds an **SVG**
from the same `QWERTY_LAYOUT` + cold→`accent` ramp and `sharp` rasterizes it to
PNG (no headless browser / `node-canvas`). The "two implementations kept in
sync" consequence is now live — the Canvas and SVG renderers must track each
other. One deliberate divergence: the server draws the Meta cap as `Cmd` (not
`⌘`) so the PNG never depends on a glyph missing from common Linux fonts; the
host must still provide a monospace font for the remaining text.

---

## ADR-006: Key Label Tracking (No Key Content)

**Status:** Accepted — 2026-05

### Context

The keyboard heatmap requires knowing which keys were pressed. Two approaches:

1. Intercept the `type` command to observe what characters were typed (content)
2. Maintain a counter per keystroke that records only the key label (physical
   key identity)

### Decision

Track only key labels — the physical key pressed — never key content. The
distinction: we count that the `j` key was pressed 142 times, not that the user
typed the letter j in any specific word or context.

`contentChanges` in `onDidChangeTextDocument` is never read, stored, or
transmitted.

### Consequences

- Users can verify the privacy guarantee by reading the open-source extension
  code
- The heatmap is slightly less precise than a content-based approach —
  acceptable trade-off
- **This decision is a permanent privacy guarantee.** It must never be weakened
  in future versions without a new ADR, a CHANGELOG entry, and a version bump.

### Rejected Alternatives

- **Content-based tracking** — rejected unconditionally. Capturing what was
  typed would make commma a keylogger regardless of intent. No business
  justification exists.

### Amendment — 2026-05 (extension implementation, step 5)

VSCode exposes **no raw key-event API** to extensions. The only signal that
reveals which character key was pressed is the inserted text in
`onDidChangeTextDocument`. Building the per-key heatmap therefore requires
reading that character. This amendment defines the narrow, permitted way to do
so without weakening the guarantee:

> Characters from `contentChanges.text` are read solely to increment a frequency
> counter then immediately discarded. The string is never stored, logged, or
> transmitted. Only the final `Record<string, number>` map is retained. Content
> is unrecoverable from a frequency histogram — this is not key logging.

Implementation (`apps/extension/src/keyCounter.ts`): each `contentChange` is
mapped to a single `KeyLabel` (lowercased letters/digits, `\n`→`Enter`,
`\t`→`Tab`, a deletion→`Backspace`, anything else→`Other`) and folded into a
counter. Order, position, and surrounding context are destroyed at the point of
capture. Multi-character inserts (paste/autocomplete/IME) are **not** attributed
to any key. The bright line is unchanged: an **order-destroyed histogram** is
key labels; a reconstructable sequence is content and remains forbidden.
Recorded with a CHANGELOG entry and an extension version bump (`0.0.1 → 0.1.0`)
as this ADR requires.

---

## ADR-007: Redis Sorted Sets for Leaderboard

**Status:** Accepted — 2026-05

### Context

The leaderboard needs to return top 100 users by coding time for
week/month/alltime scopes. This query runs on every leaderboard page load and
must be fast.

### Decision

Maintain Redis sorted sets (`ZADD`) updated on every session write. Keys:
`leaderboard:week`, `leaderboard:month`, `leaderboard:alltime`. Score is total
coding seconds. `ZREVRANGE ... WITHSCORES` returns the top N in O(log N + N)
time.

Sorted sets are authoritative for ranking. User handles and metadata are
hydrated from PostgreSQL after the Redis read.

### Consequences

- Leaderboard reads are O(log N + 100) regardless of total user count
- Sorted sets are updated inline during session aggregation — no separate job
- If Redis is wiped, the leaderboard is rebuilt from PostgreSQL on next read
  (cold start path)
- **Rebuild source (important, per ADR-010):** step-4 aggregation **prunes
  events** after writing sessions, so the cold-start rebuild must sum
  `sessions.duration_s` grouped by user (and by period for week/month from
  `sessions.started_at`) — **never** from `events`, which no longer holds the
  history. Maintenance today is incremental `ZINCRBY` on session write; the
  rebuild itself is not implemented yet and must land with the
  `GET /v1/leaderboard` endpoint (Phase 2), or a Redis flush will silently and
  permanently under-count rankings.

### Rejected Alternatives

- **PostgreSQL aggregate query on every request** — a
  `SUM(duration_s) GROUP BY user_id` over millions of session rows would be too
  slow; Redis sorted sets are the right abstraction
- **Materialized views in PostgreSQL** — require a refresh mechanism; don't give
  O(1) rank lookups

---

## ADR-008: BullMQ for Background Job Queue

**Status:** Superseded by ADR-010 — 2026-05

### Context

Session aggregation is async: ingest returns `202` immediately, then a worker
processes events in the background. We need a reliable job queue with retry,
dead-letter handling, and observability.

### Decision

BullMQ backed by Redis (same Redis instance as caching in MVP; separate instance
at scale). Jobs are enqueued on ingest and deduplicated by `user_id` within a
5-minute window — one aggregation job per user per 5 minutes, not one per ingest
call.

### Consequences

- Automatic retry with configurable backoff
- Failed jobs go to a dead-letter queue for inspection
- Redis now serves three purposes: cache, rate limiting, job queue — acceptable
  for MVP, should be separated at scale
- Bull Board can be added for observability

### Rejected Alternatives

- **pg-boss (PostgreSQL-backed queue)** — eliminates a dependency but adds
  table-polling overhead to PostgreSQL; we already have Redis for caching
- **Cron-only approach** — fixed 5-minute cron would add up to 5-minute latency
  to session data appearing in the UI; the queue approach gives near-real-time
  aggregation

---

## ADR-009: Deployment Infrastructure — AWS Compute (EC2 + S3/CloudFront)

**Status:** Accepted — 2026-05 (web target revised 2026-06: Vercel → S3 +
CloudFront; compute revised 2026-06: t3.micro → t4g Graviton, see "Compute &
networking" below)

**Decision:** Host both compute tiers on AWS. The API runs on EC2; the web app
is a static Vite build served from **S3 + CloudFront**. PostgreSQL stays on Neon
and Redis on Upstash (both third-party managed) — they are unaffected by the
all-AWS hosting move and migrate to RDS/ElastiCache only at the scale points
below.

| Layer       | Provider                         | Cost                    |
| ----------- | -------------------------------- | ----------------------- |
| API         | AWS EC2 t4g (Graviton) + PM2     | $0 trial → ~$6/mo       |
| Public IPv4 | 1 Elastic IP (API)               | $0 12mo → ~$3.65/mo     |
| Web         | AWS S3 + CloudFront (dual-stack) | ~$0 → <$1/mo            |
| Redis       | Upstash free tier                | $0                      |
| PostgreSQL  | Neon free tier                   | $0                      |
| **Total**   |                                  | **~$0 trial → ~$10/mo** |

**Rationale:** Zero users at launch — no need for load balancers or containers.
A single burstable EC2 box runs PM2 + Hono/Node with plenty of headroom. The web
app has no SSR or serverless functions — `vite build` emits a static `dist/`, so
an S3 origin behind CloudFront gives global CDN delivery at near-zero cost and
keeps the whole stack under one AWS account/billing/IAM boundary alongside the
API. SPA deep-link routing (`/sessions/:id`, `/@handle`) is handled by a
CloudFront custom error response mapping 403/404 to `/index.html`;
`VITE_API_BASE_URL` is injected at build time in CI before the `aws s3 sync`.
Upstash serverless Redis is free at MVP scale; Neon gives zero-config managed
serverless Postgres with a 5 GB free tier.

**Compute & networking (revised 2026-06):** the API box is a **t4g (Graviton /
ARM)** instance, not t3.micro — ARM gives ~20% better price/performance for
identical specs. Start on **t4g.small** (2 GiB, free under the trial through end
of 2026) for headroom over `sharp` PNG renders plus the in-process schedulers,
then drop to **t4g.micro** (1 GiB, ~$6/mo) when the trial ends — still cheaper
than the t3.micro it replaces. **t4g.nano (0.5 GiB) is rejected:** concurrent
`sharp` renders + the aggregation/recap/push schedulers + on-box `tsc` builds
overrun 512 MB, and the resulting swap thrash would blow the `<150 ms` read-p95
gate (METRICS.md) for ~$3/mo of savings. ARM cost: launch an **arm64 AMI**
(AL2023 arm64); `sharp` resolves its arm64 prebuilt (`@img/sharp-linux-arm64`)
automatically and Node/pnpm/PM2 are unaffected, so `provision-ec2.sh` needs no
change. The API keeps **one public IPv4** (Elastic IP) — required for IPv4-only
clients and the VSCode extension; it is free for the first 12 months (750 hr/mo)
then ~$3.65/mo (AWS's Feb-2024 public-IPv4 charge). **IPv6-only is rejected for
the API** — it would drop IPv4-only reachability — while the web tier gets IPv6
free via CloudFront's dual-stack, so only the one API EIP is billable.

**Vercel — temporary interim only:** Vercel (with `vercel.json` SPA rewrites)
may be used as a stopgap web host during early development for its zero-config
git-push deploys, but it is **not** the target. The committed target is S3 +
CloudFront so the platform is fully AWS. Do not document Vercel as the MVP host.

**Migration path:** At 10k DAU or when the free tier expires, migrate API to ECS
Fargate + ALB and move the data tier to RDS + ElastiCache. App code and the web
build stay identical — only the deploy target changes.

**Rejected:** ECS Fargate at launch — ALB costs $18/mo fixed regardless of
traffic. ElastiCache / RDS at launch — Upstash and Neon free tiers are
sufficient. AWS Amplify Hosting for the web — closer to Vercel's UX (PR
previews, managed rewrites) but adds a managed-service cost and abstraction over
the same S3 + CloudFront primitives we can wire directly.

---

## ADR-010: Interval-Based Aggregation (supersedes ADR-008)

**Status:** Accepted — 2026-05 (supersedes ADR-008)

### Context

ADR-008 chose BullMQ for session aggregation. In implementation a cost problem
surfaced against the ADR-009 stack: a BullMQ worker **blocking-polls Redis
continuously even when idle** (`BRPOPLPUSH`/`BZPOPMIN` loops, scheduler ticks).
On the Upstash free tier — billed per command (~500K/month) — a single always-on
idle worker would exhaust the budget on polling alone, before processing a
single real job. At zero/low users that is pure waste.

### Decision

Replace the BullMQ queue with an **in-process interval scan**. A `setInterval`
(5 min) inside the API Node process runs the aggregator:
`SELECT DISTINCT user_id FROM events` → per user, fetch events ordered by `ts` →
split on the 15-min idle gap → finalize only **closed** sessions (a trailing
in-progress group is left for the next tick) → write `sessions` +
`session_langs` + `session_files` + `keyboard_heatmap`, update `streaks`,
`ZINCRBY` the leaderboard, and **delete** the finalized events, all in one
transaction per user. An in-process guard prevents overlapping runs;
`RUN_AGGREGATION` env gates the loop so only one instance runs it if ever scaled
horizontally.

### Consequences

- **Zero idle Redis commands** — Redis is touched only on session write (a few
  `ZINCRBY`) and per request (one rate-limit command). Comfortably within the
  Upstash free tier.
- Finalizing only closed sessions makes re-runs **idempotent** — a session is
  written exactly once and never rewritten, which also makes deleting its events
  safe (strong storage discipline keeps Neon's free-tier storage bounded).
- No external queue dependency, no separate worker process to deploy (pure
  backend code; PM2/EC2 setup is unchanged).
- **Lost:** BullMQ's automatic retry, dead-letter queue, and Bull Board
  observability. Mitigated because failed users are logged and simply retried on
  the next tick (their events stay in the table until successfully finalized).
  Acceptable for a single-instance MVP.
- Latency is up to one interval (~5 min) before closed sessions appear — and a
  session cannot be known to have ended until the 15-min idle gap exists anyway,
  so this is not a practical regression.

### Rejected Alternatives

- **BullMQ as in ADR-008** — rejected on Upstash command-budget grounds (idle
  polling), not on correctness.
- **Tuning BullMQ poll intervals** — reduces but does not eliminate idle
  commands, and adds tuning complexity for no benefit at MVP scale.

### Scale notes & migration path

These are the tweaks this design will need as load grows. None are needed at
MVP; they are recorded so they are not rediscovered later.

- **(A) Trigger → queue + dedicated worker.** The interval scan (one
  `setInterval` in the web process, sequential per user,
  `SELECT DISTINCT user_id` each tick) caps out as active users grow — the scan
  widens and per-user work serializes on the request event loop. At the
  horizontal-scale / ElastiCache tier (where Redis is no longer billed per
  command, so the ADR-010 cost objection disappears), move aggregation to a
  separate worker process behind a real queue. This also dissolves the
  multi-instance duplication risk (today only an in-process guard +
  `RUN_AGGREGATION` prevent two instances aggregating the same users).
  **Pre-seamed:** `run.ts` already exposes `aggregateUser(userId)` as a
  standalone unit and the logic lives in pure modules
  (`boundaries`/`build`/`streak`), so this swap replaces `scheduler.ts` and
  enqueues one job per user — `aggregateUser` becomes the job processor
  unchanged. No work now.
- **(B) Rate-limit client IP behind a proxy. — RESOLVED (Phase 3).** `ipKey` no
  longer trusts the leftmost `x-forwarded-for` hop. `TRUST_PROXY_HOPS` (env,
  default `0`) configures how many proxies front the API, and the pure
  `selectClientIp` (`lib/clientIp.ts`) resolves the client IP by counting that
  many hops in from the trusted (right) end, so a forged header can't spoof or
  exhaust a victim's bucket. Set `1` behind an ALB, `2` behind CloudFront→ALB.
  Still requires the deploy to lock the security group so only the LB can reach
  the host (otherwise XFF is forgeable regardless).
- **(C) Leaderboard rebuild source.** Because this step **prunes (deletes)
  events** after aggregating, the Redis-wipe rebuild promised in ADR-007 must
  sum from the `sessions` table, not `events`. Fine to mid-scale; at large
  session volume, rebuild from a periodic user-rollup table rather than scanning
  all sessions. See ADR-007.

**Not scale issues (do not tweak for scale):** `duration_s` accuracy (addressed
in step 5 — `buildSession` floors duration to `span + one heartbeat window`,
since each heartbeat represents up to ~60s of activity; a single-event session
is 60s not 0s, so it earns real leaderboard credit and non-zero lang splits),
event pruning (already the scale win — keeps `events` tiny regardless of
history), streak UTC day boundaries (correctness/UX, scale-invariant).

---

## ADR-011: Extension Auth — Loopback Redirect + One-Time Code

**Status:** Accepted — 2026-05 (step 5)

### Context

The web auth flow (ADR per `routes/auth.ts`) returns the access token as JSON
and the refresh token as an **HTTP-only, `SameSite=Strict`, `Path=/v1/auth`
cookie**. A VSCode extension is not a browser: it cannot read or replay that
cookie, and there is no web app yet to broker a "connect your editor" handshake.
The extension must drive GitHub OAuth itself and obtain tokens it can persist in
SecretStorage.

### Decision

**Loopback redirect + one-time code exchange** (the RFC 8252 "OAuth for native
apps" loopback pattern, with a server-side single-use code instead of PKCE):

1. The extension starts a throwaway HTTP server on an ephemeral `127.0.0.1` port
   and opens the system browser to
   `GET /v1/auth/github?redirect_uri=<loopback>`.
2. `GET /v1/auth/github` validates `redirect_uri` against a loopback allowlist
   (`http://127.0.0.1:*` / `http://localhost:*`) and stores
   `state → redirect_uri` in Redis (`oauth:cli:state:<state>`, TTL 600s). The
   existing CSRF state cookie and GitHub redirect are unchanged.
3. After the normal GitHub exchange + user upsert, the callback detects the CLI
   flow (state key present in Redis), mints a **single-use one-time code**
   (`oauth:cli:code:<code> → userId`, TTL 60s) and redirects the browser to the
   loopback `redirect_uri?code=<code>`. The long-lived refresh token never
   transits a URL.
4. The extension exchanges the code at **`POST /v1/auth/cli/exchange`** for
   `{ access_token, refresh_token, user }` over HTTPS and stores the refresh
   token in `context.secrets`.
5. `POST /v1/auth/refresh` and `POST /v1/auth/signout` additionally accept a
   `{ refresh_token }` body (rotated value returned in the body) so the
   extension can refresh/revoke without a cookie. The browser cookie paths are
   untouched.

State (state→redirect_uri, one-time codes) lives only in Redis with short TTLs —
**no DB migration**. Token minting reuses `signAccessToken` / `mintRefreshToken`
/ `rotateRefreshToken` / `revokeRefreshToken`.

### Consequences

- The extension authenticates with no web app and no cookie support; the browser
  and extension flows share one set of endpoints with a clean branch.
- The refresh token is delivered over HTTPS in the exchange body, never in a
  URL; the only URL-borne secret is a 60-second single-use code.
- The extension bundles with **esbuild** (`--format=cjs`, `vscode` external) so
  the CJS VSCode host can consume `@commma/shared` (ESM, raw-TS source);
  `tsc --noEmit` remains the typecheck.

### Rejected Alternatives

- **`vscode://` URI handler deep link** — more idiomatic and works in Remote/
  Codespaces, but adds moving parts; loopback is simpler to build and verify for
  the desktop MVP. Revisit if Remote/web VSCode support is needed.
- **Manual token paste (PAT-style)** — clunky UX and needs a web/API page to
  display a token (none exists yet); closer to the icebox "API access tokens"
  idea.
- **Reusing the cookie refresh flow** — impossible: the browser, not the
  extension, receives the callback's `Set-Cookie`.

---

## ADR-012: Stripe Billing & Webhook Idempotency

**Status:** Accepted — 2026-06

### Context

The Pro and Team tiers (see `ROADMAP.md` pricing) need recurring subscription
billing: a way to start a subscription, a way for users to manage or cancel it,
and a reliable way to keep `users.plan` in sync with the customer's real
subscription state. As a solo, early-stage product selling digital goods (SaaS)
internationally, global sales-tax/VAT compliance is a disproportionate burden to
carry directly. Billing must also not become a hard dependency for local dev,
tests, or self-hosting, none of which need Stripe to run the core product.

### Decision

Use **Stripe** for subscriptions via Stripe-hosted **Checkout** (redirect flow,
no client-side Stripe.js) and the **Billing Portal** for self-serve
management/cancellation. Adopt Stripe **Managed Payments** (merchant of record)
so Stripe is liable for global VAT/sales tax, fraud, and disputes in exchange
for a per-transaction add-on fee.

`customer.subscription.*` webhook events are the **single source of truth** for
`users.plan`, derived from the subscription's price (mapped via configured price
IDs) and status (`active`/`trialing`/`past_due` are entitled; everything else
falls back to `free`). `checkout.session.completed` only persists the Stripe
customer/subscription IDs — it never sets the plan, avoiding two writers for one
field.

Webhook delivery is **at-least-once and unordered**, so the plan update is an
**atomic conditional UPDATE guarded by a monotonic `users.stripe_event_ts`
watermark**: an event applies only when `event.created` is newer than the last
recorded timestamp for that customer. Pure duplicates are already idempotent
(the same write); the watermark additionally defeats **out-of-order** delivery —
e.g. a retried `active` arriving after `deleted` is a no-op and cannot resurrect
a cancelled plan. The webhook is authenticated by the Stripe **signature**
(`STRIPE_WEBHOOK_SECRET`), not a JWT. `customers.create` uses an idempotency key
to prevent duplicate customers under concurrent checkout.

All Stripe configuration is **optional env**: unset (or present-but-blank) keys
are coerced to absent, every `/v1/billing/*` endpoint returns
`503 SERVICE_UNAVAILABLE`, and all accounts stay on `free`.

### Consequences

- VAT/sales-tax liability and dispute handling sit with Stripe; the trade-off is
  the Managed Payments add-on fee, revisited if fee drag outweighs the
  compliance convenience (the choice is reversible in Stripe).
- Plan state converges to the truth regardless of webhook ordering or
  redelivery, without an event-id ledger or an extra Stripe API round-trip per
  event.
- A brief window can exist between a completed payment and the
  `customer.subscription.created` event landing, during which the plan is still
  `free`; in practice the event arrives near-instantly.
- The watermark is per-customer, so a single customer holding multiple
  concurrent subscriptions is not modelled (one active subscription per customer
  is assumed for now).
- Local dev, tests, and self-hosting run with no Stripe keys; billing simply
  reports `503`. Two new `users` columns ship via migrations `0004`
  (`stripe_customer_id` unique, `stripe_subscription_id`) and `0005`
  (`stripe_event_ts`).

### Rejected Alternatives

- **Self-managed tax (standard Stripe, not merchant of record)** — lower fees
  but puts global VAT registration/remittance and disputes on the owner;
  premature at this scale. Revisit at higher volume.
- **Re-fetching the subscription from Stripe on every webhook** — also handles
  ordering (always reads current truth), but couples each event to a live API
  call, adds latency and a new failure mode, and is harder to test
  deterministically. The watermark achieves the same safety with a pure DB
  write.
- **A processed-event-id ledger table** — solves duplicates but not ordering,
  and is unnecessary once writes are idempotent and watermark-guarded.
- **Trusting `checkout.session.completed` metadata for the plan** — works for
  the initial purchase but not for later upgrades/downgrades/cancellations, and
  would mean two writers for `users.plan`; the subscription price/status is the
  durable source of truth.

---

## ADR-013: Terraform for AWS Infrastructure (import-to-adopt)

**Status:** Accepted — 2026-06

### Context

The production stack (ADR-009) was provisioned by hand: an EC2 `t4g.small` API
box with its security group and Elastic IP, the `commma-web` S3 bucket fronted
by CloudFront with an Origin Access Control, an ACM certificate, the
`commma.dev` Route53 zone, and the locked-down `commma-deploy-local` IAM user.
That topology lived only in the console and in operator memory: no record of
what existed, no review trail for changes, and no safe way to reproduce it. The
resources were already live and serving traffic, so any IaC adoption had to
avoid recreating or disrupting them.

### Decision

Manage the existing AWS resources with **Terraform**, adopting them via
`terraform import` rather than recreating. Config lives in `infra/terraform/`,
split by concern (`ec2.tf`, `s3.tf`, `cloudfront.tf`, `acm.tf`, `route53.tf`,
`iam.tf`). State is stored in a dedicated, versioned, encrypted S3 bucket using
**native S3 state locking** (`use_lockfile`) — the modern replacement for the
deprecated DynamoDB lock table, so no second resource is needed.

The adoption workflow is read-only discovery → write resource blocks matching
the live config → `terraform import` each resource → iterate until
`terraform plan` reports **no changes**. That clean plan is the acceptance
proof: the code provably matches reality and nothing is queued for destruction.
The only mutation on first apply is additive — `default_tags` (`Project` /
`ManagedBy`) and a small set of state-only attribute defaults.

Terraform runs under a **separate `commma-terraform` IAM identity** with broad
access, kept distinct from `commma-deploy-local`, whose policy stays scoped to
S3-sync + CloudFront-invalidate. The least-privilege deploy boundary is
preserved and itself codified in `iam.tf`. Application deploys remain the
existing `infra/deploy-*.sh` scripts; Terraform owns **infrastructure**, not
release. Because GitHub Actions is disabled at the account level, Terraform is
run locally, the same operator model as the deploy scripts.

The EC2 key pair and the AWS-managed Route53 `NS`/`SOA` records are deliberately
left unmanaged (the private key is not reproducible from config; `NS`/`SOA` are
owned by the zone resource).

### Consequences

- The full production topology is version-controlled, reviewable, and
  reproducible; drift is detectable with `terraform plan`.
- Adoption carried zero downtime risk: import never recreates, and the
  reconciled plan was `0 to add, 0 to destroy` before the first apply.
- A privileged credential is required to run Terraform; it is a distinct IAM
  user from the deploy key, and access keys are intentionally not managed in
  state (no secrets in state beyond what AWS returns).
- State now holds infrastructure detail and must be treated as sensitive — hence
  the private, encrypted, versioned state bucket.

### Rejected Alternatives

- **Keep manual/ClickOps provisioning** — no record, no review, no
  reproducibility; the status quo this ADR exists to end.
- **Recreate resources from scratch under Terraform** — clean config but means
  tearing down and rebuilding live, traffic-serving infrastructure (new IP, cert
  revalidation, downtime). Import achieves the same end state with none of the
  risk.
- **DynamoDB-based state locking** — the long-standing pattern, but deprecated
  in favour of native S3 locking; it would add a table and IAM surface for no
  benefit here.
- **AWS CloudFormation / CDK** — viable, but Terraform's `import` ergonomics and
  multi-provider reach (the stack also touches Neon and Upstash, candidates for
  later adoption) fit better, and Terraform is the more transferable skill.
