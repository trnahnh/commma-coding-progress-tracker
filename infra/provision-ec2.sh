#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/trnahnh/commma-coding-progress-tracker.git}"
APP_DIR="${APP_DIR:-/home/ec2-user/commma}"
NODE_MAJOR="${NODE_MAJOR:-20}"
PNPM_VERSION="${PNPM_VERSION:-10.28.1}"

SWAP_FILE="${SWAP_FILE:-/swapfile}"
SWAP_SIZE_MB="${SWAP_SIZE_MB:-2048}"

if [ ! -f "${SWAP_FILE}" ]; then
  sudo dd if=/dev/zero of="${SWAP_FILE}" bs=1M count="${SWAP_SIZE_MB}"
  sudo chmod 600 "${SWAP_FILE}"
  sudo mkswap "${SWAP_FILE}"
  sudo swapon "${SWAP_FILE}"
  echo "${SWAP_FILE} none swap sw 0 0" | sudo tee -a /etc/fstab
fi

if command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y git tar gzip dejavu-sans-mono-fonts nginx amazon-cloudwatch-agent
elif command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y git tar gzip fonts-dejavu-core nginx
fi

sudo systemctl enable --now nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | sudo bash - || true
  if command -v dnf >/dev/null 2>&1; then
    sudo dnf install -y nodejs
  elif command -v apt-get >/dev/null 2>&1; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo bash -
    sudo apt-get install -y nodejs
  fi
fi

sudo corepack enable
corepack prepare "pnpm@${PNPM_VERSION}" --activate
sudo npm install -g pm2

if [ ! -d "${APP_DIR}/.git" ]; then
  git clone "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"
git pull origin main

CW_AGENT_CTL="/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl"
CW_AGENT_CONFIG="${APP_DIR}/infra/cloudwatch-agent-config.json"
if [ -x "${CW_AGENT_CTL}" ] && [ -f "${CW_AGENT_CONFIG}" ]; then
  sudo "${CW_AGENT_CTL}" -a fetch-config -m ec2 -s -c "file:${CW_AGENT_CONFIG}"
fi

pnpm install --frozen-lockfile
pnpm --filter @commma/api build

if [ ! -f "${APP_DIR}/apps/api/.env" ]; then
  cp "${APP_DIR}/apps/api/.env.example" "${APP_DIR}/apps/api/.env"
  echo "Created apps/api/.env from .env.example — edit it with real values, then re-run this script."
  exit 1
fi

cd "${APP_DIR}/apps/api"
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup | tail -n 1

GRAFANA_LOKI_URL="${GRAFANA_LOKI_URL:-}"
GRAFANA_LOKI_USER="${GRAFANA_LOKI_USER:-}"
GRAFANA_LOKI_TOKEN="${GRAFANA_LOKI_TOKEN:-}"

if [ -n "${GRAFANA_LOKI_URL}" ] && [ -n "${GRAFANA_LOKI_USER}" ] && [ -n "${GRAFANA_LOKI_TOKEN}" ] && command -v dnf >/dev/null 2>&1; then
  if ! command -v alloy >/dev/null 2>&1; then
    sudo tee /etc/yum.repos.d/grafana.repo >/dev/null <<'EOF'
[grafana]
name=grafana
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
EOF
    sudo rpm --import https://rpm.grafana.com/gpg.key
    sudo dnf install -y alloy
  fi

  sudo install -m 0644 "${APP_DIR}/infra/alloy/config.alloy" /etc/alloy/config.alloy

  sudo tee /etc/sysconfig/alloy >/dev/null <<EOF
CONFIG_FILE="/etc/alloy/config.alloy"
CUSTOM_ARGS=""
RESTART_ON_UPGRADE=true
GRAFANA_LOKI_URL="${GRAFANA_LOKI_URL}"
GRAFANA_LOKI_USER="${GRAFANA_LOKI_USER}"
GRAFANA_LOKI_TOKEN="${GRAFANA_LOKI_TOKEN}"
EOF

  sudo mkdir -p /etc/systemd/system/alloy.service.d
  sudo tee /etc/systemd/system/alloy.service.d/override.conf >/dev/null <<'EOF'
[Service]
User=root
Group=root
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable alloy
  sudo systemctl restart alloy
else
  echo "Grafana Loki env not set (GRAFANA_LOKI_URL/USER/TOKEN) — skipping Alloy log shipper setup."
fi
