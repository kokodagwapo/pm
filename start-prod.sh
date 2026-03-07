#!/bin/bash
export PORT=${PORT:-5000}
export MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/SmartStartPM}"

if [ -n "$REPLIT_DOMAINS" ]; then
  FIRST_DOMAIN=$(echo "$REPLIT_DOMAINS" | cut -d',' -f1)
  export NEXTAUTH_URL="https://${FIRST_DOMAIN}"
  export AUTH_URL="https://${FIRST_DOMAIN}"
  echo "Auth URL set to: https://${FIRST_DOMAIN}"
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

echo "Starting production server on port $PORT..."
exec npm run start
