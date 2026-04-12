#!/bin/bash
# Replit "Run" workflow: stable preview using `next start` (no HMR) unless REPLIT_DEV_SERVER=1.
set -e
export PORT="${PORT:-5000}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/replit-mongo.sh
source "$SCRIPT_DIR/scripts/replit-mongo.sh"

# Auth URL: prefer APP_URL, then CUSTOM_DOMAIN, then REPLIT_DOMAINS (Replit sets this automatically).
APP_BASE_URL="${APP_URL:-$CUSTOM_DOMAIN}"
if [ -n "$APP_BASE_URL" ]; then
  BASE="${APP_BASE_URL#https://}"
  BASE="${BASE#http://}"
  export NEXTAUTH_URL="https://${BASE}"
  export AUTH_URL="https://${BASE}"
elif [ -n "$REPLIT_DOMAINS" ]; then
  FIRST_DOMAIN=$(echo "$REPLIT_DOMAINS" | cut -d',' -f1 | tr -d ' ')
  export NEXTAUTH_URL="https://${FIRST_DOMAIN}"
  export AUTH_URL="https://${FIRST_DOMAIN}"
fi

replit_start_local_mongo_if_needed

echo "Running auto-seed check..."
node src/scripts/auto-seed.mjs

if [ "$PROVISION_BOOTSTRAP_ACCOUNTS" = "true" ]; then
  echo "Provisioning bootstrap auth accounts..."
  node src/scripts/provision-bootstrap-accounts.mjs
fi

pkill -f "next dev" 2>/dev/null || true
sleep 1
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=3072"

if [ "${REPLIT_DEV_SERVER:-}" = "1" ]; then
  echo "REPLIT_DEV_SERVER=1 — Next dev on port $PORT (HMR; less stable on Replit)."
  rm -rf .next
  exec npm run dev:5000
fi

if [ -d .next ] && [ ! -f .next/BUILD_ID ]; then
  echo "Stale/incomplete .next directory detected (no BUILD_ID) — removing it to avoid crash loop."
  rm -rf .next
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "No .next build found — running npm run build..."
  npm run build
fi

echo "Starting production server on port $PORT (next start)..."
exec npm run start
