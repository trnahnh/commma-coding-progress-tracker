# System Design

Version 1.0 · May 2026

---

## 1. Overview

commma is a three-tier distributed system:

1. **VSCode Extension & CLI** — data sources; capture coding activity (the
   extension from editor events, the headless CLI from filesystem changes) and
   ship heartbeat batches
2. **API (Hono/Node)** — ingestion, aggregation, query, and auth layer
3. **Web App (React/Vite)** — presentation layer; session detail, leaderboards,
   profiles, heatmap export

All three tiers communicate over HTTPS/JSON. A shared package (`@commma/shared`)
holds Zod schemas enforcing the data contract across the data-source→API
boundary.

---

## 2. Architecture Diagram

```text
┌─────────────────────────────────────────────────────────┐
│  VSCode Extension (@commma/extension)                   │
│                                                         │
│  onDidChangeTextDocument ──► in-memory buffer           │
│  onDidOpenTextDocument   ──► (HeartbeatEvent[])         │
│  window.onDidChangeActiveTextEditor                     │
│                    │                                    │
│                    │  flush every 60s                   │
│                    ▼                                    │
│            POST /v1/ingest                              │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTPS/JSON  HeartbeatBatch
                    ▼
┌─────────────────────────────────────────────────────────┐
│  API  (@commma/api  —  Hono on Node)                    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐   ┌───────────────┐ │
│  │  Auth        │  │  Ingest      │   │  Read         │ │
│  │  /v1/auth/*  │  │  /v1/ingest  │   │  /v1/sessions │ │
│  │  JWT + OAuth │  │  202 + async │   │  /v1/leaderbd │ │
│  └──────────────┘  └──────┬───────┘   │  /v1/users    │ │
│                            │          └───────┬───────┘ │
│                            ▼                  │         │
│                     ┌──────────────┐          │         │
│                     │  Aggregation │          │         │
│                     │  interval    │          │         │
│                     │  (5 min,     │          │         │
│                     │  ADR-010):   │          │         │
│                     │  session +   │          │         │
│                     │  heatmap     │          │         │
│                     └──────┬───────┘          │         │
└────────────────────────────┼──────────────────┼─────────┘
                             │                  │
              ┌──────────────┼──────────────────┼──────────┐
              │  Data Layer  │                  │          │
              │              ▼                  ▼          │
              │  ┌────────────────┐  ┌─────────────────┐   │
              │  │  PostgreSQL    │  │  Redis          │   │
              │  │  - users       │  │  - leaderboard  │   │
              │  │  - sessions    │  │  - rate limits  │   │
              │  │  - streaks     │  │  - no job queue │   │
              │  │  - follows     │  │  - session cache│   │
              │  └────────────────┘  └─────────────────┘   │
              └────────────────────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│  Web App (@commma/web)     │                            │
│                            ▼                            │
│  REST fetch ◄─── GET /v1/sessions, /leaderboard, etc.   │
│                                                         │
│  ┌────────────────────────────────────────────────┐     │
│  │  Canvas API — keyboard heatmap renderer        │     │
│  │  canvas.toBlob('image/png') → transparent PNG  │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow — Ingest Path

```text
Extension
  ├─ collects HeartbeatEvent every keystroke/file-change
  ├─ accumulates in-memory buffer for 60 seconds
  └─ on flush: POST /v1/ingest  { events: HeartbeatEvent[] }

API /v1/ingest
  ├─ validate with Zod (HeartbeatBatch schema)
  ├─ deduplicate by event.id (idempotency)
  ├─ bulk INSERT into events table
  └─ return 202 Accepted

Aggregation interval (in-process setInterval, every 5 min — see ADR-010)
  ├─ SELECT DISTINCT user_id FROM events
  ├─ for each user: fetch events ordered by ts
  ├─ detect session boundaries (15-min idle gap = new session)
  ├─ finalize only CLOSED sessions (trailing in-progress group waits for next tick)
  ├─ for each closed session (one transaction per user):
  │   ├─ sum duration, keystrokes, lines_delta; compute pace/peak
  │   ├─ merge key_freq maps → keyboard_heatmap JSONB
  │   ├─ group by lang → session_langs rows
  │   ├─ group by file → session_files rows
  │   ├─ INSERT into sessions table
  │   └─ DELETE the finalized events (prune — bounds events storage)
  ├─ UPDATE streaks table
  └─ UPDATE Redis leaderboard sorted set (ZINCRBY, after commit)
```

---

## 4. Data Flow — Read Path

```text
Browser → GET /v1/sessions?cursor=...
  ├─ verify JWT
  ├─ check Redis cache (TTL 60s)
  │   ├─ HIT → return cached JSON
  │   └─ MISS → SELECT from sessions + session_langs + session_files
  │              → cache result → return JSON
  └─ return paginated SessionList

Browser → GET /v1/leaderboard?period=week
  ├─ ZREVRANGE leaderboard:week 0 99 WITHSCORES from Redis
  │   ├─ HIT → hydrate user handles → return
  │   └─ MISS → SELECT + aggregate from sessions → ZADD → return
  └─ return LeaderboardEntry[]
```

---

## 5. Database Schema

### users

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle        TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  github_id     TEXT NOT NULL UNIQUE,
  avatar_url    TEXT,
  privacy       TEXT NOT NULL DEFAULT 'full',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### events

```sql
CREATE TABLE events (
  id            UUID NOT NULL,
  user_id       UUID NOT NULL REFERENCES users(id),
  ts            TIMESTAMPTZ NOT NULL,
  lang          TEXT,
  file          TEXT,
  project       TEXT,
  keystrokes    INT NOT NULL DEFAULT 0,
  lines         INT NOT NULL DEFAULT 0,
  key_freq      JSONB,
  processed     BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

CREATE INDEX events_user_unprocessed ON events(user_id, ts) WHERE processed = false;
```

### sessions

```sql
CREATE TABLE sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ NOT NULL,
  duration_s        INT NOT NULL,
  lines_delta       INT NOT NULL DEFAULT 0,
  pace_cpm          INT,
  peak_cpm          INT,
  peak_at           TIMESTAMPTZ,
  keyboard_heatmap  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_started ON sessions(user_id, started_at DESC);
```

### session_langs

```sql
CREATE TABLE session_langs (
  session_id  UUID NOT NULL REFERENCES sessions(id),
  lang        TEXT NOT NULL,
  duration_s  INT NOT NULL,
  pct         NUMERIC(5,2) NOT NULL,
  PRIMARY KEY (session_id, lang)
);
```

### session_files

```sql
CREATE TABLE session_files (
  session_id  UUID NOT NULL REFERENCES sessions(id),
  path        TEXT NOT NULL,
  changes     INT NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, path)
);
```

### streaks

```sql
CREATE TABLE streaks (
  user_id           UUID PRIMARY KEY REFERENCES users(id),
  current_days      INT NOT NULL DEFAULT 0,
  longest_days      INT NOT NULL DEFAULT 0,
  last_active_date  DATE
);
```

### follows

```sql
CREATE TABLE follows (
  follower_id   UUID NOT NULL REFERENCES users(id),
  followee_id   UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id)
);

CREATE INDEX follows_followee ON follows(followee_id);
```

### waitlist

```sql
CREATE TABLE waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  source      VARCHAR(64),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX waitlist_created ON waitlist(created_at DESC);
```

---

## 6. API Route Map

| Method | Path                          | Auth           | Description                   |
| ------ | ----------------------------- | -------------- | ----------------------------- |
| GET    | /v1/auth/github               | None           | Redirect to GitHub OAuth      |
| GET    | /v1/auth/github/callback      | None           | Exchange code → JWT + refresh |
| POST   | /v1/auth/refresh              | Refresh cookie | Rotate refresh token          |
| POST   | /v1/auth/signout              | JWT            | Revoke refresh token          |
| GET    | /v1/me                        | JWT            | Authenticated user profile    |
| POST   | /v1/ingest                    | JWT            | Ingest HeartbeatBatch         |
| GET    | /v1/sessions                  | JWT            | Paginated session list (self) |
| GET    | /v1/sessions/:id              | JWT            | Session detail + heatmap      |
| POST   | /v1/sessions/:id/heatmap-card | JWT            | Server-side PNG for OG image  |
| GET    | /v1/users/:handle             | None           | Public profile                |
| GET    | /v1/users/:handle/sessions    | None           | Public session list           |
| POST   | /v1/users/:handle/follow      | JWT            | Follow a user                 |
| DELETE | /v1/users/:handle/follow      | JWT            | Unfollow a user               |
| GET    | /v1/leaderboard               | None           | Leaderboard                   |
| GET    | /v1/feed                      | JWT            | Activity feed                 |
| POST   | /v1/billing/checkout          | JWT            | Stripe Checkout session       |
| POST   | /v1/billing/portal            | JWT            | Stripe Billing Portal session |
| POST   | /v1/billing/webhook           | Stripe sig     | Subscription state → plan     |
| POST   | /v1/waitlist                  | None           | Pre-launch email capture      |

---

## 7. Caching Strategy

| Data                         | Store                | TTL    | Invalidation   |
| ---------------------------- | -------------------- | ------ | -------------- |
| Leaderboard (week)           | Redis sorted set     | 10 min | ZADD on write  |
| Leaderboard (month, alltime) | Redis sorted set     | 1 hour | ZADD on write  |
| Session list (per user)      | Redis string (JSON)  | 60 sec | DEL on write   |
| Public profile stats         | Redis string (JSON)  | 5 min  | DEL on write   |
| Rate limit counters          | Redis sliding window | 1 hour | Natural expiry |

---

## 8. Background Jobs

### Session Aggregation (in-process interval — ADR-010, supersedes ADR-008/BullMQ)

- **Trigger:** an in-process `setInterval` (5 min) in the API process; an
  in-process guard prevents overlapping runs, `RUN_AGGREGATION` gates it, and
  each tick first takes a Redis leader lock (`SET leader:aggregation … NX PX`,
  TTL = the interval) so that even with the flag on every instance, exactly one
  runs per interval (see Scheduler safety below).
- **Logic:** `SELECT DISTINCT user_id` → per user fetch events by `ts` →
  boundary detection → finalize only _closed_ sessions → build
  sessions/langs/files/heatmap, update streaks, delete finalized events (one
  txn/user) → `ZINCRBY` leaderboard after commit.
- **Failure:** a failed user is logged and retried on the next tick — its events
  stay in the table until successfully finalized (no queue/DLQ). Re-runs are
  idempotent because only closed sessions are written.
- **Cost:** zero idle Redis commands (no queue polling); Redis touched only on
  session write. This is the reason BullMQ was dropped — see ADR-010.

### Streak Maintenance Job

- **Trigger:** in-process `setInterval` (hourly) in the API process, gated by
  `RUN_AGGREGATION` like the aggregation loop (ADR-010 — no external cron); an
  in-process guard prevents overlapping runs. Hourly (not daily) so a broken
  streak is corrected within an hour of the UTC rollover rather than at a single
  fixed wall-clock minute that a restart could miss.
- **Logic:** one bulk `UPDATE streaks SET current_days = 0 … RETURNING` for
  users with `current_days > 0` and `last_active_date < yesterday` (UTC).
  `longest_days` and `last_active_date` are left intact so the next session
  restarts the streak at 1. Idempotent — already-zeroed rows are excluded by the
  `current_days > 0` guard.
- **Settled-user guard:** the update also requires `NOT EXISTS` any `events` row
  for the user. Aggregation lags reality (15-min idle gap + 5-min tick) and only
  advances `last_active_date` on finalize, so a session ending near 00:00 UTC
  can leave `last_active_date` stale just after midnight. Since events are
  pruned on finalize, "no events" means `last_active_date` is authoritative;
  users with pending events are skipped this tick and re-evaluated once their
  session aggregates. This prevents a midnight-spanning session from being
  mis-scored as a broken streak.

### Refresh Token Cleanup Job

- **Trigger:** in-process `setInterval` (daily) in the API process, gated by
  `RUN_AGGREGATION` like the other loops (no external cron); an in-process guard
  prevents overlapping runs.
- **Logic:** one `DELETE FROM refresh_tokens WHERE expires_at < now()`.
  `rotateRefreshToken` only deletes the row it rotates, so expired/abandoned
  tokens would otherwise accumulate. Idempotent.

### Weekly Recap Email Job

- **Trigger:** in-process `setInterval` (hourly) in the API process, gated by
  `RUN_AGGREGATION` like the other loops; an in-process guard prevents
  overlapping runs. A tick acts once it is Monday at/after `RECAP_SEND_HOUR_UTC`
  (default 13) and stays active for the rest of that week, so if the process is
  down during the Monday window the recap **catches up** on a later day instead
  of being skipped — the `recap_emails` dedup still guarantees exactly one send
  per user per week. No external cron.
- **Eligibility:** `plan in ('pro','team')` users (recap is a Pro-tier perk, see
  ROADMAP pricing) with **≥1 session** in the prior completed Mon–Sun week.
  Users already recorded `sent` for that `week_start`, or past `attempts >= 3`,
  are skipped — the `recap_emails (user_id, week_start)` primary key is the
  idempotency + retry guard. **Scope note:** eligibility keys off the user's own
  `users.plan`, so a Team subscription covers only the owner's row; invited team
  members on `plan='free'` do not receive a recap yet (a future change can join
  through `team_members`).
- **Logic:** per user, aggregate the week from `sessions` (never `events`, which
  are pruned per ADR-010) — session count, total/best duration, top language,
  current streak, and prior-week total for a week-over-week delta. Render the
  email (subject + stat block + prose), send via Resend, then upsert the
  `recap_emails` outcome row. Users are processed in bounded concurrent chunks.
- **Prose layer (optional AI):** all figures are computed deterministically and
  injected exactly; an LLM (OpenAI `gpt-4.1-nano`) writes only the headline and
  a short note. It runs for every Pro/Team recipient when `OPENAI_API_KEY` is
  set (the recap is private to the recipient, so the public `privacy` mode does
  not gate it); any failure falls back to a deterministic template. No file
  paths, `key_freq`, or keystroke content are ever sent to the LLM — only
  aggregate stats (ADR-006 unaffected).
- **Gating:** the whole job no-ops when `RESEND_API_KEY`/`RECAP_FROM_EMAIL` are
  unset, mirroring the optional Stripe/VAPID pattern.
- **Failure:** a failed send records `status='failed'` and increments
  `attempts`; the next hourly tick retries until success or three attempts, so a
  transient outage self-heals within the send window without re-emailing
  delivered recipients.

### Scheduler safety (leader lock + graceful shutdown)

- **One run per interval across the fleet.** Every loop (aggregation, streak,
  token cleanup, push, recap) takes a per-loop Redis leader lock at the top of
  each tick: `SET leader:<name> <pid> NX PX <interval>`. Only the holder runs;
  the TTL equals the interval, so the lock self-expires before the next tick. A
  process-local re-entrancy flag still prevents a slow tick from overlapping the
  next on the same instance. Net effect: `RUN_AGGREGATION` may safely stay
  `true` on every replica — the lock, not the flag, is what guarantees a single
  run. If Redis is unreachable when acquiring the lock, the tick is skipped and
  retried next interval (the jobs are idempotent, so a skipped tick is
  harmless).
- **Cold leaderboard rebuild is also locked.** `topLeaderboard` rebuilds a
  flushed sorted set from `sessions` on read; a `lock:rebuild:<key>` guard
  (`SET … NX`) lets a single request rebuild while concurrent callers briefly
  wait for the set to appear, avoiding a thundering-herd of identical scans.
- **Graceful shutdown.** `SIGTERM`/`SIGINT` stop every scheduler, close the HTTP
  server (draining in-flight requests), wait up to 30 s for any running
  aggregation transaction to finish (`whenAggregationIdle`), then close the
  Postgres pool and Redis before exit. A rolling deploy therefore cannot kill a
  half-written session or drop an open request mid-flight.

---

## 9. Extension File Structure

```text
src/
  extension.ts    — activate/deactivate; registers commands + listeners
  tracker.ts      — activity tracker; buffer management; heartbeat flush
  auth.ts         — GitHub OAuth flow; SecretStorage token management
  client.ts       — HTTP client; offline queue; retry logic
  keyCounter.ts   — key-label frequency accumulator (no key content)
  statusBar.ts    — VSCode status bar item (connection state)
  privacy.ts      — reads commma.privacy setting; filters payload
```

---

## 10. Scalability Plan

- **MVP:** EC2 t4g (Graviton) — t4g.small on the free trial, then t4g.micro ·
  S3 + CloudFront (web, dual-stack IPv6) · Upstash Redis free · Neon free tier =
  ~$0 trial → ~$10/mo incl. one IPv4 EIP (fully AWS-hosted compute; see ADR-009)
- **1k DAU:** Same stack
- **5k DAU:** Upgrade to t4g.small/medium, add Neon read replica
- **10k DAU:** Migrate API to ECS Fargate + ALB, move data tier to RDS +
  ElastiCache (web stays on S3 + CloudFront)
- **50k DAU:** ECS auto-scaling, separate ingest/read services

### Deployment Secrets (GitHub Actions)

CI/CD runs on **GitHub Actions** (`.github/workflows/`). Every push to `main`
runs the `ci.yml` gate (lint/typecheck/test/markdown-lint), and two deploy
workflows **auto-deploy the side whose files changed** — `deploy-api.yml` (SSH
to the live EC2 box, pull, build, PM2-restart) on
`apps/api`/`packages/db`/`packages/shared`, `deploy-web.yml` (build, `s3 sync`,
CloudFront invalidate) on `apps/web`/`packages/shared`. The same steps run by
hand via `pnpm deploy:api` / `pnpm deploy:web`. A second copy of the gate runs
on GitLab (`.gitlab-ci.yml`) as a passive backup with no deploy jobs.

Secrets and variables are set under **Settings → Secrets and variables →
Actions**. `deploy-api.yml` needs:

- `EC2_HOST` / `EC2_SSH_KEY` — the API box host and the EC2 `.pem` private key

The web app deploys to S3 + CloudFront (ADR-009). Its workflow runs `vite build`
with `VITE_API_BASE_URL` set, `aws s3 sync`s `dist/` to the bucket, then
invalidates the distribution. It authenticates to AWS via OIDC and needs:

- `AWS_ROLE_ARN` (secret) — the IAM role assumed through the GitHub OIDC
  provider (scoped to the bucket + `cloudfront:CreateInvalidation`)
- `CLOUDFRONT_DISTRIBUTION_ID` (secret) — for the post-sync cache invalidation
- `WEB_S3_BUCKET` / `AWS_REGION` (variables) — target bucket and region
- `VITE_API_BASE_URL` (variable) — `https://api.commma.dev`, inlined at build
  time

SPA deep links are served by a CloudFront custom error response mapping 403/404
to `/index.html` (the S3+CloudFront equivalent of the interim `vercel.json`
rewrites).

### Infrastructure as Code (Terraform)

The live AWS footprint is managed by Terraform under `infra/terraform/`: the EC2
API box (instance, security group, Elastic IP), the S3 + CloudFront web tier
(bucket, policy, Origin Access Control, distribution), the `commma.dev` ACM
certificate, the Route53 hosted zone and records, and the scoped
`commma-deploy-local` deploy IAM user and policy. The already-running resources
were **adopted via `terraform import`** — never recreated — and the
configuration reconciles to a clean `terraform plan` (no drift). State lives in
a private, versioned, encrypted S3 bucket with native S3 locking
(`use_lockfile`, not a DynamoDB table). Terraform runs locally under a dedicated
`commma-terraform` IAM identity, distinct from the narrow deploy user;
application releases stay on the `infra/deploy-*.sh` scripts (Terraform owns
infrastructure, not releases). See ADR-013 and `infra/terraform/README.md`.

---

## 11. Security Boundaries

- **Extension → API:** HTTPS only; JWT in Authorization header
- **API → DB:** private network; no public DB port
- **API → Redis:** private network; AUTH password required
- **Web → API:** CORS restricted to `commma.dev`; CSRF not applicable (JWT not
  in cookies for web)
- **Refresh token (web):** HTTP-only cookie; `SameSite=Strict`; `Secure`;
  `Path=/v1/auth`
- **Refresh token (extension):** the extension can't use cookies, so it obtains
  the refresh token via the loopback one-time-code flow (ADR-011), stores it in
  VSCode **SecretStorage**, and sends it in the `/v1/auth/refresh` and
  `/v1/auth/signout` request body (not a cookie)
- **Host (EC2):** the security group exposes only `80`/`443` to the world; SSH
  (`22`) is restricted to the operator IP via the Terraform `ssh_allowed_cidr`
  variable, never `0.0.0.0/0`. IMDSv2 is required (`HttpTokens=required`).
- **Data at rest:** the API host's root EBS volume is KMS-encrypted, and
  EBS-encryption-by-default is enabled region-wide so any future volume is
  encrypted automatically (see ADR-013)
