# Deployment Checklist

A living status board for commma's production deploy. Tick items as they land;
the runbook for _how_ to do each step lives in [DEPLOY.md](./DEPLOY.md). Last
updated 2026-06-21.

Legend: `[x]` done · `[ ]` open · **Blocked** / **Before launch** call out
gates.

## Live endpoints

| Surface | URL                             | State |
| ------- | ------------------------------- | ----- |
| Web     | <https://commma.dev>            | Live  |
| API     | <https://api.commma.dev>        | Live  |
| Health  | <https://api.commma.dev/health> | `200` |

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

## 6. CI/CD

- [x] **GitHub Actions** is the active pipeline (`.github/workflows/`): `ci.yml`
      runs `lint`/`typecheck`/`test`/markdown-lint on every push and PR;
      `deploy-web.yml` and `deploy-api.yml` **auto-deploy on `main`**,
      path-filtered per app, `concurrency`-serialized
- [ ] `deploy-web.yml` authenticates to AWS via an **OIDC role**
      (`AWS_ROLE_ARN`) — role/provider not yet created; **web deploy fails until
      `AWS_ROLE_ARN` is set** (API deploy is unaffected)
- [x] **GitLab** (`trnahnh1/commma`, `.gitlab-ci.yml`) runs the same
      `lint`/`typecheck`/`test` gate as a **passive backup** — deploy jobs
      removed so a dual-push can't double-deploy
- [x] Repo dual-pushes to GitHub `origin` (EC2 pull source) and `gitlab`
- [x] EC2 SG port 22 open to `0.0.0.0/0` so hosted CI runners can SSH — via
      Terraform, safe because the box is key-only
- [ ] Confirm Actions secrets/vars are set: `AWS_ROLE_ARN`,
      `CLOUDFRONT_DISTRIBUTION_ID`, `EC2_HOST`, `EC2_SSH_KEY` (secrets);
      `WEB_S3_BUCKET`, `AWS_REGION`, `VITE_API_BASE_URL`, `WEB_URL` (variables)
- [ ] Verify the `AWS_ROLE_ARN` OIDC role trust `sub` is
      `repo:trnahnh/commma-coding-progress-tracker:*`
- [ ] Decommission the now-unused `commma-deploy-ci` IAM user (it backed the
      retired GitLab `deploy:web` key; web deploys via OIDC now)

## 7. Manual deploy (laptop path)

- [x] AWS CLI v2 installed locally
- [x] Scoped IAM user `commma-deploy-local` (S3 on `commma-web` + CloudFront
      invalidation only)
- [x] One-command scripts: `pnpm deploy:web` / `pnpm deploy:api`

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

## 9. Weekly recap email (Resend + OpenAI)

- [x] `RESEND_API_KEY` set on prod — valid, **send-only** scoped key
- [x] `OPENAI_API_KEY` set on prod — valid (`HTTP 200`); optional recap prose
      (`gpt-4.1-nano`, ~$0.0002/recap, aggregate stats only — no
      paths/keystrokes)
- [x] Recap scheduler runs in-process (gated by `RUN_AGGREGATION=true`)
- [x] `commma.dev` verified in Resend (SPF/DKIM/DMARC in Route 53);
      `RECAP_FROM_EMAIL` switched to `Commma <recap@commma.dev>` on the prod
      box; test email from `recap@commma.dev` delivered to a real inbox
- Pre-launch there are no Pro/Team recipients, so no recap actually sends yet

## 10. Monitoring (CloudWatch — infra layer)

- [x] `infra/terraform/cloudwatch.tf` applied — EC2 instance profile
      `commma-api-instance` (CloudWatch Agent), `commma-alerts` SNS topic, and
      five alarms (EC2 status-check, CPU, memory, root-disk, Route 53
      `api.commma.dev/health`)
- [x] CloudWatch Agent installed + started on the box (mem/disk/swap →
      `CWAgent`); `infra/provision-ec2.sh` now does this on provision
- [ ] SNS email subscription **confirmed** — click the one-time AWS link sent to
      `alert_email` (alarms do not deliver until confirmed)
- Infra layer only; application SLOs stay on the planned OpenTelemetry route
  (see [METRICS.md](./METRICS.md))

## Pre-launch gate

Run before the first public launch:

- [ ] GitHub Actions `deploy-web.yml` + `deploy-api.yml` run green once (Actions
      secrets/vars set, OIDC role trust policy verified)
- [ ] Stripe switched to **live** mode (or deliberately left off)
- [x] Resend `commma.dev` sender domain verified + `RECAP_FROM_EMAIL` switched
      off the throwaway `onboarding@resend.dev`
- [ ] EC2 box git remote updated to the `trnahnh` URL
- [ ] Prod-sized load test (t4g + Neon + Upstash) per [METRICS.md](./METRICS.md)
- [ ] Production instrumentation / metrics sink wired (prod currently
      uninstrumented)

## How to deploy right now

```bash
pnpm deploy:web   # build -> s3 sync -> index.html -> CloudFront invalidate
pnpm deploy:api   # ssh box -> pull -> build -> pm2 restart -> health check
```

Run from a fresh terminal so `aws` is on `PATH`. Both scripts are
env-overridable (see headers in `infra/deploy-web.sh` / `infra/deploy-api.sh`).
A push to `main` auto-deploys via GitHub Actions
(`deploy-web.yml`/`deploy-api.yml`, path-filtered); these laptop commands are
the manual alternative that runs the same `infra/` steps.
