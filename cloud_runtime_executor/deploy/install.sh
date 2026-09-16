#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/opt/mastermind-runtime"
CONFIG_DIR="/etc/mastermind-runtime"
DATA_DIR="/var/lib/mastermind-runtime"
REPO_URL="${MASTERMIND_REPO_URL:-https://github.com/ahmedwwaw1/my.git}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js >=20 is required." >&2; exit 1; }

mkdir -p "$APP_ROOT" "$CONFIG_DIR" "$DATA_DIR"

if [[ ! -d "$APP_ROOT/.git" ]]; then
  rm -rf "$APP_ROOT"
  git clone --depth 1 "$REPO_URL" "$APP_ROOT"
else
  git -C "$APP_ROOT" fetch --depth 1 origin main
  git -C "$APP_ROOT" reset --hard origin/main
fi

install -m 0644 "$APP_ROOT/cloud_runtime_executor/deploy/mastermind-runtime.service" /etc/systemd/system/mastermind-runtime.service

if [[ ! -f "$CONFIG_DIR/runtime.env" ]]; then
  install -m 0600 "$APP_ROOT/cloud_runtime_executor/.env.example" "$CONFIG_DIR/runtime.env"
  echo "Created $CONFIG_DIR/runtime.env; set RUNTIME_SHARED_SECRET before starting the service." >&2
  exit 2
fi

install -d -m 0700 "$DATA_DIR"
systemctl daemon-reload
systemctl enable mastermind-runtime.service
systemctl restart mastermind-runtime.service
systemctl --no-pager --full status mastermind-runtime.service
