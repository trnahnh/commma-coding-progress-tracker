<!-- markdownlint-disable MD033 MD041 MD013 MD036 -->
<div align="center">

# commma

**Every commit is a step.**

Turn your editor into a logbook — pace, splits, streaks, and podiums, for the
work you already do.

[![Live](https://img.shields.io/badge/Live-commma.dev-ff4d1a?style=for-the-badge&logo=googlechrome&logoColor=white)](https://commma.dev)
[![VS Code](https://img.shields.io/badge/VS%20Code-Marketplace-ff4d1a?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZmZmZiI%2BPHBhdGggZD0iTTIzLjE1IDIuNTg3TDE4LjIxLjIxYTEuNDk0IDEuNDk0IDAgMCAwLTEuNzA1LjI5bC05LjQ2IDguNjMtNC4xMi0zLjEyOGEuOTk5Ljk5OSAwIDAgMC0xLjI3Ni4wNTdMLjMyNyA3LjI2MUExIDEgMCAwIDAgLjMyNiA4Ljc0TDMuODk5IDEyIC4zMjYgMTUuMjZhMSAxIDAgMCAwIC4wMDEgMS40NzlMMS42NSAxNy45NGEuOTk5Ljk5OSAwIDAgMCAxLjI3Ni4wNTdsNC4xMi0zLjEyOCA5LjQ2IDguNjNhMS40OTIgMS40OTIgMCAwIDAgMS43MDQuMjlsNC45NDItMi4zNzdBMS41IDEuNSAwIDAgMCAyNCAyMC4wNlYzLjkzOWExLjUgMS41IDAgMCAwLS44NS0xLjM1MnptLTUuMTQ2IDE0Ljg2MUwxMC44MjYgMTJsNy4xNzgtNS40NDh2MTAuODk2eiIvPjwvc3ZnPg%3D%3D)](https://marketplace.visualstudio.com/items?itemName=commma.commma)
[![Open VSX](https://img.shields.io/open-vsx/v/commma/commma?style=for-the-badge&label=Open%20VSX&color=ff4d1a&logo=eclipseide&logoColor=white)](https://open-vsx.org/extension/commma/commma)
[![CI](https://img.shields.io/github/actions/workflow/status/trnahnh/commma-coding-progress-tracker/ci.yml?branch=main&style=for-the-badge&label=CI&color=ff4d1a&logo=githubactions&logoColor=white)](https://github.com/trnahnh/commma-coding-progress-tracker/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-ff4d1a?style=for-the-badge)](#license)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-commma-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/company/commma-dev/)

</div>
<!-- markdownlint-enable MD033 MD041 MD013 MD036 -->

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
[commma.dev/install](https://commma.dev/install) for every option.

Coding outside a VS Code editor? The headless **commma CLI** (`apps/cli`) tracks
any editor that writes files — Neovim, Emacs, Helix, JetBrains — from one
terminal command. Build it from this monorepo and run `commma login` /
`commma watch`; see [commma.dev/cli](https://commma.dev/cli) and the
[CLI README](apps/cli/README.md). Native JetBrains and Neovim plugins are still
on the roadmap.

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

<!-- markdownlint-disable MD033 MD013 -->
<div align="center">

![Frontend](https://skillicons.dev/icons?i=ts,react,vite,tailwind&theme=dark)
![Backend and data](https://skillicons.dev/icons?i=nodejs,postgres,redis&theme=dark)
![Cloud and infra](https://skillicons.dev/icons?i=aws,terraform,docker,nginx,githubactions&theme=dark)

</div>
<!-- markdownlint-enable MD033 MD013 -->

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
| Brand film          | ElevenLabs neural voiceover; Canvas animation → ffmpeg                                             |
| Auth                | GitHub OAuth, JWT + HTTP-only refresh token                                                        |
| Billing             | Stripe (Pro/Team subscriptions, signature-verified webhooks)                                       |
| Monorepo            | pnpm workspaces                                                                                    |
| Deployment (MVP)    | AWS-hosted compute — EC2 t4g (Graviton) + PM2 (API), S3 + CloudFront (web); Neon PG, Upstash Redis |
| Infra as code       | Terraform (AWS footprint import-adopted; S3-locked remote state) — see ADR-013                     |
| Monitoring (infra)  | CloudWatch host metrics + Agent (mem/disk/swap), EC2/Route 53 health alarms → SNS email            |

---

## Monorepo Structure

```text
commma/
├── apps/
│   ├── api/          Hono REST API
│   ├── cli/          Headless CLI client (any editor)
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
- **Phase 5 — Growth (in progress):** mobile layout audit, PWA manifest, push
  notifications, and the headless CLI client (`apps/cli`, any editor that writes
  files) are done. Not yet started: JetBrains/Neovim plugin scaffolds and a
  self-hosted Docker/Helm stack.

See [docs/ROADMAP.md](./docs/ROADMAP.md) for the detailed phase plan and what
remains.

---

## License

MIT
