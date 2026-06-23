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

- **Today:** structured JSON logs (`apps/api/src/logger.ts`) and the Hono
  request logger (per-request method/path/status/ms). No metrics aggregation,
  export, or dashboards exist. The stack is **deployed live** as of 2026-06-14
  (`commma.dev` / `api.commma.dev`), but production is still uninstrumented —
  the `now` values below remain local/not-measured until a sink is added.
- **Planned (Phase 3 / infra):** choose a metrics sink (e.g. OpenTelemetry →
  hosted backend), derive the SLOs below from request logs, add alerting. Until
  then, values are read ad-hoc from logs, the DB, and the Upstash/Neon consoles.

---

## 1. System / SLO

| Metric                         | now             | target         | source                 |
| ------------------------------ | --------------- | -------------- | ---------------------- |
| Ingest p95 (`POST /v1/ingest`) | ~38ms (local)   | <50ms srv      | Hono logger → sink     |
| Read p95 (see note)            | local only      | <200ms; <150ms | logger + k6            |
| Aggregation lag                | not measured    | ≤~20 min       | `created_at − max(ts)` |
| Ingest success (`202`/total)   | not measured    | ≥99.9%         | request logger         |
| Server errors (`5xx`/total)    | not measured    | <0.1%          | logger / unhandled     |
| Availability                   | not measured    | 99.5% (MVP)    | `/health` uptime       |
| Lighthouse mobile perf         | 90 (2026-06-19) | ≥90            | `npx lighthouse`       |
| Lighthouse mobile a11y         | 95 (2026-06-19) | ≥90            | `npx lighthouse`       |

Lighthouse mobile perf is the **median of 3 local `vite preview` runs**
(2026-06-19: 87 / 94 / 90) — it now hovers right at the `≥90` line, down from 91
as the live-keyboard hero (0.7.0) added weight. The swing is **LCP-bound**
(2.5–3.5 s across runs); a11y held at 95. Local preview is unthrottled and
noisy, so treat this as "at threshold, watch LCP," not a hard pass.

Read p95 routes: `/v1/me`, `/v1/sessions`, `/v1/sessions/:id`,
`/v1/leaderboard`, `/v1/users/:handle`, `/v1/feed`, `/v1/stats`, `/v1/activity`,
and the members-only team reads (`/v1/teams/:slug`,
`/v1/teams/:slug/leaderboard`, `/v1/teams/:slug/heatmap`). Targets: <200 ms @
100 concurrent (Phase 2 DoD); <150 ms @ 1k (Phase 3 DoD). Both heatmap-card
variants are **render-bound** (`sharp` rasterize) and excluded from the read-p95
target: the authed `POST /v1/sessions/:id/heatmap-card` and the public
`GET /v1/sessions/:id/heatmap-card` (crawler `og:image`,
`Cache-Control: public, max-age=600` + CDN) share the `card` rate bucket and the
Redis PNG cache; the load test must not hold either to `<150 ms`.

Load test (local, 2026-06-14): a Node/`fetch` harness (no k6 yet) against one
dev instance — indicative only, **not** the prod-sized gate. Read p95 ~80 ms @
50 concurrent and ~160 ms @ 100 (throughput knee ~1,400 rps on the dev box);
ingest 202-path p95 ~38 ms (within `<50 ms`) with a hard 1,000/hr-per-user cap
and clean `429` backpressure (zero `5xx`). It surfaced and fixed an
empty-leaderboard-period rebuild storm — a session-less week never created its
Redis key, so every read re-ran the cold rebuild (now negative-cached). The
prod-sized gate (`<150 ms` p95 @ 1k concurrent on t4g.micro + Neon + Upstash via
k6, from a separate load box) is still open (`ROADMAP.md` Phase 3).

Aggregation lag: 5-min interval + 15-min idle gap (ADR-010); event `ts` →
`sessions.created_at`.

## 2. Cost guardrails

| Metric            | now                   | target         | source                 |
| ----------------- | --------------------- | -------------- | ---------------------- |
| Redis cmds/mo     | ~0 idle (ADR-010)     | <500k/mo       | Upstash / commandstats |
| `events` rows     | pruned after finalize | bounded        | `count(*)`             |
| `sessions` growth | historical (rebuild)  | Neon free tier | count + table size     |
| Postgres storage  | not measured          | 5 GB free      | Neon console           |
| Recap LLM spend   | ~$0/wk (free-mode)    | <$1/wk MVP     | OpenAI usage console   |

Redis cost drivers: per-request rate limits + per-finalize `ZINCRBY` (no
BullMQ), plus a handful of cache-aside entries — the heatmap-card PNG
(`card:v1:…`, 10-min TTL), per-user badges (`badges:v1:<id>`, ~10 min), and the
team aggregate heatmap (`team:heatmap:v1:<teamId>`, ~10 min). Each is one `GET`
plus an occasional `SET` on miss (not a hot per-request loop) and is fail-open,
so the command budget story holds. The infra-audit additions are likewise
negligible: a once-per-interval leader-lock `SET … NX` per scheduler (five loops
— aggregation every 5 min, the rest hourly/daily), the leaderboard rebuild lock,
and the empty-period marker (`lbempty:<key>`, 60s TTL) — all single commands,
fail-open, and far below the per-request rate-limit volume. `events` holds only
open/recent sessions after aggregation prunes finalized rows; bounded heartbeat
field sizes + the 1 MB ingest body cap keep per-event/per-batch storage bounded.
The heatmap-card PNG is now cached in Redis (image bytes only, privacy
re-checked per request) and fronted by CloudFront on the public `GET`, so render
cost is amortized for feed thumbnails and crawler `og:image` hits. The weekly
recap's optional AI prose layer (OpenAI `gpt-4.1-nano`) runs at most once per
Pro/Team user per week — short structured-copy generation at ~$0.0002/recap —
and is fully skippable (no `OPENAI_API_KEY` → deterministic template), so it
cannot become a runaway cost. Under the free-mode launch the scheduled send
(`recap/run.ts`) stays gated to literal `['pro','team']` (never free mode), so
with no paid users it sends to no one and **actual spend is ~$0/wk**; the
~$0.0002/recap unit cost is the estimate to hold against when paid plans
re-enable.

## 3. Privacy / trust (invariants — verifiable, brand-defining)

| Metric                | now                    | target        | source             |
| --------------------- | ---------------------- | ------------- | ------------------ |
| Key-content bytes     | **0** (histogram only) | **0** forever | schema + audit     |
| `contentChanges.text` | never stored           | never         | `keyCounter.ts`    |
| PII (see note)        | server-enforced modes  | minimal modes | schema + ingest    |
| Leaderboard drift     | not measured           | 0             | DB sum vs `ZSCORE` |

Key-content: no content column; only `key_freq` label histograms (ADR-006). PII:
emails always; file paths when `privacy = full`. `summary` drops paths +
`key_freq`; `off` stores nothing. Enforced **server-side at ingest** (not just
by the extension) — `summary` strips `file`/`key_freq` before insert, `off`
persists no events; `GET /v1/sessions/:id` also withholds files/heatmap from
non-owners of `summary` owners. The same gate extends to every derived read: the
authed `heatmap-card` (non-`full` owners' cards are owner-only) and the public
`GET` heatmap-card + server-side `badges` are served for `privacy = 'full'` only
(`404` otherwise, no existence leak), with the privacy check evaluated before
any cache or DB read so a downgrade takes effect immediately. Team reads are
members-only (`404` to non-members, no existence leak). Auditable via the
`events`/`sessions` rows, independent of client.

Leaderboard: `Σ sessions.duration_s` per period must match Redis ZSET score.
Drift surfaces post-commit `ZINCRBY` failure (backlog B); Phase-2 rebuild fixes.

## 4. Product (post-launch — aspirational until users exist)

All currently **now: pre-launch, no users**, except extension installs (already
real, see below). Defined here so instrumentation lands with the features rather
than being retrofitted.

The two billing rows below — **free → paid conversion** and **team adoption
(`plan='team'`)** — are **deferred with the paid tiers**, not merely awaiting
users. The free-mode launch (FREE_MODE on, paid plans deferred to ~2029, Stripe
dormant) removes the checkout path entirely: `users.plan` stays `free` for
everyone and access gates open via `hasProAccess`/`hasTeamAccess`, so `plan`
carries no conversion or team-tier signal until paid plans re-enable. Treat both
targets as inactive for this launch.

| Metric                         | now                  | target         | source                       |
| ------------------------------ | -------------------- | -------------- | ---------------------------- |
| Extension installs             | ~200 (2026-06-22)    | grows MoM      | Marketplace + Open VSX stats |
| Activation (install → HB @24h) | not measured         | ≥60%           | extension telemetry + events |
| Retention W1 / W4              | not measured         | W1≥40%; W4≥20% | cohort on events/sessions    |
| Sessions / active user / week  | not measured         | ≥5             | `sessions`                   |
| Streak (`currentDays ≥ 3`)     | not measured         | grows MoM      | `streaks`                    |
| Free → paid conversion         | inactive (free-mode) | ≥3%            | `users.plan` + Stripe        |
| Team adoption (`plan='team'`)  | not measured         | grows MoM      | `users.plan` + `teams`       |
| Launch GitHub stars            | not measured         | 200 / 72h      | GitHub (ROADMAP Ph4)         |

---

## Review cadence

Revisit at each phase boundary: confirm the prior phase's targets are met (or
consciously deferred), and add metrics for the features the next phase
introduces.
