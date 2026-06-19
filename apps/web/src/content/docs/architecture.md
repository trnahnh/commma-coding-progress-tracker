# Architecture decisions

The shape of commma is the sum of a handful of deliberate choices. These are the
ones worth knowing if you want to understand why the system looks the way it
does.

## Monorepo

Everything lives in one pnpm workspace: the extension, the API, the web app, the
database package, and a shared contract package. The extension and the API have
to agree on an exact event shape, and the web app and the API share keyboard
layouts; a monorepo lets a single shared package be the one source of truth for
both, with no version drift.

## Hono on the API

The API is a Hono server running on Node. Hono is small, fast, and typed end to
end, and it runs the same on a plain Node process as it would on an edge runtime
— which keeps the deployment story simple and the cold paths cheap.

## Drizzle, migrations first

The database layer is Drizzle. The schema is TypeScript, the migrations are
generated from it, and migrations are **append-only** — an applied migration is
never edited, only followed by a new one. That keeps every environment
reproducible from the same ordered list of steps.

## The heatmap is JSONB

A session's keyboard heatmap is stored as a single JSONB column shaped like
`{ counts, freq, total }`, not a row per key. A heatmap is always read and
written as a whole, never queried key by key, so one document is both cheaper
and simpler than a join.

## Canvas for rendering

The web heatmap is drawn on a Canvas, not as hundreds of DOM nodes. That keeps
the render smooth and makes exporting a transparent PNG a direct read of the
canvas, with no extra rasterization step.

## Key labels, never content

commma records the **label** of each key pressed and never the **content** of
what was typed. The editor's text-change content is never read. This is a
permanent invariant of the product, not a configurable setting — see the
[overview](/docs/overview) for the privacy modes built on top of it.

## A Redis leaderboard

Leaderboards are Redis sorted sets, incremented as sessions finalize. Ranking
millions of times in a sorted set is trivial; doing it as a SQL `ORDER BY` on
every page load is not. The leaderboard can always be rebuilt from the
`sessions` table if the cache is ever lost, so the cache is an optimization, not
a system of record.

## Interval aggregation, not a job queue

Session aggregation runs on an in-process interval rather than a dedicated job
queue. An earlier design used a queue, but for the volume commma runs at — and
to stay inside a managed Redis free tier — a simple, idempotent interval that
re-runs safely over the same window is cheaper and has fewer moving parts. Only
one instance runs the schedulers, guarded by a leader lock.
