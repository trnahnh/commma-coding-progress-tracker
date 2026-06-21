# What commma is

commma is a developer-activity tracker styled as a sport. It turns the work you
already do in your editor into sessions, pace, splits, streaks, leaderboards,
and a shareable **keyboard heatmap** — a per-session map of which physical keys
you pressed, exported as a transparent PNG.

You install the editor extension — or run the headless CLI — once, code as
usual, and read the week back like an athlete reviewing the tape.

## The three tiers

commma is three pieces talking HTTPS and JSON:

- **Extension & CLI** — the data sources. The VS Code extension captures
  keystroke counts, the active file, the language, and a key-label frequency
  map; the headless CLI tracks any editor that writes files, deriving counts
  from filesystem changes (no key map). Both buffer in memory and flush a batch
  of heartbeat events to the API every 60 seconds.
- **API** — a Hono server on Node. It handles auth, ingest, asynchronous session
  aggregation, and every read query.
- **Web** — the React app you are reading now. Session detail, leaderboards,
  profiles, the Canvas keyboard heatmap, and PNG export.

## How a session is built

A **session** is one continuous stretch of coding. A gap of fifteen minutes or
more starts a new session. The API does not aggregate on the request path —
ingest returns `202 Accepted` and the work happens later, on an interval:

1. Heartbeat events land in an `events` table, idempotent on event id.
2. An interval aggregator detects session boundaries, sums duration, keystrokes,
   and lines, and merges the per-event key-frequency maps into a single keyboard
   heatmap.
3. It updates your streak, bumps the leaderboard, and deletes the finalized
   events so the hot table stays small.

## The privacy guarantee

commma tracks **key labels** — which physical key was pressed — and never key
**content**, meaning what was actually typed. The editor's text-change content
is never read, stored, or transmitted. This is a permanent guarantee, not a
setting.

Three privacy modes control how much leaves your machine:

- **full** — all fields, including file paths and the key-label map.
- **summary** — session totals only; no file paths, no key-label map.
- **off** — nothing is sent.

## Where to go next

- **[Getting started](/docs/getting-started)** — install the extension, sign in,
  and pick a privacy mode.
- **[Architecture](/docs/architecture)** — the decisions behind the stack.
- **[System design](/docs/system-design)** — data flow, the data model, and the
  security boundary.
- **[API reference](/api)** — every endpoint, with rate limits.
