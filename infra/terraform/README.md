# Terraform — commma infrastructure

Infrastructure-as-code for the live commma stack: the API box (EC2 + security
group + Elastic IP), the web tier (S3 + CloudFront), and the IAM deploy user.
The config **adopts** the already-running production resources via
`terraform import` — it does not recreate them. Nothing is destroyed as long as
every resource is imported before the first `apply`.

State lives in S3 with native S3 locking (`use_lockfile`, the modern replacement
for the deprecated DynamoDB lock table).

## Credentials

The day-to-day `commma-deploy-local` key is deliberately scoped to S3-sync +
CloudFront-invalidate only — it **cannot** run Terraform. Use an admin/root
credential (or a dedicated `commma-terraform` user) for every command here, for
example:

```bash
export AWS_PROFILE=commma-admin
```

## One-time setup

Run from `infra/terraform/`.

1. **Discover live resources** (read-only — produces `discovery.txt`, which is
   gitignored):

   ```bash
   bash scripts/discover.sh
   ```

2. **Create the state backend** (S3 bucket, versioned + encrypted + locked):

   ```bash
   bash scripts/bootstrap-state.sh
   ```

3. **Initialize Terraform** against the backend:

   ```bash
   terraform init
   ```

## Import workflow

Resource blocks are written to match the discovered prod config, then each live
resource is imported into state:

```bash
bash scripts/import.sh
terraform plan
```

Iterate on the `.tf` files until `terraform plan` reports **no changes** — that
clean plan is the proof the code matches reality. The first `apply` only adds
the `Project` / `ManagedBy` default tags to existing resources (benign); after
that, plans stay clean.

## Layout

| File            | Purpose                                            |
| --------------- | -------------------------------------------------- |
| `versions.tf`   | Terraform + AWS provider version constraints       |
| `providers.tf`  | AWS provider, region, default tags                 |
| `backend.tf`    | S3 remote state + native locking                   |
| `variables.tf`  | Input variables                                    |
| `ec2.tf`        | API instance, security group, Elastic IP           |
| `s3.tf`         | Web bucket, policy, encryption, access controls    |
| `cloudfront.tf` | CDN distribution + Origin Access Control           |
| `acm.tf`        | TLS certificate (`commma.dev` + `docs.commma.dev`) |
| `route53.tf`    | Hosted zone + DNS records                          |
| `iam.tf`        | `commma-deploy-local` user + scoped deploy policy  |
| `cloudwatch.tf` | API-box instance role + alarms + SNS alert topic   |
| `scripts/`      | Discovery, state bootstrap, and import helpers     |

The original prod resources are imported (not created) and reconcile to a clean
`terraform plan`. See `docs/ARCHITECTURE_DECISIONS.md` ADR-013 for the
rationale.

## docs.commma.dev

`docs.commma.dev` is served by the **same** CloudFront distribution and S3
bucket as the main site; the SPA detects the `docs.` host and serves the docs
section. Standing it up is a non-clean, intentional change to three files:

- `acm.tf` — adds `docs.commma.dev` as a subject alternative name. ACM cannot
  edit a cert's domain set in place, so this **replaces** the certificate
  (`create_before_destroy` issues and validates the new one before swapping it
  into CloudFront and destroying the old).
- `route53.tf` — the `acm_validation` record becomes a `for_each` over the
  cert's `domain_validation_options` (one record per domain), plus new `docs_a`
  / `docs_aaaa` alias records pointing at the distribution.
- `cloudfront.tf` — adds `docs.commma.dev` to `aliases` and points
  `viewer_certificate` at `aws_acm_certificate_validation.web` so the alias is
  only added once the new cert is validated.

Expect the plan to show: 1 cert replaced, 1 validation resource added,
validation record(s) changed, the distribution updated, and 2 new DNS records.
`apply` waits on DNS validation (usually a few minutes). No new bucket and no
deploy-pipeline change — `pnpm deploy:web` still ships both hosts.

## CloudWatch monitoring

`cloudwatch.tf` is the **infra-layer** observability for the API box — it is
deliberately scoped to host health and uptime, not application SLOs (ingest/read
p95, error rate, aggregation lag). Those stay on the planned OpenTelemetry route
in `docs/METRICS.md`, because CloudWatch cannot see Neon (Postgres) or Upstash
(Redis), which live off AWS and are watched from their own consoles.

It adds: a `commma-alerts` SNS topic with an email subscription (set
`alert_email` in `terraform.tfvars`; **AWS emails a one-time confirmation link
that must be clicked** before any alarm delivers), a Route 53 health check on
`https://api.commma.dev/health`, and five alarms — EC2 status-check, high CPU,
high memory, root-disk fill, and health-check-down — all wired to the topic.
CPU/memory/disk/swap require the **CloudWatch Agent** running on the box; the
agent is installed and started by `infra/provision-ec2.sh` from
`infra/cloudwatch-agent-config.json`, and pushes custom metrics under the
`CWAgent` namespace.

Standing this up is one **intentional non-clean change** to an existing
resource: `ec2.tf` gains
`iam_instance_profile = aws_iam_instance_profile.api.name` so the agent can call
`cloudwatch:PutMetricData` via the `CloudWatchAgentServerPolicy` managed policy.
Attaching an instance profile to the running box is an in-place update (no
replacement, no restart). Everything else in `cloudwatch.tf` is newly created,
not imported. Expect the plan to show: 1 instance updated, plus the IAM
role/profile, SNS topic + subscription, health check, and five alarms added.

The agent must be (re)started on the box for the CPU/mem/disk alarms to leave
`INSUFFICIENT_DATA` — re-run `infra/provision-ec2.sh` (idempotent) or, by hand:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s \
  -c file:/home/ec2-user/commma/infra/cloudwatch-agent-config.json
```

Cost stays in the AWS free tier at this scale (default per-instance EC2 metrics,
a handful of standard alarms, one health check, and four 1-minute custom
metrics) — but do **not** add high-cardinality custom metrics or ship request
logs to CloudWatch Logs without re-checking the bill against the Neon/Upstash
free-tier discipline in `docs/METRICS.md`.
