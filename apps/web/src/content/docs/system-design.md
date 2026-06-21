# System design

This is the runtime picture: how data moves from your editor to a finished
session, the shape of what is stored, and where the security boundary sits.

## The write path

Writes are intentionally cheap and asynchronous:

1. The extension — or the headless CLI — buffers activity and flushes a batch of
   1–500 heartbeat events to `POST /v1/ingest` every 60 seconds.
2. The API validates the batch against a shared schema, writes the events
   idempotently keyed on event id, and immediately returns `202 Accepted`. No
   aggregation happens on the request.
3. An interval aggregator picks up unfinalized events, groups them per user, and
   finalizes any session whose trailing idle gap has crossed fifteen minutes.

## The aggregation cycle

For each user, in a single transaction, the aggregator:

- splits events into sessions on the 15-minute idle boundary;
- sums duration, keystrokes, and lines for each closed session;
- merges per-event key-frequency maps into the session's keyboard heatmap;
- updates the user's streak;
- increments the Redis leaderboard;
- deletes the finalized events.

Because finalization only ever touches closed sessions and is keyed on event id,
re-running the cycle over the same window produces the same result. One user's
bad data is caught and logged without aborting the cycle for everyone else.

## The data model

The core tables:

- **events** — raw heartbeats, idempotent on id, deleted once finalized.
- **sessions** — one finalized session per row, with the keyboard heatmap stored
  as JSONB shaped `{ counts, freq, total }`.
- **session_langs** / **session_files** — the per-session language and file
  breakdowns.
- **streaks** — the current and longest streak per user.
- **users**, **follows**, **teams**, and the supporting tables for profiles,
  social graph, and team membership.

## The read path

Reads are served from Postgres with keyset pagination, and from Redis for the
things that have to be fast at any scale — leaderboards and hot caches. Every
list endpoint has a hard page-size cap and an indexed predicate; there are no
unbounded scans over the events or sessions tables.

## The security boundary

A few lines are drawn hard:

- **Auth.** Every versioned route is either public by design — and documented as
  such — or behind the auth middleware. Mutations additionally check that the
  caller owns the row they are changing.
- **Validation.** Every body, query string, and route parameter is validated
  before use. Invalid input is a `400`, never a `500` and never a partial write.
- **Secrets.** No secret ever appears in the web, extension, or CLI bundles. The
  server holds them, validated from the environment; the extension holds only
  your own refresh token, in the editor's encrypted secret storage, and the CLI
  keeps it in a `0600` file under your home directory.
- **Rate limits.** Every route sits in a rate-limit bucket. Authenticated routes
  are limited per user; public and auth routes are limited per IP.

For the exact endpoints, request and response shapes, and per-route limits, see
the [API reference](/api).
