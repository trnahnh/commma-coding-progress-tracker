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
| Ingest p95 (`POST /v1/ingest`) | logs only | <50ms srv | Hono logger → sink |
| Read p95 (see note) | not instrumented | <200ms; <150ms | logger + k6 |
| Aggregation lag | not measured | ≤~20 min | `created_at − max(ts)` |
| Ingest success (`202`/total) | not measured | ≥99.9% | request logger |
| Server errors (`5xx`/total) | not measured | <0.1% | logger / unhandled |
| Availability | not measured | 99.5% (MVP) | `/healthz` uptime |

Read p95 routes: `/v1/me`, `/v1/sessions`, `/v1/sessions/:id`, `/v1/leaderboard`.
Targets: <200 ms @ 100 concurrent (Phase 2 DoD); <150 ms @ 1k (Phase 3 DoD).

Aggregation lag: 5-min interval + 15-min idle gap (ADR-010); event `ts` →
`sessions.created_at`.

## 2. Cost guardrails

| Metric | now | target | source |
| --- | --- | --- | --- |
| Redis cmds/mo | ~0 idle (ADR-010) | <500k/mo | Upstash / commandstats |
| `events` rows | pruned after finalize | bounded | `count(*)` |
| `sessions` growth | historical (rebuild) | Railway plan | count + table size |
| Postgres storage | not measured | ~$5 MVP plan | Railway console |

Redis cost drivers: per-request rate limits + per-finalize `ZINCRBY` (no BullMQ).
`events` holds only open/recent sessions after aggregation prunes finalized rows.

## 3. Privacy / trust (invariants — verifiable, brand-defining)

| Metric | now | target | source |
| --- | --- | --- | --- |
| Key-content bytes | **0** (histogram only) | **0** forever | schema + audit |
| `contentChanges.text` | never stored | never | `keyCounter.ts` |
| PII (see note) | server-enforced modes | minimal modes | schema + ingest |
| Leaderboard drift | not measured | 0 | DB sum vs `ZSCORE` |

Key-content: no content column; only `key_freq` label histograms (ADR-006).
PII: emails always; file paths when `privacy = full`. `summary` drops paths +
`key_freq`; `off` stores nothing. Enforced **server-side at ingest** (not just by
the extension) — `summary` strips `file`/`key_freq` before insert, `off` persists
no events; `GET /v1/sessions/:id` also withholds files/heatmap from non-owners of
`summary` owners. Auditable via the `events`/`sessions` rows, independent of client.

Leaderboard: `Σ sessions.duration_s` per period must match Redis ZSET score.
Drift surfaces post-commit `ZINCRBY` failure (backlog B); Phase-2 rebuild fixes.

## 4. Product (post-launch — aspirational until users exist)

All currently **now: pre-launch, no users.** Defined here so instrumentation
lands with the features rather than being retrofitted.

| Metric | target | source |
| --- | --- | --- |
| Activation (install → HB @24h) | ≥60% | extension telemetry + events |
| Retention W1 / W4 | W1≥40%; W4≥20% | cohort on events/sessions |
| Sessions / active user / week | ≥5 | `sessions` |
| Streak (`currentDays ≥ 3`) | grows MoM | `streaks` |
| Launch GitHub stars | 200 / 72h | GitHub (ROADMAP Ph4) |

---

## Review cadence

Revisit at each phase boundary: confirm the prior phase's targets are met (or
consciously deferred), and add metrics for the features the next phase introduces.
