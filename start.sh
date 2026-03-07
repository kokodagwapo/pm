#!/bin/bash
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

if [ ! -f ".next/prerender-manifest.json" ] || [ "$FORCE_BUILD" = "1" ]; then
  echo "Building application..."
  npm run build
else
  echo "Using existing build (set FORCE_BUILD=1 to rebuild)"
fi

echo "Starting production server..."
exec npm run start
