# Enhancement Report: Reliability and Verification

Branch `enhance/reliability-and-verification`, cut from `main` at `6174d06` on
2026-10-25. Nothing was pushed, deployed, or changed in AWS, Neon, Upstash,
GitHub or GitLab. Every number below comes from a command that was run on this
branch; the raw output is in `docs/enhancement-evidence/`. All data is
**synthetic** unless stated otherwise.

**Test environment:** Windows 11 laptop, Node v24.12.0, native PostgreSQL 18.1
(database `commma_enh_test`, all 13 migrations applied), Redis 7 in Docker
Desktop on database index 9. Production runs Neon Postgres (version not checked
from here) and Upstash Redis. Local numbers are not production numbers.

## Summary

| #   | Item                        | Outcome                                                    |
| --- | --------------------------- | ---------------------------------------------------------- |
| 1   | Scanner concurrency         | Real bug found and fixed: 1,170 duplicate sessions → 0     |
| 2   | Scanner crash (SIGKILL)     | Sessions already crash-safe; leaderboard drift bug fixed   |
| 3   | Privacy verification        | 9,000 property runs, 0 leaks; 4 of 4 injected leaks caught |
| 4   | Privacy cache correctness   | Real race found and fixed: 60s stale window → 0            |
| 5   | Readiness probe             | `/health/ready` probes Postgres + Redis; alarm prepared    |
| 6   | Deploy failure (2026-07-28) | Already redeployed on 2026-09-08; root cause made visible  |
| 7   | Extension overhead          | p50 0.6µs / p99 ≤3.4µs per keystroke on the shipped bundle |
| 8   | CI runs DB-gated suites     | Postgres + Redis service containers added (not yet run)    |

## Phase 1: Audit

Ranked by resume value × feasibility. Items 1–8 were implemented; the rest are
recorded with evidence and left as follow-ups.

| Rank | Candidate                                                   | Why it matters                                                           | Effort | Risk   | Done |
| ---- | ----------------------------------------------------------- | ------------------------------------------------------------------------ | ------ | ------ | ---- |
| 1    | Scanner "idempotent" claim untested under concurrency/crash | Data-integrity claim in ADR-010 and SYSTEM_DESIGN with no test behind it | M      | Low    | Yes  |
| 2    | Privacy guarantee asserted, not tested                      | ADR-006 is the product's core promise                                    | M      | Low    | Yes  |
| 3    | `/health` never touches Postgres                            | 100% availability metric was green through the July Neon outage          | S      | Low    | Yes  |
| 4    | Privacy cache invalidation race                             | A user's `off` choice could be ignored for up to 60s                     | S      | Low    | Yes  |
| 5    | 20 integration tests skipped in CI (no DB service)          | The only route-level tests never run in CI                               | S      | Low    | Yes  |
| 6    | `drizzle-kit migrate` fails silently                        | The 2026-07-28 deploy log has no error text                              | S      | Low    | Yes  |
| 7    | Extension overhead never measured                           | "Lightweight" claim with no number                                       | S      | None   | Yes  |
| 8    | Leaderboard `ZINCRBY` after commit (at-most-once)           | Known drift (METRICS.md "backlog B"), now measured                       | M      | Medium | Yes  |
| 9    | Dependency advisories (29 prod: 7 high)                     | `hono`, `sharp`, `zod`, `react-router` have patched versions             | S      | Medium | No   |
| 10   | Following-feed query seq-scans `sessions`                   | 71–142ms at 400k synthetic sessions, grows with table                    | M      | Low    | No   |
| 11   | Integration tests flaky at the 5s default timeout           | 1 of 3 full runs with a DB failed on timeouts                            | S      | None   | No   |
| 12   | Drizzle snapshots stale since migration 0007                | `drizzle-kit generate` re-emits existing tables                          | S      | Low    | No   |
| 13   | `key_freq` is a per-file, per-minute character histogram    | A privacy caveat the docs do not state                                   | —      | —      | No   |
| 14   | Cache hit rate not observable                               | No hit/miss counter exists                                               | S      | None   | No   |
| —    | Rate limiting on every route                                | Checked: every `/v1` route file is bucketed                              | —      | —      | Pass |
| —    | CORS allowlist                                              | Checked by a new test; the `hono` CORS advisory does not apply           | —      | —      | Pass |
| —    | Secrets in git                                              | `.env*` and `terraform.tfvars` are untracked                             | —      | —      | Pass |

### Known-gap verification

- **Gap 1 (`/health` blind spot):** confirmed. `app.get('/health', ...)`
  returned `{status:'ok'}` with no I/O (`apps/api/src/app.ts:58` on `main`).
- **Gap 2 (Deploy API failed 2026-07-28):** already resolved before this round.
  `gh run list --workflow deploy-api.yml` shows run `30322408336` failed at
  2026-07-28T02:11Z and run `34265952691` (`workflow_dispatch`, `main`)
  succeeded at 2026-09-08T18:55Z. Details in item 6.
- **Gap 3 (scanner under crash/concurrency):** untested, and broken under
  concurrency. Item 1.
- **Gap 4 (privacy guarantee):** structurally asserted only. Item 3. The
  statement "the extension never reads editor content" is **not true as
  worded**: `tracker.ts` reads `change.text` in memory to derive a key label.
  What can be shown is that the content is never stored or sent.

### Baseline

- `pnpm test` without a DB: `1 failed | 159 passed | 15 skipped` on the first
  run, then passing on rerun (the failing test's name was not captured).
- `pnpm test` with `TEST_DATABASE_URL`: 3 consecutive runs gave pass, `2 failed`
  (both `Test timed out in 5000ms` in `integration.test.ts`), pass.
- CI history: `gh run list --workflow ci.yml --limit 200` returns 34 runs, all
  `success` (2026-06-21 to 2026-07-28). The "98.4% over 61 runs" figure from the
  prior audit could not be reproduced from GitHub; it may include GitLab or
  deleted runs.

## Item 1: Scanner exactly-once under concurrency

**Bug found.** `aggregateUser` read a user's events outside any lock, then
inserted sessions and deleted the events in a transaction. Two scanners running
at once both read the same events, both inserted sessions, and the second
`DELETE` matched nothing, so nothing failed. Production is protected today only
by the Redis leader lock (`SET NX PX 300000`), which lapses if a run exceeds 5
minutes, and is bypassed by any direct `runAggregation()` call (the load-test
`aggregate.ts` script does this).

**Fix.** The finalize transaction now starts with
`pg_try_advisory_xact_lock(hashtextextended(user_id, 0))` and re-reads the
user's events inside the transaction. A scanner that does not get the lock skips
that user (`usersLocked` in the cycle log); the holder finalizes it.

**Files:** `apps/api/src/aggregate/run.ts`; new
`apps/api/test/aggregate/scanner.integration.test.ts`,
`apps/api/test/helpers/scanner.ts`.

**Test design.** Each trial seeds 8 synthetic users with 2–4 closed sessions
each (5–25 events per session, seeded PRNG), runs N scanners concurrently with
`Promise.all`, then checks: session count equals expected, no two sessions share
`(user_id, started_at)`, Σ`lines` and Σ key counts are conserved between
`sessions` and remaining `events`, and the `events` table is drained.

**Commands:**

```bash
SCANNER_TRIALS=50 npx vitest run apps/api/test/aggregate/scanner.integration.test.ts
SCANNER_TRIALS=50 SCANNER_CONCURRENCY=4 npx vitest run apps/api/test/aggregate/scanner.integration.test.ts
```

**Results** (`scanner-concurrency-*.txt`):

| Code   | Scanners | Trials | Users | Expected sessions | Actual | Duplicates | Users w/ count violation | Lock skips |
| ------ | -------- | ------ | ----- | ----------------- | ------ | ---------- | ------------------------ | ---------- |
| before | 2        | 50     | 400   | 1,220             | 2,390  | 1,170      | 382                      | n/a        |
| after  | 2        | 50     | 400   | 1,220             | 1,220  | 0          | 0                        | 376        |
| after  | 4        | 50     | 400   | 1,220             | 1,220  | 0          | 0                        | 936        |

The non-zero lock-skip counts show the scanners really did contend; the result
is not an accident of serialized timing.

**Caveats.** Local Postgres 18.1, not Neon. Not observed in production; this is
a latent bug. To check whether it ever fired in production, run (read-only, but
it uses Neon compute):

```sql
select user_id, started_at, count(*) from sessions
group by 1, 2 having count(*) > 1;
```

## Item 2: Scanner killed mid-finalize

**Test design.** Each trial seeds 20 synthetic users, spawns the real
`runAggregation()` in a child process (`node --import tsx`), and `SIGKILL`s it
after a uniform random delay in `[0, calibration run time]`. On Windows this is
`TerminateProcess`; Postgres sees the socket drop and rolls back the open
transaction. A recovery pass then runs in-process, and the invariants from item
1 plus leaderboard drift (Redis `leaderboard:alltime` score vs Σ
`sessions.duration_s`) are checked. The leaderboard key is pre-warmed so the
test exercises the warm-key path where drift would persist.

**Command:**
`CRASH_TRIALS=40 npx vitest run apps/api/test/aggregate/scannerCrash.integration.test.ts`

**Result before the leaderboard fix** (`scanner-crash-before-outbox.txt`): 40
trials; 37 killed mid-run after a partial commit, 2 before any commit, 1
finished first. **Session invariants: 0 violations** — the per-user transaction
already made sessions crash-safe. **Leaderboard: 35 of 40 trials drifted, 91,841
seconds missing in total, 0 extra.** The process died after a user's commit and
before its `ZINCRBY`; the recovery pass does not see that user again, and the
cold-key rebuild never runs on a warm key.

**Fix (transactional outbox).** Sessions are inserted with
`leaderboard_pending = true` inside the finalize transaction (migration
`0012_leaderboard_outbox`: one boolean column plus a partial index). At the end
of every cycle `syncPendingLeaderboard()` reads pending sessions (batches of
500), computes each affected user's absolute total per period key from
`sessions`, writes it with a Lua script that `ZADD`s only if the key exists, and
then clears the flag. Writes are absolute, so retries are idempotent.

**Result after** (`scanner-crash-after.txt`): 40 trials; 0 invariant violations;
**0 trials with leaderboard drift**. The kills landed as: 14 mid-run after a
partial commit, 9 after every session had committed but before the process
finished (the exact window the outbox covers), 2 before any commit, 15 after
completion.

**Files:** `apps/api/src/aggregate/leaderboard.ts`, `run.ts`,
`packages/db/src/schema.ts`,
`packages/db/src/migrations/0012_leaderboard_outbox.sql`, `meta/_journal.json`;
new `scannerCrash.integration.test.ts`, `helpers/aggregationWorker.ts`; ADR-016.

**What did not work.**

- `drizzle-kit generate` produced a migration that re-created tables from
  migrations 0007–0011, because those were hand-written without snapshots. The
  generated files were discarded and `0012` was hand-written like its
  predecessors.
- 15 of 40 "after" trials finished before the kill (the new code is faster than
  the calibration run), so only 25 exercised a crash. A 100-trial rerun was
  started and **aborted**: Docker Desktop's port proxy degraded during it and
  Redis connections began taking 20–50s to open. That run produced no result.

**Caveats.** Two narrow races remain and are documented in ADR-016: a sync
racing a cold-key rebuild can miss one session until the user's next sync, and a
sync racing account deletion can re-add a deleted user briefly.

## Item 3: Privacy verification

**Extension property test** (`apps/extension/test/privacy.property.test.ts`).
The real `Tracker` and real `IngestClient` run against a mocked `vscode` host,
and `fetch` is stubbed so the test captures the exact HTTP request bodies.
fast-check generates random edit sequences: single characters, arbitrary Unicode
graphemes, NUL and control characters, pastes up to 40 graphemes, deletions,
replacements, multi-line edits, and non-`file` URI schemes. A random 23-char
canary secret (`SECRET_` + 16 chars outside the hex alphabet) is embedded in
documents both as a paste and as individual keystrokes. For every body: no
canary substring, strict `heartbeatBatchSchema` parse, only allowlisted fields,
`lang`/`file`/`project` equal to document metadata, every `key_freq` key is a
physical key label, Σ`key_freq` = `keystrokes`, and `summary` mode sends no
`file`/`project`/`key_freq` while `off` mode sends nothing.

`PRIVACY_RUNS=3000 npx vitest run apps/extension/test/privacy.property.test.ts`
→ **9,000 property runs (3,000 per mode), 361,455 synthetic edit events, 5,412
request bodies, 12,474 heartbeats, 2,052,263 bytes inspected, 0 leaks.**

**Mutation check** (`privacy-mutation-check.txt`). Four leaks were injected one
at a time into the source, the test was run, and the file was restored
(`git diff apps/extension/src` empty afterwards):

| Mutant | Injected leak                                       | Caught? | Runs to failure |
| ------ | --------------------------------------------------- | ------- | --------------- |
| M1     | Unknown characters sent as their own `key_freq` key | Yes     | 3               |
| M2     | First 24 chars of the document appended to `lang`   | Yes     | 2               |
| M3     | Pasted text sent as a `key_freq` key                | Yes     | 1               |
| M4     | `summary` mode sends `file`/`key_freq` like `full`  | Yes     | 2               |

**API side.** `packages/shared/test/heartbeat.privacy.test.ts` checks that the
shared contract rejects any field outside the allowlist (2,000 random field
names and values) and any `key_freq` key that is not a key label (2,000 random
strings). `integration.test.ts` adds route tests: a heartbeat carrying
`content`, `text`, `snippet` or `contentChanges` gets `400 VALIDATION_ERROR` and
stores no rows, and so does `key_freq: { hunter2: 1 }`.

**Caveats (important for an interview).**

- This proves what leaves the extension and what the API accepts. It does not
  prove the extension never reads content: it does, in memory, to classify the
  key.
- `key_freq` is a per-file, per-flush (60s) histogram of case-folded characters.
  Typing `hunter2` as the only input in a file within one minute sends
  `{h:1,u:1,n:1,t:1,e:1,r:1,2:1}`. Order is lost but the multiset is not. This
  is the documented design, not a leak, but "key labels only" can sound stronger
  than it is.
- The `vscode` host is mocked, so real VS Code event delivery is not exercised.
- The new route tests could not be run to completion locally (see "Could not
  verify").

## Item 4: Privacy cache correctness

**Bug found.** Classic cache-aside race in `lib/privacyCache.ts`. Ingest misses
the cache, reads `privacy = 'full'` from Postgres, and stalls. The user switches
to `off`; `PATCH /v1/me` updates the row and `DEL`s the key. The stalled ingest
then `SET`s `'full'` with a 60s TTL, and every ingest for the next 60s stores
data the user opted out of. The same race after `DELETE /v1/me` re-caches a
deleted account.

**Fix.** Readers fill with `SET ... EX 60 NX`. The writer overwrites the key
with the new mode, or with a `__deleted__` tombstone, instead of deleting it, so
a late reader's `NX` fill loses.

**Test** (`apps/api/test/lib/privacyCache.test.ts`). Deterministic interleaving
with in-memory Redis and DB fakes and a controllable clock: the reader is held
between its DB read and its cache write while the writer runs.
`npx vitest run apps/api/test/lib/privacyCache.test.ts`:

| Scenario                             | Stale window before | After |
| ------------------------------------ | ------------------- | ----- |
| Privacy change during in-flight read | 60,000ms            | 0ms   |
| Account deletion during in-flight    | 60,000ms            | 0ms   |

Simple invalidation (no in-flight reader) was already correct; those three tests
passed before the change too.

**Caveats.** Proven with fakes, not measured against real Redis; this
establishes that the race exists and is closed, not how often it happens. Two
concurrent privacy changes by the same user can still land out of order in Redis
(bounded by the TTL). If the writer's Redis `SET` fails, staleness is bounded by
the TTL, as before. **Cache hit rate: not measurable.** No hit/miss counter
exists, and a synthetic hit rate would be meaningless. Adding a counter to the
`ingest_db` log line would make it measurable from Loki.

## Item 5: Readiness probe

**Change.** `GET /health` and `GET /health/live` stay dependency-free.
`GET /health/ready` runs `SELECT 1` and `PING` with a 2s timeout each and
returns `503` if either fails. Concurrent requests share one in-flight probe,
and the result is cached in-process for 30s (ready) or 5s (not ready). Probe
frequency therefore cannot become Neon or Upstash load: at most about 2 DB and 2
Redis probes per minute per instance, which is ~86k Redis commands a month (17%
of the 500K Upstash free tier) if something polls continuously. The deploy
script now gates on `/health/ready`.

**Files:** new `apps/api/src/lib/readiness.ts`, `apps/api/src/routes/health.ts`;
`apps/api/src/app.ts`, `infra/deploy-api.sh`, `infra/terraform/cloudwatch.tf`,
`infra/terraform/variables.tf`; tests `test/lib/readiness.test.ts`,
`test/routes/health.test.ts`.

**Tests.** The route test points `DATABASE_URL` at a local TCP server that
accepts and immediately destroys connections, so Postgres is really unreachable:
`/health` → 200, `/health/live` → 200, `/health/ready` → 503 with `db: "down"`.
Unit tests: a rejected DB probe and a hung DB probe (timeout) both report
`down`; **100 concurrent checks issue exactly 1 DB probe and 1 Redis probe**;
the cache expires at the TTL boundary; a down result is re-probed after 5s. A
CORS test confirms an unknown origin is not reflected (relevant to
GHSA-88fw-hqm2-52qc in the installed `hono@4.12.23`, which only applies when
`origin` is unset).

**Terraform (prepared, not applied).** A second Route 53 health check on
`/health/ready` (3 checker regions, 30s interval) and a CloudWatch alarm
`commma-api-ready-down` to the existing SNS topic. `terraform fmt -check` and
`terraform validate` pass (`terraform-validate.txt`). To apply, from
`infra/terraform/`:

```bash
terraform plan -target=aws_route53_health_check.api_ready -target=aws_cloudwatch_metric_alarm.api_ready
terraform apply -target=aws_route53_health_check.api_ready -target=aws_cloudwatch_metric_alarm.api_ready
```

**Order matters:** deploy the API first. Applying the Terraform before
`/health/ready` exists in production makes the alarm fire on 404.

**Caveats.** The availability metric does not change until this is applied, and
it then measures dependency reachability from the API box, not user-facing
success rate. A Route 53 HTTPS health check is a paid AWS feature; check current
pricing before applying.

## Item 6: Deploy API failure on 2026-07-28

**Diagnosis.** Run `30322408336` failed in `pnpm --filter @commma/db migrate`
with only `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL ... Exit status 1`
(`deploy-api-30322408336-failed.log`). The log contains **no cause**. The cause
recorded in `SESSION.md` (Neon over its compute-time quota) came from outside
the log. `infra/deploy-api.sh` is `set -euo pipefail`, so build and
`pm2 restart` never ran, and the four fixes from PR #3 stayed undeployed.

**Already fixed before this round.** GitHub refuses to re-run a run older than a
month, so the workflow was dispatched instead: run `34265952691` on 2026-09-08
succeeded in 49s (`deploy-api-runs.txt`). No re-run is needed now.

**Reproduced locally:** `drizzle-kit migrate` against a wrong password exits 1
and prints nothing about why (`deploy-migrate-preflight.txt`).

**Fix.** `pnpm --filter @commma/db migrate` now runs
`packages/db/scripts/preflight.mjs` first, which prints the Postgres error code
and message. Locally it now reports
`db preflight: FAILED code=28P01 message=password authentication failed for user "postgres"`
for a bad password and
`code=ECONNREFUSED message=connect ECONNREFUSED ::1:1; connect ECONNREFUSED 127.0.0.1:1`
for a closed port. If a deploy fails again, re-dispatch with:

```bash
gh workflow run deploy-api.yml --ref main
```

**Caveat.** Neon's quota error was not reproduced. That the preflight would
print it is an inference from Neon surfacing it as an ordinary connection error;
the quota message used in `readiness.test.ts` is a typed-in fixture, not
captured output.

## Item 7: Extension overhead

**Harness** (`apps/extension/bench/overhead.cjs`, run with
`pnpm --filter commma bench`). It loads the **minified production bundle** with
a stubbed `vscode` module, activates it signed in (stubbed refresh), and calls
the real `onDidChangeTextDocument` listener 200,000 times after 20,000 warm-up
calls, timing each with `process.hrtime.bigint()`. The bundle is 73,422 bytes,
byte-for-byte the size of `extension/dist/extension.js` inside the published
`commma-1.0.0.vsix` (37,877-byte VSIX, 19,044 bytes gzipped).

**Results** (`extension-overhead.txt`, 5 runs with 50 files plus one each with 1
and 5,000 files, idle machine):

| Metric                                | Range across 7 runs |
| ------------------------------------- | ------------------- |
| Per-keystroke p50                     | 0.5–0.7µs           |
| Per-keystroke p99                     | 1.9–3.4µs           |
| Per-keystroke p99.9                   | 6.6–10µs            |
| Amortized over 1M calls               | 0.52–0.86µs         |
| Heap growth over 200k calls (post-GC) | ≤ 0 KB              |
| Bundle `require()`                    | 23–37ms             |
| `activate()` with stubbed host        | 39–49ms             |

One extra run under load (the full test suite running concurrently) measured p50
1.1µs and p99 4.1µs.

**Caveats.** Timings include `hrtime` overhead and exclude VS Code's own event
dispatch to the extension host. Activation is measured against a stub, not a
real VS Code window, so it is not "activation time" in the VS Code sense. Heap
growth is ~0 because accumulators are per file and cleared each flush, so memory
scales with files edited per minute, not keystrokes; per-file accumulator size
was not measured. Windows laptop, Node 24; the VS Code extension host runs a
different Node build.

## Item 8: CI runs the DB-gated suites

`ci.yml` now starts `postgres:17` and `redis:7` service containers, applies
migrations to `commma_test` (through the new preflight), and sets
`TEST_DATABASE_URL`/`TEST_REDIS_URL`, so the 22 tests that skip without a DB (20
route-integration tests and the 2 scanner suites) run in CI. **Not yet verified
on GitHub Actions** because nothing was pushed. The first PR run is the
verification.

## Full-suite results on the branch

- No DB (the configuration CI used before this branch), 20 consecutive runs:
  **20 of 20 passed, 179 passed / 22 skipped each** (`suite-no-db-20-runs.txt`).
- `pnpm typecheck` (6 packages) and `pnpm lint` pass.
- With DB + Redis, the full parallel suite could not be completed locally. See
  below.

## What did not work

- **Local Docker networking degraded mid-session.** After about 30 minutes, new
  TCP connections to the Redis container took 20–50s or timed out, while
  established connections stayed sub-millisecond. A full DB+Redis suite run then
  timed out in the scanner suite (600s), which had passed standalone earlier
  with the same code, and every Redis-backed route test hit the 90s timeout; it
  was stopped after about 25 minutes (`suite-with-db-aborted.txt`, 8 timeouts,
  no assertion failures). Installing a native Redis in WSL hung in `apt-get`
  (state `D`, 34+ minutes). Docker Desktop was not restarted because an
  unrelated `kiln-dev` kind cluster was running in it.
- **`CLAUDE.md` is gitignored**, so its refreshed facts (13 migrations, the
  outbox, the DB-gated test suites) exist only in the local copy.
- **Feed query rewrite (inconclusive, not shipped).** Q6 in
  `explain-analyze.txt` (following feed) is a parallel seq scan over all 400k
  synthetic sessions. A `LATERAL` top-21-per-followee rewrite returned identical
  pages but timed 43–79ms vs 71–142ms over 3 runs (`explain-feed-rewrite.txt`),
  because the index lacks `id` for the tie-break and still reads every
  followee's sessions. A `(user_id, started_at DESC, id DESC)` index would
  likely fix it; not tested.
- **`drizzle-kit generate`** is unusable until the snapshots are rebuilt (item
  2).

## Other audit findings (not fixed)

- **Dependencies** (`dependency-audit.txt`): `pnpm audit --prod` reports 29
  advisories (1 low, 21 moderate, 7 high). Highs: `hono` CORS (not applicable,
  tested), `sharp` libvips/libheif CVEs (patched ≥0.35.0; the card renderer only
  rasterizes server-built SVG), `zod` large-array memory (batches are capped at
  500 events and 1MB bodies), `react-router` (web, patched ≥7.18.0). Bumps were
  left for a separate change because each needs its own regression pass.
- **EXPLAIN** (`explain-analyze.txt`, 2,000 users / 400k sessions / 100k events,
  synthetic, rolled back): per-user event reads, session list pages and the
  outbox pending scan all use indexes (0.2–0.4ms). The aggregator's
  `SELECT DISTINCT user_id FROM events` is a seq scan (27ms at 100k rows),
  acceptable while the table is drained each cycle. The outbox's weekly-total
  query took 93ms because the synthetic data puts ~84% of sessions inside one
  week; real distributions will differ.
- **Account deletion** only removes the user from the current week/month
  leaderboard keys; earlier period keys keep the id until their TTL (≤40 days).

## Resume-ready claims

Ranked strongest first.

1. **Found and fixed a double-write race in the session aggregator: 2 concurrent
   scanners produced 2,390 sessions for 1,220 expected (1,170 duplicates) across
   50 synthetic trials; a per-user Postgres advisory lock brought it to 0 at 2
   and 4 concurrent scanners.** Command:
   `SCANNER_TRIALS=50 SCANNER_CONCURRENCY={2,4} npx vitest run apps/api/test/aggregate/scanner.integration.test.ts`.
   Honesty: synthetic data on local Postgres 18; a latent bug that production's
   Redis leader lock usually prevented, not an observed incident.
2. **Closed a crash window in the leaderboard with a transactional outbox:
   SIGKILL at random points over 40 trials went from 35 trials drifting (91,841
   seconds lost) to 0, with sessions exactly-once in all 80 trials.** Command:
   `CRASH_TRIALS=40 npx vitest run apps/api/test/aggregate/scannerCrash.integration.test.ts`.
   Honesty: only 25 of the 40 "after" trials actually killed the process before
   it finished; Windows `TerminateProcess`, local infra.
3. **Verified the no-keylogging guarantee with property-based tests: 9,000
   randomized runs over 361,455 synthetic editor events and 12,474 outbound
   heartbeats with 0 content leaks, and all 4 deliberately injected leaks were
   caught within 3 runs.** Command:
   `PRIVACY_RUNS=3000 npx vitest run apps/extension/test/privacy.property.test.ts`.
   Honesty: proves the outbound payload, not that content is never read in
   memory (it is), and the payload still carries a per-file character histogram.
4. **Closed a cache-aside race that could keep a user's old privacy mode live
   for 60s after they opted out; stale window 60,000ms → 0ms under the
   interleaving.** Command:
   `npx vitest run apps/api/test/lib/privacyCache.test.ts`. Honesty:
   deterministic proof with in-memory fakes, not a measurement of real Redis or
   of how often it happened.
5. **Split liveness from readiness so a database outage is no longer reported as
   100% availability: with Postgres unreachable, `/health` stays 200 while
   `/health/ready` returns 503, and 100 concurrent probes cost 1 DB and 1 Redis
   call.** Command:
   `npx vitest run apps/api/test/lib/readiness.test.ts apps/api/test/routes/health.test.ts`.
   Honesty: the production alarm is prepared in Terraform but not applied, so
   the live availability metric is unchanged until it is.
6. **Measured the VS Code extension's keystroke handler at p50 0.6µs / p99
   ≤3.4µs on the shipped 73KB bundle (200k keystrokes per run, 7 runs).**
   Command: `pnpm --filter commma bench`. Honesty: stubbed VS Code host on a
   Windows laptop; excludes VS Code's own event dispatch; ~2× slower under load.

## Could not verify

- The DB+Redis full parallel suite on this branch, including the 5 new
  content-field route tests in `integration.test.ts` (local Docker networking
  failed; see above). The scanner suites, privacy cache, readiness and CORS
  tests were each run and passed individually.
- The CI workflow change on GitHub Actions (nothing pushed).
- The Terraform readiness alarm in AWS (not applied, by instruction).
- Advisory-lock and outbox behaviour on Neon's Postgres version.
- Whether the duplicate-session race ever fired in production (query given in
  item 1).
- The prior audit's "98.4% CI over 61 runs" figure.
- Cache hit rate, and real VS Code activation time.

## Commands for you to run

```bash
gh workflow run deploy-api.yml --ref main
cd infra/terraform && terraform plan -target=aws_route53_health_check.api_ready -target=aws_cloudwatch_metric_alarm.api_ready
```

Only after this branch is merged and deployed (the deploy applies migration
`0012`), and only then apply the Terraform. The first command is needed only if
a push-triggered deploy fails.
