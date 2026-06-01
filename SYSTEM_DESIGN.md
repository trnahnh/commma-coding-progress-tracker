# System Design

Version 1.0 · May 2026

---

## 1. Overview

commma is a three-tier distributed system:

1. **VSCode Extension** — data source; captures editor activity and ships
   heartbeat batches
2. **API (Hono/Node)** — ingestion, aggregation, query, and auth layer
3. **Web App (React/Vite)** — presentation layer; session detail, leaderboards,
   profiles, heatmap export

All three tiers communicate over HTTPS/JSON. A shared package
(`@commma/shared`) holds Zod schemas enforcing the data contract across the
extension→API boundary.

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

---

## 6. API Route Map

| Method | Path | Auth | Description |
| -------- | ------ | ------ | ------------- |
| GET | /v1/auth/github | None | Redirect to GitHub OAuth |
| GET | /v1/auth/github/callback | None | Exchange code → JWT + refresh |
| POST | /v1/auth/refresh | Refresh cookie | Rotate refresh token |
| POST | /v1/auth/signout | JWT | Revoke refresh token |
| GET | /v1/me | JWT | Authenticated user profile |
| POST | /v1/ingest | JWT | Ingest HeartbeatBatch |
| GET | /v1/sessions | JWT | Paginated session list (self) |
| GET | /v1/sessions/:id | JWT | Session detail + heatmap |
| POST | /v1/sessions/:id/heatmap-card | JWT | Server-side PNG for OG image |
| GET | /v1/users/:handle | None | Public profile |
| GET | /v1/users/:handle/sessions | None | Public session list |
| POST | /v1/users/:handle/follow | JWT | Follow a user |
| DELETE | /v1/users/:handle/follow | JWT | Unfollow a user |
| GET | /v1/leaderboard | None | Leaderboard |
| GET | /v1/feed | JWT | Activity feed |

---

## 7. Caching Strategy

| Data | Store | TTL | Invalidation |
| ------ | ------- | ----- | -------------- |
| Leaderboard (week) | Redis sorted set | 10 min | ZADD on write |
| Leaderboard (month, alltime) | Redis sorted set | 1 hour | ZADD on write |
| Session list (per user) | Redis string (JSON) | 60 sec | DEL on write |
| Public profile stats | Redis string (JSON) | 5 min | DEL on write |
| Rate limit counters | Redis sliding window | 1 hour | Natural expiry |

---

## 8. Background Jobs

### Session Aggregation (in-process interval — ADR-010, supersedes ADR-008/BullMQ)

- **Trigger:** an in-process `setInterval` (5 min) in the API process; an
  in-process guard prevents overlapping runs, and `RUN_AGGREGATION` gates it so
  only one instance runs the loop if ever scaled out.
- **Logic:** `SELECT DISTINCT user_id` → per user fetch events by `ts` →
  boundary detection → finalize only *closed* sessions → build
  sessions/langs/files/heatmap, update streaks, delete finalized events (one
  txn/user) → `ZINCRBY` leaderboard after commit.
- **Failure:** a failed user is logged and retried on the next tick — its
  events stay in the table until successfully finalized (no queue/DLQ). Re-runs
  are idempotent because only closed sessions are written.
- **Cost:** zero idle Redis commands (no queue polling); Redis touched only on
  session write. This is the reason BullMQ was dropped — see ADR-010.

### Streak Maintenance Job

- **Trigger:** in-process `setInterval` (hourly) in the API process, gated by
  `RUN_AGGREGATION` like the aggregation loop (ADR-010 — no external cron); an
  in-process guard prevents overlapping runs. Hourly (not daily) so a broken
  streak is corrected within an hour of the UTC rollover rather than at a single
  fixed wall-clock minute that a restart could miss.
- **Logic:** one bulk `UPDATE streaks SET current_days = 0 … RETURNING` for users
  with `current_days > 0` and `last_active_date < yesterday` (UTC). `longest_days`
  and `last_active_date` are left intact so the next session restarts the streak
  at 1. Idempotent — already-zeroed rows are excluded by the `current_days > 0`
  guard.
- **Settled-user guard:** the update also requires `NOT EXISTS` any `events` row
  for the user. Aggregation lags reality (15-min idle gap + 5-min tick) and only
  advances `last_active_date` on finalize, so a session ending near 00:00 UTC can
  leave `last_active_date` stale just after midnight. Since events are pruned on
  finalize, "no events" means `last_active_date` is authoritative; users with
  pending events are skipped this tick and re-evaluated once their session
  aggregates. This prevents a midnight-spanning session from being mis-scored
  as a broken streak.

### Weekly Recap Email Job

- **Trigger:** cron every Sunday 09:00 UTC
- **Logic:** compile stats for users with sessions in past 7 days → send via Resend/Postmark

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

- **MVP:** EC2 t3.micro free tier · Upstash Redis free · Railway $5/mo ·
  Vercel free = ~$5/mo
- **1k DAU:** Same stack
- **5k DAU:** Upgrade to t3.small, add Railway read replica
- **10k DAU:** Migrate to ECS Fargate + ALB, move Redis to ElastiCache
- **50k DAU:** ECS auto-scaling, CloudFront, separate ingest/read services

### Deployment Secrets (GitHub Actions)

The EC2 instance is not provisioned yet, so the `deploy-api` workflow
(`.github/workflows/deploy-api.yml`) is **manual-only** (`workflow_dispatch`).
Once EC2 is live, switch its trigger back to `push` on `main` and set these
repository secrets under **Settings → Secrets and variables → Actions**:

- `EC2_HOST` — public IP or domain of the EC2 instance
- `EC2_SSH_KEY` — contents of the `.pem` private key file

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
