# Observability

How commma watches its **application** layer — request latency, error rate, and
aggregation lag — as opposed to the host layer (CPU, disk, uptime) covered by
CloudWatch in `infra/terraform/cloudwatch.tf`. The two layers are deliberately
split; see `docs/METRICS.md` for why.

This is the **Level 1** implementation: ship the structured logs the API already
emits to a hosted backend (Grafana Cloud Loki) and derive the SLOs with LogQL at
query time. No tracing SDK runs inside the API process. Level 2 (OpenTelemetry
traces for latency decomposition) is a later, additive step recorded at the
bottom.

## Pipeline

```text
apps/api (structured JSON logs)
  -> PM2 log files  (/home/ec2-user/.pm2/logs/commma-api-*.log)
  -> Grafana Alloy  (infra/alloy/config.alloy, tails the files)
  -> Grafana Cloud Loki  (logs + LogQL-derived metrics)
```

The API writes one JSON object per line (`apps/api/src/logger.ts`). Alloy tails
the PM2 log files, attaches a small set of **low-cardinality** labels
(`service`, `stream`, `level`, `job`, `host`), and forwards to Loki. Status
code, latency, and path stay inside the log line and are extracted at query time
with `| json` — keeping label cardinality bounded, per the discipline in
`docs/METRICS.md`.

## What is instrumented

| Log `msg`           | Fields                                                                          | Backs                                   |
| ------------------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| `request`           | `method`, `path`, `status`, `ms`                                                | ingest p95, read p95, 5xx rate, success |
| `aggregation_cycle` | `usersScanned`, `usersFinalized`, `sessionsFinalized`, `maxLagMs`, `durationMs` | aggregation lag, scheduler heartbeat    |

`request` is emitted by the middleware in `apps/api/src/app.ts` (one completion
line per request). `aggregation_cycle` is emitted once per 5-minute aggregation
tick by `apps/api/src/aggregate/scheduler.ts`; it is also a liveness heartbeat,
so a missing line means the scheduler is stuck or dead.

## Setup

The Grafana Cloud side needs a free account and three values; the box side is
the existing provisioning script.

1. **Create a Grafana Cloud stack** (free tier) at `grafana.com`.
2. **Get the Loki push credentials** from the stack's Loki "Send Logs" details:
   - `GRAFANA_LOKI_URL` — the push URL, e.g.
     `https://logs-prod-NNN.grafana.net/loki/api/v1/push`
   - `GRAFANA_LOKI_USER` — the numeric Loki instance / user ID
   - `GRAFANA_LOKI_TOKEN` — a Grafana Cloud access-policy token scoped to
     `logs:write`
3. **Wire them on the box.** Export the three variables and re-run the
   idempotent provisioner (it installs Alloy, drops `infra/alloy/config.alloy`
   to `/etc/alloy/config.alloy`, writes the credentials to
   `/etc/sysconfig/alloy`, and starts the service):

   ```bash
   export GRAFANA_LOKI_URL=... GRAFANA_LOKI_USER=... GRAFANA_LOKI_TOKEN=...
   bash infra/provision-ec2.sh
   ```

   Without the three variables the script skips Alloy entirely, so a normal
   provision still works.

4. **Verify** on the box and in Grafana:

   ```bash
   sudo systemctl status alloy
   sudo alloy validate /etc/alloy/config.alloy
   ```

   Then in Grafana Cloud → Explore, run `{service="commma-api"}` and confirm
   lines arrive.

The credentials live only in `/etc/sysconfig/alloy` on the box (read by the
systemd unit as an `EnvironmentFile`) — never in the repo and never in the API's
own env (`apps/api/.env`), since the API does not read them.

## SLO queries (LogQL)

Starting points for the panels that back the `docs/METRICS.md` SLO table. Tune
the window per panel.

```logql
# Ingest p95 (ms) — target < 50ms
quantile_over_time(0.95,
  {service="commma-api"} | json | msg="request" | path="/v1/ingest"
  | unwrap ms [5m])

# Read p95 (ms) — target < 200ms
quantile_over_time(0.95,
  {service="commma-api"} | json | msg="request"
  | path=~"/v1/(me|sessions|leaderboard|users|feed|stats|activity).*"
  | unwrap ms [5m])

# Server error rate (5xx / total) — target < 0.1%
sum(count_over_time({service="commma-api"} | json | msg="request" | status>=500 [5m]))
/
sum(count_over_time({service="commma-api"} | json | msg="request" [5m]))

# Ingest success (202 / total on the ingest path) — target >= 99.9%
sum(count_over_time({service="commma-api"} | json | msg="request" | path="/v1/ingest" | status=202 [5m]))
/
sum(count_over_time({service="commma-api"} | json | msg="request" | path="/v1/ingest" [5m]))

# Aggregation lag (minutes) — target <= ~20 min
max_over_time({service="commma-api"} | json | msg="aggregation_cycle"
  | unwrap maxLagMs [1h]) / 1000 / 60
```

Wire at least two Grafana alert rules: **5xx rate > 0.1%** and **ingest p95 >
50ms**, routed to the same email used for the CloudWatch SNS alarms so all
alerts land in one place.

## Operational notes

- **Alloy runs as root** (a systemd drop-in sets `User=root`) so it can read the
  PM2 log files under `ec2-user`'s `0700` home. The cleaner long-term fix is to
  point PM2 at a world-readable `/var/log/commma/` and run Alloy as the unset
  `alloy` user — deferred to avoid changing the live PM2 process lifecycle in
  the same change.
- **Cost** stays within the Grafana Cloud free tier (logs + 14-day retention) at
  pre-launch volume. `request` is one line per request, so if post-launch volume
  climbs, add a sampling stage in `infra/alloy/config.alloy` (e.g. drop a
  fraction of `2xx` `request` lines) before it bites the free tier — error and
  aggregation lines must never be sampled out.
- **Survives the box dying**: telemetry lives off-box in Grafana Cloud, so a
  host failure (which the CloudWatch auto-recovery alarm then heals) does not
  take the observability with it.

## Level 2 (later, additive)

When traffic justifies decomposing latency (how much of a slow request is Neon
vs Upstash vs heatmap render), add the OpenTelemetry SDK to the API,
auto-instrument Hono/Postgres/Redis, and export OTLP to the same Grafana Cloud
stack (Tempo for traces, Mimir for metrics). It reuses this backend, so Level 1
is not throwaway. Keep the exporter fail-open so a telemetry outage can never
crash or stall the API process.
