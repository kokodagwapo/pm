#!/bin/bash
export PORT=${PORT:-5000}

# Auth URL: prefer APP_URL, then CUSTOM_DOMAIN, then REPLIT_DOMAINS, for correct redirects
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

MONGO_DATA="/home/runner/.mongodb-data/data"
MONGO_LOG="/home/runner/.mongodb-data/mongod.log"
mkdir -p "$MONGO_DATA"

if ! pgrep -x "mongod" > /dev/null; then
  mongod --dbpath "$MONGO_DATA" \
    --logpath "$MONGO_LOG" \
    --fork --quiet
  echo "MongoDB started"
  sleep 2
else
  echo "MongoDB already running"
fi

echo "Running auto-seed check..."
node src/scripts/auto-seed.mjs

if [ "$PROVISION_BOOTSTRAP_ACCOUNTS" = "true" ]; then
  echo "Provisioning bootstrap auth accounts..."
  node src/scripts/provision-bootstrap-accounts.mjs
fi

pkill -f "next dev" 2>/dev/null || true
sleep 1
rm -rf .next
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=3072"

echo "Starting dev server..."
exec npm run dev:5000
