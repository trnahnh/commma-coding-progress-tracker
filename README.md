# commma

> Every commit is a step.

**Live:** [commma.dev](https://commma.dev) · API at
[api.commma.dev](https://api.commma.dev) ·
[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=commma.commma)
· [Open VSX](https://open-vsx.org/extension/commma/commma) ·
[LinkedIn](https://www.linkedin.com/company/commma-dev/)

commma turns your editor into a logbook — pace, splits, streaks, podiums — all
the rituals of a real sport, for the work you already do. A VSCode extension
captures your editor activity; an API ingests and aggregates it; a web app
surfaces sessions, streaks, leaderboards, and shareable keyboard heatmap cards.

commma is open-source under MIT. All product concepts and social mechanics are
original to this project.

---

## Install

commma is published to two registries: the
[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=commma.commma)
for VS Code, and the
[Open VSX registry](https://open-vsx.org/extension/commma/commma) for Cursor,
Windsurf, VSCodium, and Gitpod. Search **commma** in your editor's Extensions
panel, run **commma: Sign in** from the Command Palette, and your sessions,
streaks, and heatmaps start filling in — free, no card. See
[commma.dev/install](https://commma.dev/install) for every option. JetBrains,
Neovim, and a standalone CLI client are on the roadmap.

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

| Layer               | Technology                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Extension           | TypeScript, VSCode API                                                                             |
| API                 | Hono, Node.js, `@hono/node-server`                                                                 |
| Web App             | React 19, Vite 8, Tailwind v4, TanStack Query (cached reads)                                       |
| Database            | PostgreSQL (Drizzle ORM)                                                                           |
| Cache / Leaderboard | Redis (rate limits + leaderboard sorted sets)                                                      |
| Shared              | Zod schemas, TypeScript types                                                                      |
| Heatmap (client)    | Canvas API → transparent PNG                                                                       |
| Heatmap (server OG) | sharp                                                                                              |
| Auth                | GitHub OAuth, JWT + HTTP-only refresh token                                                        |
| Billing             | Stripe (Pro/Team subscriptions, signature-verified webhooks)                                       |
| Monorepo            | pnpm workspaces                                                                                    |
| Deployment (MVP)    | AWS-hosted compute — EC2 t4g (Graviton) + PM2 (API), S3 + CloudFront (web); Neon PG, Upstash Redis |
| Infra as code       | Terraform (AWS footprint import-adopted; S3-locked remote state) — see ADR-013                     |

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
| [docs/SYSTEM_DESIGN.md](./docs/SYSTEM_DESIGN.md)                                       | Architecture, data flows, DB schema, API route map, caching, scalability |
| [docs/ONBOARDING.md](./docs/ONBOARDING.md)                                             | First-time setup, repo map, core concepts, common tasks                  |
| [CONTRIBUTING.md](./CONTRIBUTING.md)                                                   | Branch naming, commit conventions, PR process, code style                |
| [SECURITY.md](./SECURITY.md)                                                           | How to report a vulnerability, scope, the privacy invariant              |
| [docs/API_REFERENCE.md](./docs/API_REFERENCE.md)                                       | Every endpoint with request/response shapes, errors, rate limits         |
| [docs/ROADMAP.md](./docs/ROADMAP.md)                                                   | Phase-by-phase plan with definitions of done and icebox                  |
| [docs/ARCHITECTURE_DECISIONS.md](./docs/ARCHITECTURE_DECISIONS.md)                     | ADRs for every major technical decision                                  |
| [PRD](https://docs.google.com/document/d/19pBlTpdtUVbAoK5RfuHPBKJdUgh7GsETuur-nVifaro) | Full Product Requirements Document                                       |

---

## Privacy

commma tracks **key labels** (which physical key was pressed), never key content
(what was typed). File paths are optional. Three privacy modes: `full`,
`summary`, `off`. The extension code is open-source and auditable. To report a
privacy or security issue, see [SECURITY.md](./SECURITY.md).

---

## Status

**Live in production** at [commma.dev](https://commma.dev). Phases 1–4 are
functionally complete; Phase 5 is in progress:

- **Phase 1 — Foundation (done):** extension → ingest → in-process aggregation →
  query loop over Postgres + Redis. GitHub OAuth, JWT access + rotating refresh
  tokens, rate limiting, and the VSCode extension (key-label tracking, privacy
  modes, offline queue).
- **Phase 2 — Web (done):** session-detail page, Canvas keyboard heatmap + PNG
  export, leaderboard and profile endpoints, landing page wired to the API.
- **Phase 3 — Hardening (done):** Vitest suite (unit + gated route integration
  tests), server-side privacy enforcement, refresh-token cleanup, configurable
  proxy-trust for rate limiting, the heatmap-card image API (client + public
  crawler `og:image` variant), and a site-wide SEO pass. The repo is public.
  Still open: a load test at 1,000 concurrent users.
- **Phase 4 — Scale & Community (done):** Stripe billing (Pro/Team), style
  badges, the team model (invites, private leaderboard, aggregate heatmap), the
  weekly recap email + page, Dvorak/Colemak layouts, and the landing page fully
  wired to live data. The extension is published to both the VS Code Marketplace
  and Open VSX (`commma.commma`). Still open: contributor onboarding and
  external PR merges.
- **Phase 5 — Growth (in progress):** mobile layout audit, PWA manifest, and
  push notifications are done. Not yet started: JetBrains/Neovim plugin
  scaffolds, a standalone CLI client, and a self-hosted Docker/Helm stack.

See [docs/ROADMAP.md](./docs/ROADMAP.md) for the detailed phase plan and what
remains.

---

## License

MIT
