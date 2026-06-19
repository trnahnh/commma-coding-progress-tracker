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
