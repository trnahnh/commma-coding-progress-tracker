# Deploying commma

This is the operational runbook for shipping commma to AWS. It follows the
all-AWS compute target in ADR-009: the **API** runs on an EC2 t4g (Graviton) box
under PM2, and the **web** app is a static Vite build served from **S3 +
CloudFront**. PostgreSQL stays on Neon and Redis on Upstash.

The work is split in two:

- **One-time setup** (the owner, once per environment) — provision the box, wire
  DNS/TLS, create the AWS web hosting, and register the GitLab CI/CD variables.
  All of it is config-first: the scripts and configs live in `infra/`.
- **Deploying** (every release) — push to `main`; GitLab CI runs the
  lint/typecheck/test gate, then **auto-deploys** the side whose files changed
  (`deploy:web` / `deploy:api`). You can also deploy from a laptop with the AWS
  CLI (web) and SSH (API) — the CI jobs run the exact same `infra/` scripts. See
  "Manual deploy" below.

GitHub Actions is **disabled account-wide** on this account (an account flag
only GitHub Support can lift), so CI/CD runs on **GitLab**
(`gitlab.com/trnahnh1/commma`) instead. The repo is pushed to both remotes:
GitHub `origin` (which the EC2 box still pulls from) and `gitlab` (which drives
CI). The legacy `.github/workflows/` are inert until the account flag clears.

## Domain & DNS (Route 53)

`commma.dev` is registered at **Namecheap**, but DNS is **delegated to AWS Route
53** so the apex can ALIAS straight to CloudFront. Namecheap's BasicDNS cannot
point an apex record at CloudFront (no ALIAS/ANAME at the root), and the apex
`commma.dev` is the canonical web origin — so delegation, not Namecheap's own
DNS, is the supported setup. This also keeps every record in AWS alongside the
rest of ADR-009's all-AWS stack.

Delegate once, before wiring CloudFront or nginx:

1. In Route 53, **create a public hosted zone** for `commma.dev`. It is created
   with four authoritative **NS** records and one **SOA** — note the four NS
   hostnames.
2. In the **Namecheap dashboard** for the domain → **Nameservers** → choose
   **Custom DNS**, and enter those four Route 53 NS hostnames (drop any trailing
   dot). Save. Delegation propagates in minutes to a few hours; confirm with
   `dig NS commma.dev +short` returning the Route 53 nameservers.
3. From here on, **all records are created in the Route 53 hosted zone**, not at
   Namecheap. Namecheap only holds the registration and the NS delegation.

The two records this deploy needs (created in steps 4 and 5 below):

| Record           | Type      | Target                            |
| ---------------- | --------- | --------------------------------- |
| `commma.dev`     | A — Alias | the CloudFront distribution (web) |
| `api.commma.dev` | A         | the EC2 Elastic IP (API)          |

Because the apex is an **Alias A** to a CloudFront distribution (not a CNAME),
it is free and resolves at the zone root. Give the EC2 box an **Elastic IP**
first so `api.commma.dev` points at a stable address that survives a stop/start.

The canonical config values these records back (already the defaults below):

- `VITE_API_BASE_URL=https://api.commma.dev` and `WEB_URL=https://commma.dev` in
  the `.gitlab-ci.yml` `variables:` block (the web build bakes them in).
- `WEB_ORIGIN=https://commma.dev` and
  `GITHUB_CALLBACK_URL=https://api.commma.dev/v1/auth/github/callback` in the
  server `.env`, matching the GitHub OAuth App callback.
- `server_name api.commma.dev` in the nginx config.

## Deploying

Once the one-time setup is done, `.gitlab-ci.yml` ships a release. Every push to
`main` (and every merge request) runs the `check` stage — `lint`, `typecheck`,
and `test` in parallel on `node:22` with pnpm pinned via Corepack. The `deploy`
stage holds two jobs:

| Job          | What it does                                            |
| ------------ | ------------------------------------------------------- |
| `deploy:web` | `infra/deploy-web.sh`: build, `s3 sync`, CF invalidate  |
| `deploy:api` | `infra/deploy-api.sh`: SSH to EC2, pull, build, restart |

Both **auto-deploy on push to `main`**, path-filtered so each side only ships
when its own files change: `deploy:web` on `apps/web`/`packages/shared`,
`deploy:api` on `apps/api`/`packages/db`/`packages/shared` (both also on
`pnpm-lock.yaml` and `.gitlab-ci.yml`). A `resource_group` per side serializes
deploys so two never overlap, and the `check` stage gates both — a red
lint/typecheck/test blocks the release. A push touching only docs or infra runs
`check` and deploys nothing. To require a manual click for a side instead, add
`when: manual` to its rule in `.gitlab-ci.yml`.

The deploy jobs reuse the laptop scripts verbatim, so they need the same inputs
as a manual deploy, supplied as **GitLab CI/CD variables** (see step 6): AWS
credentials for `deploy:web` and the EC2 SSH key for `deploy:api`.

### Manual deploy (laptop)

You can always deploy by hand with the wrapper scripts in `infra/`, bypassing CI
entirely. Both are env-overridable and default to the production targets, so a
release is one command each:

```bash
pnpm deploy:web   # build -> s3 sync -> index.html -> CloudFront invalidate
pnpm deploy:api   # ssh box -> pull -> build -> pm2 restart -> health check
```

`deploy:web` needs the AWS CLI configured for an IAM user scoped to the web
bucket (S3 `List`/`Get`/`Put`/`Delete`) and `cloudfront:CreateInvalidation`;
`deploy:api` needs the EC2 SSH key. Override any default inline, e.g.
`WEB_S3_BUCKET=other-bucket pnpm deploy:web` or
`SSH_KEY=~/.ssh/other.pem pnpm deploy:api` (see the script headers for every
variable: `WEB_S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `VITE_API_BASE_URL`,
`AWS`; `SSH_KEY`, `API_HOST`, `APP_DIR`, `BRANCH`). The CI deploy jobs call
these same scripts, so a laptop deploy and a pipeline deploy are identical.

## One-time setup

### 1. Managed data tier

- **PostgreSQL** — create a Neon Postgres project, apply migrations with
  `drizzle-kit migrate` against its connection string, and keep that string for
  `DATABASE_URL`.
- **Redis** — create an Upstash database and keep its TLS URL for `REDIS_URL`.

### 2. Provision the EC2 box

Launch an EC2 **t4g (Graviton / ARM)** box on **Amazon Linux 2023 or Ubuntu
20.04+** — never Amazon Linux 2. Use **t4g.small** while its free trial lasts
(through end of 2026; 2 GiB), else **t4g.micro** (1 GiB, ~$6/mo). Avoid
**t4g.nano** (0.5 GiB) — too little RAM for `sharp` renders + the in-process
schedulers + on-box builds (see ADR-009). Because t4g is ARM, pick the
instance's **arm64 AMI**, not x86; `sharp` resolves its arm64 prebuilt
automatically and `provision-ec2.sh` is arch-agnostic, so nothing else changes.
The `sharp` dependency (heatmap PNG) needs glibc >= 2.28; AL2 ships glibc 2.26
and the server will not boot. A monospace font is also required for the card
text; `provision-ec2.sh` installs DejaVu Mono.

**Security group (do not skip):** expose only `80` and `443` to the internet,
plus `22` from your own IP for SSH. Port `3000` must **never** be reachable from
outside the box. The API binds `0.0.0.0:3000`, so if the security group leaves
`3000` open, clients can hit the API directly and forge `X-Forwarded-For`,
defeating the `TRUST_PROXY_HOPS=1` rate limiting. nginx (on the same box) is the
only thing that talks to `:3000`.

If you deploy the API from CI (the `deploy:api` job SSHes in from GitLab's
shared runners), open `22` to `0.0.0.0/0` rather than a single IP — the runner
IP ranges are too many and too dynamic to allowlist. This is safe because the
box is **key-only**: Amazon Linux 2023 ships `PasswordAuthentication no`, so
only the holder of the `.pem` can connect (confirm with
`sudo sshd -T | grep -E 'passwordauthentication|pubkeyauth'`).

SSH in and run the bootstrap script:

```bash
curl -fsSL https://raw.githubusercontent.com/trnahnh/commma-coding-progress-tracker/main/infra/provision-ec2.sh | bash
```

It installs Node 20, pnpm, and PM2, clones the repo to `/home/ec2-user/commma`,
builds the API, and (on first run) copies `apps/api/.env.example` to
`apps/api/.env` then stops so you can fill it in.

### 3. Fill in the server env

Edit `/home/ec2-user/commma/apps/api/.env` with real values. Key fields beyond
`.env.example`:

- `DATABASE_URL`, `REDIS_URL` — from step 1. For Neon, use the **direct**
  connection host, **not** the `-pooler` host: `postgres.js` (in `createDb`)
  sends prepared statements, which Neon's PgBouncer transaction-mode pooler
  rejects. A single box with a fixed pool of 10 connections has no need for the
  pooler. Only switch to the `-pooler` host on a multi-instance deploy, and then
  set `prepare: false` on the `postgres()` client.
- `GITHUB_CALLBACK_URL=https://api.commma.dev/v1/auth/github/callback`. This
  must exactly match the **Authorization callback URL** set on the GitHub OAuth
  App (GitHub -> Settings -> Developer settings -> OAuth Apps).
- `WEB_ORIGIN=https://commma.dev` — the single allowed CORS origin. Pick one
  canonical web host; `www.commma.dev` would be rejected unless you redirect it
  to the apex at the CDN/DNS layer.
- `RUN_AGGREGATION=true` — exactly one process runs the in-process timers; keep
  it `true` on a single-instance box.
- `TRUST_PROXY_HOPS=1` — one nginx hop in front (only valid with the security
  group from step 2).

Apply database migrations against Neon, then re-run the bootstrap script to
start PM2 (on its second pass, with `.env` present, it runs
`pm2 start ecosystem.config.cjs --env production` and `pm2 save` for you):

```bash
cd /home/ec2-user/commma
pnpm --filter @commma/db migrate
bash infra/provision-ec2.sh
```

`drizzle-kit migrate` reads `DATABASE_URL` from `apps/api/.env` (see
`packages/db/drizzle.config.ts`). After the script prints the `pm2 startup`
command, run it once so PM2 resurrects on reboot.

### 4. nginx reverse proxy + TLS

The provision script installs and starts nginx. In the Route 53 hosted zone,
create an `A` record for `api.commma.dev` pointing at the instance's **Elastic
IP** (allocate and associate one first so the address survives a stop/start),
install certbot, then wire up the proxy and TLS. That one public IPv4 is free
for the first 12 months (750 hr/mo) then ~$3.65/mo — it stays IPv4 on purpose so
IPv4-only clients and the VSCode extension can reach the API (ADR-009); allocate
exactly one EIP, since spare/unassociated ones also bill:

```bash
sudo dnf install -y certbot python3-certbot-nginx
sudo cp /home/ec2-user/commma/infra/nginx/api.commma.dev.conf \
  /etc/nginx/conf.d/api.commma.dev.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.commma.dev
```

On Ubuntu, install certbot with
`sudo apt-get install -y certbot python3-certbot-nginx` instead.

`certbot --nginx` injects the 443 server block and HTTP->HTTPS redirect into the
committed HTTP config and sets up auto-renewal. The proxy forwards to
`127.0.0.1:3000` and appends the client IP to `X-Forwarded-For`, which is what
`TRUST_PROXY_HOPS=1` expects.

### 5. Web hosting (S3 + CloudFront)

- Create a private S3 bucket for the static build.
- Request an ACM cert for `commma.dev` in **`us-east-1`** (CloudFront only reads
  certs from that region, regardless of the bucket's region). Validate it by
  **DNS** — ACM gives a CNAME to add to the Route 53 hosted zone; one click from
  the ACM console creates it for you.
- Create a CloudFront distribution with that bucket as origin (via Origin Access
  Control), `commma.dev` as an alternate domain (CNAME), and the ACM cert above.
  In the current console the **"Single website or app"** wizard + **"Allow
  private S3 bucket access to CloudFront"** creates the OAC and writes the
  bucket policy for you — no manual policy copy needed; the alternate domain,
  cert, default root object, and error pages are then set by editing the
  distribution after it is created.
- Set the distribution's **default root object** to `index.html`.
- Add a CloudFront **custom error response** mapping both `403` and `404` to
  `/index.html` with response code `200` — this serves SPA deep links like
  `/@handle` and `/sessions/:id`.
- In the Route 53 hosted zone, create an **Alias A** record for `commma.dev`
  targeting the distribution (the apex aliases directly — no `www` indirection).
  Add a matching **Alias AAAA** record to the same distribution so the
  IPv6-enabled CloudFront is reachable over IPv6 as well.

### 6. GitLab CI/CD variables

CI/CD runs on GitLab (GitHub Actions is account-flagged — see the note at the
top of this doc). The deploy jobs read their secrets from **Settings → CI/CD →
Variables** on the `trnahnh1/commma` project. Add these four, all **Protected**
(so they expose only on the protected `main` branch) and **Masked** where the
value allows it:

| Name                    | Type     | Used by      | Value                           |
| ----------------------- | -------- | ------------ | ------------------------------- |
| `AWS_ACCESS_KEY_ID`     | Variable | `deploy:web` | Deploy IAM user access key      |
| `AWS_SECRET_ACCESS_KEY` | Variable | `deploy:web` | Deploy IAM user secret key      |
| `AWS_DEFAULT_REGION`    | Variable | `deploy:web` | Bucket region, e.g. `us-east-1` |
| `SSH_PRIVATE_KEY`       | File     | `deploy:api` | Contents of the EC2 `.pem` key  |

`SSH_PRIVATE_KEY` must be a **File**-type variable (a multi-line key cannot be
masked); the `deploy:api` job copies it to a `600`-perm path before use. The
non-secret config (`WEB_S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`,
`VITE_API_BASE_URL`, `API_HOST`, `APP_DIR`) lives in the `variables:` block of
`.gitlab-ci.yml` — override there, not as CI variables.

The `deploy:web` job authenticates to AWS with a long-lived IAM user key (GitLab
has no OIDC-to-AWS path as clean as the old GitHub OIDC). Create a dedicated
**`commma-deploy-ci`** IAM user — ideally via Terraform (see `infra/terraform/`)
so it is tracked — granting only
`s3:PutObject`/`s3:DeleteObject`/`s3:ListBucket` on the web bucket and
`cloudfront:CreateInvalidation` on the distribution. Keep it separate from the
laptop `commma-deploy-local` user so either can be revoked independently. Rotate
the key if it ever leaks; it is the one long-lived credential in this setup.

The `.github/workflows/` files remain in the repo but are inert: the account
flag disables Actions even when the repo setting allows it. Clear it via a
reinstatement request at `support.github.com` (Account restrictions); once
lifted, you can run both CIs or retire the GitLab one.

### 7. Billing (Stripe, optional)

Billing is optional: with no Stripe env set, `/v1/billing/*` returns
`503 SERVICE_UNAVAILABLE` and every account stays on `plan='free'`. To enable
Pro/Team subscriptions, configure Stripe **in a sandbox first**, then repeat
against the live account at launch.

In the Stripe Dashboard, choose **Recurring payments**, business type **Digital
goods (SaaS)**, and (recommended) the **Stripe does it / Managed Payments**
option so Stripe is the merchant of record for global VAT/sales tax. Then:

1. Create four recurring **prices** — Pro and Team, each monthly and yearly ($5
   / $50 / $20 / $200, matching the ROADMAP pricing table). Copy each
   `price_...` id into `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`,
   `STRIPE_PRICE_TEAM_MONTHLY`, `STRIPE_PRICE_TEAM_YEARLY`. Sandbox and live
   prices are distinct — recreate them when you go live.
2. Copy the **secret key** (`sk_test_...` in sandbox, `sk_live_...` in
   production) into `STRIPE_SECRET_KEY`.
3. Register a webhook endpoint at `https://api.commma.dev/v1/billing/webhook`
   subscribed to `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, and `customer.subscription.deleted`; copy
   its signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`. For local
   testing use `stripe listen --forward-to localhost:3000/v1/billing/webhook`,
   which prints the `whsec_...` to use.

Verify end to end with test card `4242 4242 4242 4242`:
`POST /v1/billing/checkout` → pay → the webhook flips that user's `users.plan`,
confirmable via `GET /v1/me`. The webhook is authenticated by the Stripe
signature, not a JWT, so the nginx proxy must forward `POST /v1/billing/webhook`
like any other `/v1` route (it already does — no special-casing needed).

### 8. Weekly recap email (Resend, optional)

The weekly recap email (a Pro/Team perk) is **off until you configure it**, and
it needs two things to actually deliver: the **API process running** with the
recap timer enabled, and a **Resend-verified sender domain**. Until both are
true, no recap leaves the system.

Prerequisites:

- **Backend up with the timer.** The recap is an in-process interval started in
  `src/index.ts`, gated by `RUN_AGGREGATION=true`. It only runs inside a live
  API process — there is no separate worker or cron — so the box (PM2) must be
  up during the send window. It fires Monday at/after `RECAP_SEND_HOUR_UTC` and
  catches up later that week if the process was down on Monday.
- **A verified Resend sender on `commma.dev`.** Resend only sends from a domain
  you have verified via DNS records — a DKIM `TXT` (`resend._domainkey`), an SPF
  pair on a `send` subdomain (an `MX` to `feedback-smtp.<region>.amazonses.com`
  plus a `TXT` `v=spf1 include:amazonses.com ~all`), and an optional DMARC `TXT`
  (`_dmarc`) — published in the **Route 53 hosted zone** (not at Namecheap).
  `RECAP_FROM_EMAIL` must use that verified domain, e.g.
  `Commma <recap@commma.dev>`. The throwaway `onboarding@resend.dev` sender
  works for a smoke test but **only delivers to your own Resend account email**,
  so it is not usable for real recipients.

Setup:

1. Create a Resend account and an API key (Sending access); put it in
   `RESEND_API_KEY`.
2. Add the domain in Resend → **Domains** (region `us-east-1`, matching the rest
   of the stack), publish the shown records into the Route 53 hosted zone, and
   wait for **Verified** — confirm they resolve first with `dig` or
   `Resolve-DnsName`.
3. Set the server `.env`:
   - `RESEND_API_KEY=re_...`
   - `RECAP_FROM_EMAIL=Commma <recap@commma.dev>` (verified domain)
   - `RECAP_SEND_HOUR_UTC=13` (optional; default 13)
   - `OPENAI_API_KEY=sk-...` (optional — enables GPT-4.1-nano headline/note for
     all Pro/Team recipients; without it, recaps use the deterministic template.
     Only aggregate stats are sent to OpenAI; no file paths or keystroke data.)
4. Restart PM2 so the new env loads.

With `RESEND_API_KEY`/`RECAP_FROM_EMAIL` unset the job no-ops cleanly (same
optional-by-default pattern as Stripe/VAPID), so leaving it blank pre-domain is
safe.

## Redeploy and rollback

- **Redeploy** — re-run the relevant deploy job from the GitLab pipeline (or run
  the `pnpm deploy:*` script from a laptop). `deploy:api` pulls `main` and
  PM2-restarts; `deploy:web` rebuilds and re-syncs.
- **Rollback** — check out the previous good commit and re-run the deploy, or on
  the box `git checkout <sha>`, `pnpm --filter @commma/api build`,
  `pm2 restart commma-api`.
- **Logs** — `pm2 logs commma-api` on the box. The API emits structured JSON.

## Constraints that must not be broken

- **Web and API share one registrable domain.** The refresh cookie is
  `Secure; HttpOnly; SameSite=Strict`, host-only on `api.commma.dev`. It is sent
  on requests from `commma.dev` only because both are the same site
  (`commma.dev`). If the web app is ever served from a different domain (e.g. a
  Vercel preview host), the cookie is dropped and silent-refresh auth breaks.
- **Only one canonical web origin.** `WEB_ORIGIN` is a single value enforced by
  CORS; redirect any alternate host (e.g. `www`) to it at the CDN/DNS layer.
- **The security group must keep port 3000 closed** (see step 2) for the rate
  limiter's `X-Forwarded-For` handling to be trustworthy.

## Docker note

`apps/api/Dockerfile` exists for a **future ECS Fargate migration** (ADR-009)
and is not used by this EC2 deploy. `docker-compose.yml` is for local dev infra
(Postgres + Redis) only. Neither is part of the production path today.
