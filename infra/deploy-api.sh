#!/usr/bin/env bash
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/commma-api.pem}"
API_HOST="${API_HOST:-ec2-user@api.commma.dev}"
APP_DIR="${APP_DIR:-/home/ec2-user/commma}"
BRANCH="${BRANCH:-main}"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$API_HOST" \
  "set -euo pipefail
   cd '$APP_DIR'
   git fetch origin '$BRANCH'
   git checkout '$BRANCH'
   git pull --ff-only origin '$BRANCH'
   pnpm install --frozen-lockfile
   pnpm --filter @commma/db migrate
   pnpm --filter @commma/api build
   pm2 restart commma-api
   curl -fsS --retry 5 --retry-delay 2 --retry-all-errors -o /dev/null \
     -w 'health %{http_code}\n' http://127.0.0.1:3000/health"

echo "deployed api -> $API_HOST ($BRANCH)"
