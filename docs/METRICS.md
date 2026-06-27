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

- **Today:** structured JSON logs (`apps/api/src/logger.ts`) — a per-request
  `request` line (`method`/`path`/`status`/`ms`) and a per-cycle
  `aggregation_cycle` line (`maxLagMs` + counts/duration). The **Level 1**
  app-SLO pipeline is wired (`docs/OBSERVABILITY.md`): Grafana Alloy
  (`infra/alloy/config.alloy`) ships those logs off-box to **Grafana Cloud
  Loki**, where the SLOs below are derived with LogQL at query time. The
  pipeline is code-complete and provisioned; it goes live the moment the Grafana
  Cloud credentials are set on the box, after which the `now` values stop being
  local-only.
- **Planned (Phase 3 / infra):** stand up the Grafana dashboards + the two alert
  rules (5xx rate, ingest p95) on the shipped logs, then — when traffic
  justifies latency decomposition — add **Level 2** OpenTelemetry traces
  exporting OTLP to the same Grafana Cloud stack. Until the dashboards land,
  values are read ad-hoc from Loki (Explore/LogQL), the DB, and the Upstash/Neon
  consoles.
- **Two-layer split.** Observability is deliberately split by layer so no single
  tool is asked to do what it can't. **CloudWatch is the infra layer only**
  (`infra/terraform/cloudwatch.tf`): API-box host health (CPU, memory, root
  disk, swap via the CloudWatch Agent), the EC2 status check, and a Route 53
  health check on `api.commma.dev/health` — all alarmed to the `commma-alerts`
  SNS topic (email). Two of those alarms are **self-healing**, not just
  notifying: a `StatusCheckFailed_System` alarm fires the EC2 `recover` action
  and a `StatusCheckFailed_Instance` alarm fires `reboot`, so a host fault
  recovers without a manual round trip (cutting MTTR on the single API box). A
  Data Lifecycle Manager policy (`infra/terraform/dlm.tf`) takes a daily 7-day
  root-volume snapshot as the recovery path for the box's only non-reproducible
  state. It is **not** the application-SLO sink: CloudWatch cannot see Neon
  (Postgres) or Upstash (Redis), which run off AWS and are read from their own
  consoles (the cost guardrails below). The **application SLOs** (ingest/read
  p95, `5xx` rate, aggregation lag) live on the Grafana Cloud route instead
  (Level 1: structured logs shipped to Loki, SLOs derived via LogQL; see
  `docs/OBSERVABILITY.md`), derived from the request logs so they span the EC2
  box and the managed services in one place — with OpenTelemetry traces as the
  later Level 2 on the same backend. Keep CloudWatch to default + agent metrics
  and a few alarms; pushing high-cardinality custom metrics or all request logs
  into CloudWatch Logs is billable and is the wrong layer for it.

---

## 1. System / SLO

| Metric                         | now                                    | target         | source                  |
| ------------------------------ | -------------------------------------- | -------------- | ----------------------- |
| Ingest p95 (`POST /v1/ingest`) | 73ms @10c local                        | <50ms srv      | `request` log → Loki    |
| Read p95 (see note)            | 153ms @100c local; ~155ms srv-est prod | <200ms; <150ms | `request` log + k6      |
| Aggregation lag                | ~6–10 min prod (2026-06-27)            | ≤~20 min       | `aggregation_cycle` log |
| Ingest success (`202`/total)   | 100% / 16.5k ingest (local+prod)       | ≥99.9%         | `request` log → Loki    |
| Server errors (`5xx`/total)    | 0% / 33k req (local+prod)              | <0.1%          | `request` log → Loki    |
| Availability                   | R53 health check                       | 99.5% (MVP)    | CloudWatch alarm        |
| Lighthouse mobile perf         | 90 (2026-06-19)                        | ≥90            | `npx lighthouse`        |
| Lighthouse mobile a11y         | 95 (2026-06-19)                        | ≥90            | `npx lighthouse`        |

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

Load test (local, 2026-06-27): a typed in-repo harness
(`apps/api/scripts/loadtest/`, seed → ingest → aggregate → read → teardown)
seeded **700 synthetic users** and drove the real pipeline, round-robining 700
signed JWTs so per-user rate caps never mask the server knee (public reads are
IP-keyed, so the authed user-keyed reads are the load surface). Against one dev
API (single Node process, native Postgres, Docker Redis): ingest sustained a
**~190 rps** `202` ceiling with a textbook saturation curve — p95 73 → 154 → 298
→ 695 → 1236 → 2741 ms across 10 → 400 concurrent (latency = concurrency ÷
throughput) — with **zero `5xx`, zero errors** across **12,000 requests /
720,000 events** in 63.6 s; knee at 400 concurrent (60-event batches, heavier
than the single-event `<50 ms` target). The async aggregator finalized **11,548
sessions** from those 720k events in ~45 s (sequential per-user) and **drained
the `events` hot table to 0 rows** post-finalize, confirming the
storage-discipline guardrail under load. Read p95 held at **153 ms @ 100
concurrent — within the `<200 ms` SLO** — on a populated 12k-session DB, with a
**~1,000 rps** read ceiling (≈5× ingest) and zero errors to 400 concurrent (p95
620 ms). Teardown removed all 700 users + 11.7k sessions and `ZREM`'d the
leaderboard idempotently (second pass = 0). The prod gate against
`api.commma.dev` (the only environment wired to CloudWatch + Grafana) runs from
this same harness next; its numbers land here when captured.

Load test (prod, 2026-06-27): the same harness run against live `api.commma.dev`
(EC2 **t4g.small** `i-066e0ba33b711ff85` + Neon + Upstash) — the first
prod-sized exercise of the full stack and its observability. 700 synthetic
users + a capped ramp (25 → 50 → 100 concurrent) drove **4,500 ingest requests /
271,200 events** with **zero `5xx`, zero `429`, zero errors**; ingest saturated
at **~95 rps** (half the local dev box, as expected for t4g.small +
cross-network Neon inserts) with the same flat-throughput / linear-latency
signature. **The bottleneck is not CPU:** CloudWatch showed the box rise from
**~1.2% idle to ~25% peak** CPUUtilization at the throughput ceiling, so ingest
is **Neon-round-trip / connection-pool bound** (`DB_POOL_MAX=10`), not compute —
vertical CPU scaling would not raise it; pool/batch tuning or lower DB latency
would. The live in-process aggregator then finalized all 271,200 events into
**4,447 sessions and drained the `events` table to 0** in a single ~2-min
scheduler pass, an **end-to-end ingest→finalize lag of ~6–10 min** (well within
the `≤20 min` target). Reads against the materialized data scaled to **~447 rps
@ 100 concurrent** (climbing, unlike write-bound ingest) at **p95 256 ms
client-side** — which nets to **~155 ms server-side** after the ~100 ms
laptop→`us-east-1` RTT, matching the local figure and within the `<200 ms` SLO —
again with zero errors. Teardown removed all 700 users + 4,447 sessions and
cleaned the Redis leaderboard (verified 0 residual on the public board).
**Caveat:** harness latencies are client-observed end-to-end (laptop →
`us-east-1`), so they include network RTT; the authoritative server-side p95 is
the `request`-log `ms` in Grafana/Loki — the harness's role is to prove
zero-error throughput and drive the CloudWatch/Grafana/Neon/Upstash signal,
which it did.

Pool tuning — `DB_POOL_MAX` 10→25, and an honest negative result (2026-06-27).
**Controlled experiment** — to test the "pool-bound, not CPU" hypothesis, one
API instance ran against **real prod Neon** from a laptop (so each query paid
the ~100 ms cross-internet round trip — an _artificial_ high-DB-latency regime),
local Redis, identical 700-user ingest (`25 → 50 → 100` concurrent, 4,500
requests / 270,000 events), at pool=10 then pool=25:

| `DB_POOL_MAX` | sustained ingest  | p95 @100c | wall (4.5k req) |
| ------------- | ----------------- | --------- | --------------- |
| 10            | ~67 rps           | 1,518 ms  | 67.1 s          |
| 25            | ~153 rps          | 733 ms    | 29.9 s          |
| **delta**     | **+128% (~2.3×)** | **−52%**  | —               |

In that regime the pool was clearly the limiter (+2.3×, near-linear, zero
errors). **But on the real box it is not.** Re-running the same ingest against
live `api.commma.dev` — t4g.small co-located with Neon in `us-east-1`, so DB
round-trips are ~1–5 ms — gave **~95 rps at both pool=10 and pool=25** (91/96/95
vs 83/93/96 across 25/50/100 concurrent): **no change**. The laptop experiment
measured a bottleneck (cross-internet DB latency) that does not exist in prod,
so its 2.3× does **not** transfer. The `DB_POOL_MAX` default is now 25
(`apps/api/src/env.ts`) and the live box `.env` was set to 25 + restarted
(verified) — kept as harmless headroom for future concurrency, **not** a
measured prod throughput win. The ~95 rps figure later proved to be a
**load-generation artifact, not a server ceiling** (next section): from a single
client, ingest is bound by upload bandwidth for realistic batch sizes, and the
box never left ~25% CPU. pool=25 is harmless headroom; no real prod ingest
ceiling was reached.

### Ingest path — optimizations and the load-generation finding (2026-06-27)

Two server-side ingest optimizations shipped, plus a correction to how the
"ceiling" was being read:

- **Privacy-mode cache.** Every ingest ran a `SELECT users.privacy` before
  insert — a per-request Postgres round-trip averaging **~42 ms (p50 41 ms)** on
  prod, nearly as costly as the **~35 ms** batch insert, for a value that rarely
  changes. Serving it from a Redis cache (`priv:v1:<id>`, 60 s TTL, invalidated
  on privacy change and account deletion, fail-open to Postgres) cut the lookup
  to **~13 ms p50 (~70% lower)** while keeping the ADR-006 privacy modes exact
  (a downgrade still takes effect immediately via invalidation). Measured
  server-side from the new `ingest_db` log, so it is independent of client
  bandwidth.
- **Redis auto-pipelining** (`enableAutoPipelining`) batches the per-request
  rate-limit evals issued in the same event-loop tick into single round-trips.
- **The cap was the generator, not the API.** With 60-event (~15 KB) batches,
  ingest from one client plateaus at **~95 rps**; shrinking the batch to 5
  events lifts it to **~340 rps** on the same path — an upload-bandwidth /
  request-body limit, not the server, which stayed at **~25% CPU** throughout.
  The true prod ingest ceiling is therefore **higher than measured and still
  open** — establishing it needs an in-region load generator (a second EC2), per
  the Phase 3 gate. Across the whole campaign: **zero `5xx`, zero `429`** on
  tens of thousands of requests.

Engineering outcomes:

- Cut the ingest hot-path privacy lookup from 42 ms to 13 ms p50 by serving the
  mode from a Redis cache with correct invalidation, removing a redundant
  per-request Postgres read while keeping the privacy guarantee exact.
- Added per-stage ingest timing (`ingest_db`: lookup/insert ms) so hot-path cost
  is attributable from logs, and enabled Redis command auto-pipelining on the
  rate-limited path.
- Established that the API box serves ingest at ~25% CPU under single-client
  load, with the observed rate bound by client upload bandwidth — directing
  capacity work toward an in-region generator and horizontal API instances
  rather than the already-lean per-request code.

Aggregation lag: 5-min interval + 15-min idle gap (ADR-010); event `ts` →
`sessions.created_at`.

## 2. Cost guardrails

| Metric            | now                  | target         | source                 |
| ----------------- | -------------------- | -------------- | ---------------------- |
| Redis cmds/mo     | ~0 idle (ADR-010)    | <500k/mo       | Upstash / commandstats |
| `events` rows     | 0 after finalize ✓   | bounded        | `count(*)`             |
| `sessions` growth | historical (rebuild) | Neon free tier | count + table size     |
| Postgres storage  | not measured         | 5 GB free      | Neon console           |
| Recap LLM spend   | ~$0/wk (free-mode)   | <$1/wk MVP     | OpenAI usage console   |

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
re-enable. The 2026-06-27 load test confirmed the events-drain guardrail (✓):
after the aggregator finalized 720k synthetic events into 11,548 sessions, the
`events` table held **0 rows**, so the hot table stays bounded under sustained
ingest.

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
