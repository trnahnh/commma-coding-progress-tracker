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

| File            | Purpose                                           |
| --------------- | ------------------------------------------------- |
| `versions.tf`   | Terraform + AWS provider version constraints      |
| `providers.tf`  | AWS provider, region, default tags                |
| `backend.tf`    | S3 remote state + native locking                  |
| `variables.tf`  | Input variables                                   |
| `ec2.tf`        | API instance, security group, Elastic IP          |
| `s3.tf`         | Web bucket, policy, encryption, access controls   |
| `cloudfront.tf` | CDN distribution + Origin Access Control          |
| `acm.tf`        | `commma.dev` TLS certificate                      |
| `route53.tf`    | Hosted zone + DNS records                         |
| `iam.tf`        | `commma-deploy-local` user + scoped deploy policy |
| `scripts/`      | Discovery, state bootstrap, and import helpers    |

All resources are imported (not created) and the configuration reconciles to a
clean `terraform plan`. See `ARCHITECTURE_DECISIONS.md` ADR-013 for the
rationale.
