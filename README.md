# commma

> Every commit is a step.

commma turns your editor into a logbook — pace, splits, streaks, podiums — all
the rituals of a real sport, for the work you already do. A VSCode extension
captures your editor activity; an API ingests and aggregates it; a web app
surfaces sessions, streaks, leaderboards, and shareable keyboard heatmap cards.

commma is open-source under MIT. All product concepts and social mechanics are
original to this project.

---

## What It Does

- **Session tracking** — every continuous stretch of coding is a session with
  duration, pace (chars/min), lines moved, and language breakdown
- **Keyboard heatmap** — per-session visualization of which physical keys you
  pressed most, exported as a transparent PNG for sharing (9:16 story, 1:1
  square, 16:9 banner)
- **Streaks** — daily coding streak tracked automatically
- **Leaderboards** — weekly, monthly, and all-time boards filterable by language
- **Public profiles** — shareable profile at `commma.dev/@handle` with style
  badges (Vim athlete, Mouse-free, etc.)
- **Activity feed** — see sessions from engineers you follow

---

## Tech Stack

| Layer               | Technology                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| Extension           | TypeScript, VSCode API                                                                               |
| API                 | Hono, Node.js, `@hono/node-server`                                                                   |
| Web App             | React 19, Vite 8, Tailwind v4                                                                        |
| Database            | PostgreSQL (Drizzle ORM)                                                                             |
| Cache / Leaderboard | Redis (rate limits + leaderboard sorted sets)                                                        |
| Shared              | Zod schemas, TypeScript types                                                                        |
| Heatmap (client)    | Canvas API → transparent PNG                                                                         |
| Heatmap (server OG) | sharp                                                                                                |
| Auth                | GitHub OAuth, JWT + HTTP-only refresh token                                                          |
| Billing             | Stripe (Pro/Team subscriptions, signature-verified webhooks)                                         |
| Monorepo            | pnpm workspaces                                                                                      |
| Deployment (MVP)    | AWS-hosted compute — EC2 t3.micro + PM2 (API), S3 + CloudFront (web); Neon PostgreSQL, Upstash Redis |

---

## Monorepo Structure

```text
commma/
├── apps/
│   ├── api/          Hono REST API
│   ├── extension/    VSCode extension
│   └── web/          React web app
├── packages/
│   ├── shared/       Zod schemas, types, keyboard layout configs
│   └── db/           Drizzle ORM schema and migrations
```

---

## Documentation

| Document                                                                               | Description                                                              |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)                                                 | Architecture, data flows, DB schema, API route map, caching, scalability |
| [ONBOARDING.md](./ONBOARDING.md)                                                       | First-time setup, repo map, core concepts, common tasks                  |
| [CONTRIBUTING.md](./CONTRIBUTING.md)                                                   | Branch naming, commit conventions, PR process, code style                |
| [SECURITY.md](./SECURITY.md)                                                           | How to report a vulnerability, scope, the privacy invariant              |
| [API_REFERENCE.md](./API_REFERENCE.md)                                                 | Every endpoint with request/response shapes, errors, rate limits         |
| [ROADMAP.md](./ROADMAP.md)                                                             | Phase-by-phase plan with definitions of done and icebox                  |
| [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)                               | ADRs for every major technical decision                                  |
| [PRD](https://docs.google.com/document/d/19pBlTpdtUVbAoK5RfuHPBKJdUgh7GsETuur-nVifaro) | Full Product Requirements Document                                       |

---

## Privacy

commma tracks **key labels** (which physical key was pressed), never key content
(what was typed). File paths are optional. Three privacy modes: `full`,
`summary`, `off`. The extension code is open-source and auditable. To report a
privacy or security issue, see [SECURITY.md](./SECURITY.md).

---

## Status

Active development. The full pipeline is real and verified end-to-end:

- **Phase 1 — Foundation (done):** extension → ingest → in-process aggregation →
  query loop over Postgres + Redis. GitHub OAuth, JWT access + rotating refresh
  tokens, rate limiting, and the VSCode extension (key-label tracking, privacy
  modes, offline queue).
- **Phase 2 — Web (done):** session-detail page, Canvas keyboard heatmap + PNG
  export, leaderboard and profile endpoints, landing page wired to the API.
- **Phase 3 — Hardening (in progress):** Vitest suite (unit + gated route
  integration tests), server-side privacy enforcement, refresh-token cleanup,
  configurable proxy-trust for rate limiting, and the heatmap-card image API.

See [ROADMAP.md](./ROADMAP.md) for the detailed phase plan and what remains.

---

## License

MIT
