#!/usr/bin/env bash
set -uo pipefail

AWS="${AWS:-aws}"
WEB_BUCKET="${WEB_BUCKET:-commma-web}"
CF_DIST_ID="${CF_DIST_ID:-E20DGG72SOB2P0}"
DEPLOY_USER="${DEPLOY_USER:-commma-deploy-local}"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/discovery.txt"

: >"$OUT"

section() {
  printf '\n========== %s ==========\n' "$1" | tee -a "$OUT"
}

run() {
  printf '+ %s\n' "$*" | tee -a "$OUT"
  "$@" 2>&1 | tee -a "$OUT"
  printf '\n' | tee -a "$OUT"
}

section "identity / region"
run $AWS sts get-caller-identity
run $AWS configure get region

section "vpcs"
run $AWS ec2 describe-vpcs --output json

section "subnets"
run $AWS ec2 describe-subnets --output json

section "ec2 instances"
run $AWS ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running,stopped" \
  --output json

section "security groups"
run $AWS ec2 describe-security-groups --output json

section "elastic ips"
run $AWS ec2 describe-addresses --output json

section "key pairs"
run $AWS ec2 describe-key-pairs --output json

section "ebs volumes"
run $AWS ec2 describe-volumes --output json

section "s3 web bucket: location"
run $AWS s3api get-bucket-location --bucket "$WEB_BUCKET"
section "s3 web bucket: policy"
run $AWS s3api get-bucket-policy --bucket "$WEB_BUCKET"
section "s3 web bucket: website"
run $AWS s3api get-bucket-website --bucket "$WEB_BUCKET"
section "s3 web bucket: public access block"
run $AWS s3api get-public-access-block --bucket "$WEB_BUCKET"
section "s3 web bucket: cors"
run $AWS s3api get-bucket-cors --bucket "$WEB_BUCKET"
section "s3 web bucket: versioning"
run $AWS s3api get-bucket-versioning --bucket "$WEB_BUCKET"
section "s3 web bucket: encryption"
run $AWS s3api get-bucket-encryption --bucket "$WEB_BUCKET"
section "s3 web bucket: ownership controls"
run $AWS s3api get-bucket-ownership-controls --bucket "$WEB_BUCKET"
section "s3 web bucket: acl"
run $AWS s3api get-bucket-acl --bucket "$WEB_BUCKET"
section "s3 web bucket: tagging"
run $AWS s3api get-bucket-tagging --bucket "$WEB_BUCKET"

section "cloudfront distribution config"
run $AWS cloudfront get-distribution-config --id "$CF_DIST_ID"
section "cloudfront origin access controls"
run $AWS cloudfront list-origin-access-controls
section "cloudfront origin access identities"
run $AWS cloudfront list-cloud-front-origin-access-identities

section "acm certificates (us-east-1)"
run $AWS acm list-certificates --region us-east-1 --output json

section "route53 hosted zones"
run $AWS route53 list-hosted-zones --output json

section "iam deploy user"
run $AWS iam get-user --user-name "$DEPLOY_USER"
run $AWS iam list-attached-user-policies --user-name "$DEPLOY_USER"
run $AWS iam list-user-policies --user-name "$DEPLOY_USER"
run $AWS iam list-access-keys --user-name "$DEPLOY_USER"

printf '\nwrote %s\n' "$OUT"
