#!/bin/bash
export PORT=${PORT:-5000}
export MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/SmartStartPM}"

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

echo "Starting production server on port $PORT..."
exec npm run start
