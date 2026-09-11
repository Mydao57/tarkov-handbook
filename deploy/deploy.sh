#!/usr/bin/env bash
# Pull, build and restart TarkovHandbook on the VPS.
# Run as the `tarkov` user. Restarting the services needs either root or a
# sudoers rule (see deploy/README.md).
#
#   APP_DIR=/opt/tarkov-handbook DEPLOY_REF=main ./deploy/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tarkov-handbook}"
DEPLOY_REF="${DEPLOY_REF:-main}"

cd "$APP_DIR"

echo ">> Fetching $DEPLOY_REF"
git fetch --prune origin
git checkout "$DEPLOY_REF"
git pull --ff-only origin "$DEPLOY_REF"

echo ">> Installing (with dev deps -- tsc/vite are needed to build)"
corepack enable
pnpm install --frozen-lockfile

echo ">> Building"
pnpm build

echo ">> Restarting services"
sudo systemctl restart tarkov-bot.service tarkov-panel.service
sleep 1
sudo systemctl --no-pager --lines=15 status tarkov-bot.service tarkov-panel.service || true

echo ">> Done. Health checks:"
curl -fsS http://127.0.0.1:4785/health && echo
curl -fsS -o /dev/null -w "panel HTTP %{http_code}\n" http://127.0.0.1:4786/ || true
