# Developer Onboarding

Version 1.0 · May 2026

---

## What Is commma?

commma is a developer activity tracking platform with three parts:

| Part                 | What it does                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **VSCode Extension** | Runs silently in your editor. Captures keystroke counts, active file, language, and key-frequency data. Ships heartbeat batches to the API every 60 seconds. |
| **API**              | Hono/Node server. Receives heartbeat batches, aggregates them into sessions, serves REST endpoints for the web app.                                          |
| **Web App**          | React app. Shows session detail, keyboard heatmaps, streaks, leaderboards, and public profiles.                                                              |

The unique feature is the **keyboard heatmap** — a per-session visualization of
which physical keys you pressed most, exported as a transparent PNG for sharing.

Stack: TypeScript everywhere, PostgreSQL, Redis, Hono, React 19, Tailwind v4,
Drizzle ORM. Session aggregation runs as an in-process interval (ADR-010), not a
job queue.

---

## Repository Map

```text
commma/
├── apps/
│   ├── api/              Hono REST API
│   │   └── src/
│   │       ├── index.ts          server entry point + interval scheduler start
│   │       ├── routes/           one file per route group
│   │       ├── aggregate/        in-process session aggregation + streak jobs
│   │       ├── maintenance/      in-process refresh-token cleanup job
│   │       ├── middleware/       auth, rate limiting
│   │       ├── db.ts redis.ts logger.ts   shared clients + structured logger
│   │       └── lib/              jwt, refresh, cookies, errors, github, heatmapCard
│   │
│   ├── extension/        VSCode extension
│   │   └── src/
│   │       ├── extension.ts      activate / deactivate
│   │       ├── tracker.ts        activity tracking + heartbeat flush
│   │       ├── auth.ts           GitHub OAuth + SecretStorage
│   │       ├── client.ts         HTTP client + offline queue
│   │       ├── keyCounter.ts     key-label frequency accumulator
│   │       └── statusBar.ts      status bar indicator
│   │
│   └── web/              React web app
│       └── src/
│           ├── App.tsx
│           ├── components/
│           │   └── KeyboardHeatmap/  Canvas heatmap renderer
│           ├── pages/
│           └── index.css         design tokens (@theme)
│
├── packages/
│   ├── shared/           Zod schemas, types, keyboard layout configs
│   │   └── src/
│   │       ├── heartbeat.ts      ingest/heartbeat Zod contract
│   │       ├── keyLabels.ts      key-label set + schema
│   │       └── keyboardLayout.ts QWERTY layout config
│   │
│   └── db/               Drizzle ORM schema + migrations
│       └── src/
│           ├── schema.ts
│           └── migrations/
│
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

---

## First-Time Setup

### 1. Install dependencies

```bash
# requires Node ≥ 20.19, pnpm ≥ 10
pnpm install
```

### 2. Start local infrastructure

```bash
docker compose up -d
# PostgreSQL → localhost:5432
# Redis      → localhost:6379
```

### 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```text
DATABASE_URL=postgresql://commma:commma@localhost:5432/commma
REDIS_URL=redis://localhost:6379
GITHUB_CLIENT_ID=<from github.com/settings/developers>
GITHUB_CLIENT_SECRET=<from github.com/settings/developers>
GITHUB_CALLBACK_URL=http://localhost:3000/v1/auth/github/callback
JWT_SECRET=any-random-32-char-string-for-local-dev
REFRESH_TOKEN_SECRET=another-random-32-char-string
WEB_ORIGIN=http://localhost:5173
```

To create a GitHub OAuth App: go to `github.com/settings/developers` → New OAuth
App → set callback URL to `http://localhost:3000/v1/auth/github/callback`.

### 4. Run migrations

```bash
pnpm --filter @commma/db migrate
```

### 5. Start everything

```bash
pnpm dev
# api    → localhost:3000
# web    → localhost:5173
# extension TypeScript watcher starts
```

### 6. Verify

- `http://localhost:5173` — landing page
- `http://localhost:3000` — API health check
- In VSCode: press `F5` in the `apps/extension` folder to launch Extension
  Development Host

---

## Core Concepts

### HeartbeatEvent

The atomic unit of data the extension sends:

```typescript
{
  id: string           // UUID — used for deduplication
  ts: number           // Unix milliseconds
  lang: string         // e.g. "TypeScript"
  file?: string        // omitted when privacy = summary
  project?: string
  keystrokes: number
  lines: number
  key_freq?: Record<string, number>  // key label → count; omitted when privacy = summary
}
```

### Session

A continuous stretch of coding activity. Gap of ≥15 minutes with no events =
session end, new session begins.

Key fields: `started_at`, `ended_at`, `duration_s`, `lines_delta`, `pace_cpm`,
`peak_cpm`, `keyboard_heatmap`

### Keyboard Heatmap

Stored as JSONB on the sessions table:

```typescript
{
  counts: Record<string, number>; // raw count per key label
  freq: Record<string, number>; // relative frequency 0.0–1.0
  total: number; // total keystrokes in session
}
```

Rendered in the browser via Canvas API. Each key is a rounded rect colored on a
5-stop cold→hot gradient. Background is transparent. Output is PNG.

### Ingest → Aggregation Flow

```text
Extension (every 60s)
  → POST /v1/ingest { events: HeartbeatEvent[] }
  → API validates, writes to events table, returns 202 Accepted
  → In-process interval (every 5 min): boundary detection → session insert →
    streak update → Redis leaderboard ZINCRBY → delete finalized events
```

### Privacy Modes

| Mode      | What is sent                                              |
| --------- | --------------------------------------------------------- |
| `full`    | All fields including file paths and `key_freq`            |
| `summary` | Duration, keystrokes, lines only — no file, no `key_freq` |
| `off`     | Nothing — extension is silent                             |

---

## Key Files to Read First

| Area               | Files                                                            |
| ------------------ | ---------------------------------------------------------------- |
| Extension tracking | `apps/extension/src/tracker.ts`, `keyCounter.ts`                 |
| Ingest pipeline    | `apps/api/src/routes/ingest.ts`, `apps/api/src/aggregate/run.ts` |
| Session data       | `packages/db/src/schema.ts`                                      |
| Heatmap rendering  | `apps/web/src/components/KeyboardHeatmap.tsx`                    |
| Auth               | `apps/api/src/middleware/auth.ts`, `apps/extension/src/auth.ts`  |
| Shared schemas     | `packages/shared/src/heartbeat.ts`                               |

---

## Running Tests

```bash
pnpm test                          # all packages
pnpm test --filter @commma/api     # API only
pnpm test --filter @commma/shared  # shared schema tests only
```

Tests use Vitest and run from the repo root. Pure-logic unit tests (aggregator,
key counter, shared schema, extension offline queue) always run. The API
route/integration suite under `apps/api/test/routes/` runs against a real
Postgres + Redis only when `TEST_DATABASE_URL` is set (point it at a throwaway
database, never production) and skips cleanly otherwise:

```bash
TEST_DATABASE_URL=postgresql://commma:commma@localhost:5432/commma pnpm test
```

---

## Type Checking & Linting

```bash
pnpm typecheck   # tsc --noEmit across all packages — must be zero errors
pnpm lint        # ESLint across all packages
```

Run both before every push. CI will fail if either has errors.

---

## Common Tasks

### Add a new API endpoint

1. Create or extend a file in `apps/api/src/routes/`
2. Add Zod validation for request body/params (use the `apiError` helper for
   error responses so the structured error shape stays consistent)
3. Register the route in `apps/api/src/app.ts`
4. Add a route test in `apps/api/test/routes/` (see `integration.test.ts`)
5. Add the endpoint to `SYSTEM_DESIGN.md` route table

### Add a new shared schema

1. Add the Zod schema to `packages/shared/src/schemas/`
2. Export from `packages/shared/src/index.ts`
3. Use `z.infer<typeof YourSchema>` for the TypeScript type

### Add a database column

1. Edit `packages/db/src/schema.ts`
2. Run `pnpm --filter @commma/db generate` to generate the migration
3. Run `pnpm --filter @commma/db migrate` to apply it
4. Update relevant Zod schemas in `@commma/shared` if the column is API-facing

### Add a keyboard layout

1. Create a new file in `packages/shared/src/layouts/`
2. Follow the `KeyboardLayout` type (see `qwerty.ts` for reference)
3. Export from `packages/shared/src/index.ts`
4. It will appear automatically in the heatmap renderer's layout selector

---

## Debugging

### API not starting

- `docker compose ps` — PostgreSQL and Redis must be running
- Check `apps/api/.env` exists with all required variables
- Run `pnpm --filter @commma/db migrate` if you see migration errors

### Extension not sending heartbeats

- Status bar should show "commma: connected"
- Open VSCode Output panel → select "commma" channel for debug logs
- Check that `commma.privacy` is not set to `off`

### Heatmap not rendering

- Open browser DevTools → Console for Canvas errors
- Verify the session has a non-null `keyboard_heatmap` in the API response
- Check the keyboard layout config is valid JSON
