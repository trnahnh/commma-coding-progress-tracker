# Load test harness

A synthetic seed-and-load harness for commma. It creates tagged `loadtest-*`
users, drives the real ingest and read paths with ramping concurrency to find
the breaking point, runs the real aggregation pipeline, and tears everything
down again.

It is the practical form of the pre-deploy load-test gate (`CLAUDE.md` backend
audit check 11) and the Phase 3 latency DoD in `docs/METRICS.md`.

## What it does

- **seed** — inserts `--users` synthetic users (`loadtest-00000` …), idempotent.
- **ingest** — signs a JWT per user and round-robins `POST /v1/ingest`, ramping
  concurrency until the error rate or p95 ceiling trips (the knee). Each request
  is a coherent backdated mini-session so aggregation forms real sessions.
- **aggregate** — runs the real `runAggregation()` once so sessions, streaks,
  and the Redis leaderboard materialize (local only; in prod the in-process
  scheduler does this within ~5 minutes).
- **read** — ramps the authed read hot paths (`/v1/me`, `/v1/feed`,
  `/v1/sessions`). These are user-keyed in the rate limiter, so round-robining
  700 tokens avoids a single-IP cap masking the server knee.
- **teardown** — prefix-scoped cascade delete of every synthetic row plus Redis
  leaderboard and badge-cache cleanup.

## Why round-robin tokens

Public reads (`/v1/leaderboard`, `/v1/activity`, `/v1/stats`,
`/v1/users/:handle`) are IP-keyed at 300/hour, so a single load box hits that
cap almost immediately and measures the limiter, not the server. The authed read
paths are user-keyed at 300/hour each, so 700 users give ~210k/hour of headroom
— enough to find the real knee.

## Configuration

Reads from the API `.env` (via `dotenv`), with `LOADTEST_*` overrides so prod
runs never depend on the dev defaults by accident:

| Variable                | Falls back to  | Purpose                        |
| ----------------------- | -------------- | ------------------------------ |
| `LOADTEST_TARGET`       | `local`        | `local` or `prod` (guardrails) |
| `LOADTEST_API_URL`      | `localhost`    | API base URL                   |
| `LOADTEST_DATABASE_URL` | `DATABASE_URL` | seed/teardown target DB        |
| `LOADTEST_JWT_SECRET`   | `JWT_SECRET`   | signs synthetic access tokens  |
| `LOADTEST_REDIS_URL`    | `REDIS_URL`    | teardown leaderboard cleanup   |

## Local rehearsal (Phase A)

Bring up the local stack, apply migrations, and run the API with the in-process
aggregator disabled so only the harness aggregates:

```bash
docker compose up -d
pnpm --filter @commma/db migrate
RUN_AGGREGATION=false pnpm --filter @commma/api dev
```

Then, in another shell:

```bash
pnpm --filter @commma/api loadtest -- --users=700
```

The orchestrator runs seed → ingest → aggregate → read and prints a summary.
Tear down when finished:

```bash
pnpm --filter @commma/api loadtest:teardown
```

## Prod run (Phase B)

This is the only run that produces real CloudWatch and Grafana data. Set the
prod target and credentials in the environment first:

```bash
export LOADTEST_TARGET=prod
export LOADTEST_API_URL=https://api.commma.dev
export LOADTEST_DATABASE_URL=...   # Neon
export LOADTEST_JWT_SECRET=...      # prod JWT secret
export LOADTEST_REDIS_URL=...       # Upstash
pnpm --filter @commma/api loadtest
```

Under `LOADTEST_TARGET=prod` the orchestrator:

- caps total requests (ingest 12k + read 9k by default) so the run stays well
  under the Upstash 500k commands/month free tier;
- skips the local aggregate phase (the prod scheduler finalizes sessions);
- requires `--confirm` on teardown.

Tear down after capturing metrics:

```bash
pnpm --filter @commma/api loadtest:teardown -- --confirm
```

## Individual phases

```bash
pnpm --filter @commma/api loadtest:seed -- --users=700
pnpm --filter @commma/api loadtest:ingest -- --ramp=10,50,100,200 --per-step=2000
pnpm --filter @commma/api loadtest:aggregate
pnpm --filter @commma/api loadtest:read -- --read-ramp=10,50,100,200
pnpm --filter @commma/api loadtest:teardown
```

## Key flags

| Flag                  | Default (local) | Meaning                        |
| --------------------- | --------------- | ------------------------------ |
| `--users`             | 700             | synthetic users to seed        |
| `--batch`             | 60              | events per ingest request      |
| `--ramp`              | 10..400         | ingest concurrency steps       |
| `--per-step`          | 2000            | ingest requests per step       |
| `--max-requests`      | 40000           | hard ingest request cap        |
| `--p95-ceiling`       | 2000            | ingest knee p95 trip (ms)      |
| `--read-ramp`         | 10..400         | read concurrency steps         |
| `--read-max-requests` | 30000           | hard read request cap          |
| `--error-ceiling`     | 0.02            | knee trip on 5xx/network rate  |
| `--skip-seed`         | off             | reuse already-seeded users     |
| `--skip-aggregate`    | off (prod: on)  | skip the manual aggregate pass |

## What to watch during the prod run

- **Grafana Cloud / Loki** — ingest p95, read p95, 5xx rate, aggregation lag
  (derived from the `request` and `aggregation_cycle` logs).
- **CloudWatch** — API-box CPU, memory, disk, EC2 status checks.
- **Neon console** — connection count, storage, compute time.
- **Upstash console** — command count against the monthly budget.
