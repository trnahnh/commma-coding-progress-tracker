# Deployment Checklist

A living status board for commma's production deploy. Tick items as they land;
the runbook for _how_ to do each step lives in [DEPLOY.md](./DEPLOY.md). Last
updated 2026-06-14.

Legend: `[x]` done · `[ ]` open · **Blocked** / **Before launch** call out gates.

## Live endpoints

| Surface | URL                                      | State        |
| ------- | ---------------------------------------- | ------------ |
| Web     | <https://commma.dev>                     | Live         |
| API     | <https://api.commma.dev>                 | Live         |
| Health  | <https://api.commma.dev/health>          | `200`        |

## 1. Managed data tier

- [x] Neon Postgres provisioned (us-east-1), migrations applied
- [x] `DATABASE_URL` uses the **direct** host, not `-pooler` (prepared
      statements break PgBouncer transaction mode)
- [x] Upstash Redis provisioned (TLS `rediss://`)

## 2. DNS & domain

- [x] `commma.dev` registered (Namecheap), NS delegated to Route 53 hosted zone
- [x] Apex `commma.dev` Alias A/AAAA → CloudFront
- [x] `api.commma.dev` A → EC2 Elastic IP

## 3. API (EC2)

- [x] t4g (Graviton, arm64) box on AL2023, PM2, 2 GB swap
- [x] Security group: only 80/443 public, 22 for SSH, 3000 closed
- [x] nginx reverse proxy → `127.0.0.1:3000`, `TRUST_PROXY_HOPS=1`
- [x] Let's Encrypt TLS via certbot (auto-renew)
- [x] esbuild bundle fix (`node dist/index.js` resolves workspace deps)
- [x] PM2 resurrection on reboot
- [x] Production `.env` populated (DB, Redis, JWT, GitHub OAuth, VAPID, Resend,
      OpenAI)

## 4. Web (S3 + CloudFront)

- [x] Private S3 bucket `commma-web` + Origin Access Control
- [x] ACM cert (us-east-1), CloudFront distribution `E20DGG72SOB2P0`
- [x] SPA error mapping (403/404 → `/index.html` 200)
- [x] `VITE_API_BASE_URL=https://api.commma.dev` baked at build

## 5. Repository

- [x] Transferred `NauriFive` → `trnahnh/commma-coding-progress-tracker`
- [x] Local `origin` re-pointed; repo-path refs updated (provision, web links,
      docs)
- [ ] EC2 box git remote still points at the old `NauriFive` URL — GitHub
      redirect keeps `git pull` working, so non-blocking; update on next SSH

## 6. CI/CD (GitHub Actions)

- [x] Workflows: `ci`, `deploy-api`, `deploy-web`
- [x] Secrets set: `EC2_HOST`, `EC2_SSH_KEY`, `CLOUDFRONT_DISTRIBUTION_ID`
- [x] Variables set: `WEB_S3_BUCKET`, `AWS_REGION`, `VITE_API_BASE_URL`,
      `WEB_URL`
- [x] Auto-deploy on push to `main` (path-filtered, concurrency-guarded)
- [ ] **Blocked:** GitHub Actions disabled **at account level** on `trnahnh`
      (`HTTP 422: Actions has been disabled for this user`). Only a GitHub
      Support reinstatement clears it — ticket filed (Account restrictions). No
      repo-move fixes this.
- [ ] **After Actions returns:** create the OIDC IAM role, set `AWS_ROLE_ARN`
      (trust subject `repo:trnahnh/commma-coding-progress-tracker:*`), then run
      both workflows green

## 7. Manual deploy (current method while Actions is blocked)

- [x] AWS CLI v2 installed locally
- [x] Scoped IAM user `commma-deploy-local` (S3 on `commma-web` + CloudFront
      invalidation only)
- [x] One-command scripts: `pnpm deploy:web` / `pnpm deploy:api`
- [ ] Rotate the `commma-deploy-local` access key (it was pasted in chat once;
      low blast radius, but rotate when convenient)

## 8. Billing (Stripe — sandbox rehearsal)

- [x] Billing code built end-to-end (API `routes/billing.ts`; web Pricing →
      checkout → success → portal)
- [x] Sandbox products/prices (Pro $5/$50, Team $20/$200) verified via API
- [x] Webhook endpoint registered for `api.commma.dev` (4 events) + secret
- [x] Test-mode keys applied to the **prod box `.env`** (box-only overlay;
      `.env.production` left blank on purpose); webhook probe `503 → 401`
- [x] Front half verified (auth → checkout session + Stripe customer + redirect)
- [ ] Back half: complete a `4242` test payment once → confirm
      `checkout.session.completed` + active subscription + plan flips to Pro
- [ ] **Before launch:** swap test keys for **live** keys (recreate live prices,
      live webhook secret) or wipe to blank — test keys mean real customers
      can't pay

## Pre-launch gate

Run before the first public launch:

- [ ] GitHub Actions re-enabled → OIDC role + `AWS_ROLE_ARN` → both workflows
      verified green
- [ ] Stripe switched to **live** mode (or deliberately left off)
- [ ] `commma-deploy-local` access key rotated
- [ ] EC2 box git remote updated to the `trnahnh` URL
- [ ] Prod-sized load test (t4g + Neon + Upstash) per
      [METRICS.md](./METRICS.md)
- [ ] Production instrumentation / metrics sink wired (prod currently
      uninstrumented)

## How to deploy right now

```bash
pnpm deploy:web   # build -> s3 sync -> index.html -> CloudFront invalidate
pnpm deploy:api   # ssh box -> pull -> build -> pm2 restart -> health check
```

Run from a fresh terminal so `aws` is on `PATH`. Both scripts are
env-overridable (see headers in `infra/deploy-web.sh` / `infra/deploy-api.sh`).
Pushing to GitHub does **not** deploy until Actions is re-enabled — deploy
manually with the commands above.
