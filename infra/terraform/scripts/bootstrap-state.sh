#!/usr/bin/env bash
set -euo pipefail

BUCKET="${TF_STATE_BUCKET:-commma-terraform-state-654801597077}"
REGION="${TF_STATE_REGION:-us-east-1}"
AWS="${AWS:-aws}"

if $AWS s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "state bucket already exists: $BUCKET"
else
  $AWS s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  echo "created bucket: $BUCKET"
fi

$AWS s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

$AWS s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

$AWS s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "state backend ready: s3://$BUCKET ($REGION) versioned + encrypted + locked"
