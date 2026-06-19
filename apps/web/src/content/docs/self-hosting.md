# Self-hosting

commma is built from ordinary, portable pieces — a Node API, a static web build,
Postgres, and Redis — so running your own instance is mostly a matter of
standing those up and pointing them at each other.

> A one-command `docker-compose` stack and a Helm chart are on the roadmap.
> Until they land, the steps below describe the moving parts you need to wire by
> hand.

## What you need

- **Node** and **pnpm** (the repo pins an exact pnpm version).
- **PostgreSQL** for the durable data — users, sessions, streaks, the social
  graph.
- **Redis** for rate limits, the leaderboard sorted sets, and hot caches.
- A **GitHub OAuth app** for sign-in.

## Layout

The repository is a pnpm workspace. A single install at the root hydrates every
package:

```bash
pnpm install
```

The pieces you deploy:

- **`apps/api`** — the Hono server. Runs as a long-lived Node process.
- **`apps/web`** — the React app. Builds to static files you serve from any
  static host or CDN.
- **`packages/db`** — the Drizzle schema and migrations.
- **`packages/shared`** — the event contract shared by the extension and API.

## Configuration

The API reads its configuration from the environment, validated on startup. At
minimum it needs a Postgres connection string, a Redis URL, a JWT secret, and
your GitHub OAuth credentials. The web build needs the public base URL of your
API.

Secrets live only in the server environment. They are never baked into the web
or extension bundles.

## Database

Apply the migrations against your database before first boot:

```bash
pnpm --filter @commma/db migrate
```

Migrations are append-only, so upgrading later is always a matter of running the
new ones in order.

## Running

- Start the API as a managed Node process (a process manager, a container, or a
  systemd unit — whatever you already run).
- Build the web app and serve the static output.
- Point the extension at your API's base URL.

## Scaling notes

The API is designed to run behind more than one instance: there is no in-process
state that has to be shared, the refresh flow is database-backed rather than
sticky, and the interval schedulers are guarded so they run on exactly one
instance. If you scale past a single box, make sure only one instance is elected
to run aggregation.
