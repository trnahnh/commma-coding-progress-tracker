# Metrics

The canonical definition of what "good" means for commma — system health, cost,
privacy guarantees, and (post-launch) product health. This is a **contract of
targets and how we measure them**, not a dashboard. Most metrics are **not
instrumented yet**; the honest current state is recorded per row so this file
doesn't drift into fiction.

Single source of truth for metric targets — other docs (e.g. `ROADMAP.md` DoDs)
should reference these rather than restating numbers.

## How to read

Each metric lists:

- **now** — what is actually measured/true today (often "not instrumented").
- **target** — the number or state we are aiming for.
- **source** — where the value comes from, or how we will measure it.

## Instrumentation status

- **Today:** structured JSON logs (`apps/api/src/logger.ts`) and the Hono request
  logger (per-request method/path/status/ms). No metrics aggregation, export, or
  dashboards exist.
- **Planned (Phase 3 / infra):** choose a metrics sink (e.g. OpenTelemetry →
  hosted backend), derive the SLOs below from request logs, add alerting. Until
  then, values are read ad-hoc from logs, the DB, and the Upstash/Railway consoles.

---

## 1. System / SLO

| Metric | now | target | source |
| --- | --- | --- | --- |
| Ingest latency p95 (`POST /v1/ingest`) | per-request ms in logs only | < 50 ms server-time | Hono request logger → metrics sink |
| Read latency p95 (`/v1/me`, `/v1/sessions`, future `/v1/sessions/:id`, `/v1/leaderboard`) | not instrumented | < 200 ms @ 100 concurrent (Phase 2 DoD); < 150 ms @ 1k (Phase 3 DoD) | request logger; k6 load test |
| Aggregation lag (event `ts` → `sessions.created_at`) | not measured | ≤ ~20 min by design (5-min interval + 15-min idle gap; ADR-010) | `sessions.created_at − max(event.ts)` |
| Ingest success rate (`202` / total) | not measured | ≥ 99.9% | request logger |
| Server error rate (`5xx` / total) | not measured | < 0.1% | request logger / `unhandled_error` logs |
| Availability | not measured | 99.5% (MVP) | uptime check on `/healthz` |

## 2. Cost guardrails

| Metric | now | target | source |
| --- | --- | --- | --- |
| Redis commands / month | ~0 idle by design (interval aggregation, not BullMQ — ADR-010); cost = per-request rate-limit + per-finalize `ZINCRBY` | < 500k/mo (Upstash free tier) | Upstash console / `INFO commandstats` |
| `events` table size | bounded — finalized rows are pruned, holds only open/recent sessions | stays bounded regardless of history | `count(*)` on `events` |
| `sessions` table growth | grows with history (intended; basis for leaderboard rebuild) | within Railway plan; monitor | `count(*)`, table size |
| Postgres storage (Railway) | not measured | within ~$5 plan at MVP | Railway console |

## 3. Privacy / trust (invariants — verifiable, brand-defining)

| Metric | now | target | source |
| --- | --- | --- | --- |
| Key-content bytes stored | **0** — schema has no content column; only `key_freq` label histograms | **0, permanently** (ADR-006) | schema review + ingest payload audit; verifiable in the OSS extension |
| `contentChanges.text` retained | never — folded into a counter then discarded (ADR-006 amendment) | never | extension source review (`keyCounter.ts`) |
| PII surface | emails (auth) + file paths (only when `privacy = full`) | minimal; `summary` drops file paths + `key_freq`, `off` sends nothing | schema + `privacy.ts` |
| Leaderboard reconciliation drift | not measured | 0 — `Σ sessions.duration_s` per period == Redis ZSET score | compare DB sum vs `ZSCORE`; surfaces the post-commit `ZINCRBY` failure risk (backlog B), fixed by the Phase-2 rebuild |

## 4. Product (post-launch — aspirational until users exist)

All currently **now: pre-launch, no users.** Defined here so instrumentation
lands with the features rather than being retrofitted.

| Metric | target | source |
| --- | --- | --- |
| Activation: install → first heartbeat within 24h | ≥ 60% | extension install telemetry + first `events` row |
| Retention W1 / W4 | W1 ≥ 40% / W4 ≥ 20% | active-user cohort over `events`/`sessions` |
| Engagement: sessions per active user / week | ≥ 5 | `sessions` |
| Streak participation (users with `currentDays ≥ 3`) | grows MoM | `streaks` |
| Growth: GitHub stars at launch | 200 within 72h (ROADMAP Phase 4 DoD) | GitHub |

---

## Review cadence

Revisit at each phase boundary: confirm the prior phase's targets are met (or
consciously deferred), and add metrics for the features the next phase introduces.
