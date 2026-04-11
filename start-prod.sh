#!/bin/bash
# Replit Deployments / reserved VM — same as start.sh but explicit name for .replit deployment run.
set -e
export PORT="${PORT:-5000}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/replit-mongo.sh
source "$SCRIPT_DIR/scripts/replit-mongo.sh"

# Auth base URL: prefer APP_URL, then CUSTOM_DOMAIN, then REPLIT_DOMAINS
APP_BASE_URL="${APP_URL:-$CUSTOM_DOMAIN}"
if [ -n "$APP_BASE_URL" ]; then
  BASE="${APP_BASE_URL#https://}"
  BASE="${BASE#http://}"
  export NEXTAUTH_URL="https://${BASE}"
  export AUTH_URL="https://${BASE}"
  echo "Auth URL set from app base URL: https://${BASE}"
elif [ -n "$REPLIT_DOMAINS" ]; then
  FIRST_DOMAIN=$(echo "$REPLIT_DOMAINS" | cut -d',' -f1 | tr -d ' ')
  export NEXTAUTH_URL="https://${FIRST_DOMAIN}"
  export AUTH_URL="https://${FIRST_DOMAIN}"
  echo "Auth URL set from REPLIT_DOMAINS: https://${FIRST_DOMAIN}"
fi

replit_start_local_mongo_if_needed

echo "Running auto-seed check..."
node src/scripts/auto-seed.mjs

if [ "$PROVISION_BOOTSTRAP_ACCOUNTS" = "true" ]; then
  echo "Provisioning bootstrap auth accounts..."
  node src/scripts/provision-bootstrap-accounts.mjs
fi

echo "Starting production server on port $PORT..."
exec npm run start
