#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_S3_BUCKET="${WEB_S3_BUCKET:-commma-web}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E20DGG72SOB2P0}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://api.commma.dev}"
AWS="${AWS:-aws}"

export VITE_API_BASE_URL
cd "$REPO_ROOT"
pnpm --filter @commma/web build

DIST="$REPO_ROOT/apps/web/dist"
"$AWS" s3 sync "$DIST" "s3://$WEB_S3_BUCKET" \
  --delete --exclude index.html \
  --cache-control "public,max-age=31536000,immutable"
"$AWS" s3 cp "$DIST/index.html" "s3://$WEB_S3_BUCKET/index.html" \
  --cache-control "no-cache"
"$AWS" cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "/*" >/dev/null

echo "deployed web -> s3://$WEB_S3_BUCKET (invalidated $CLOUDFRONT_DISTRIBUTION_ID)"
