#!/bin/bash
# Optional: Next dev with HMR. On Replit this often crashes (filesystem + memory).
# Prefer the Run button workflow → start.sh (production) for a stable preview.
echo "Tip: On Replit use Run → start.sh (production). Dev + HMR is unstable in the cloud IDE."
MONGO_DATA="/home/runner/.mongodb-data/data"
MONGO_LOG="/home/runner/.mongodb-data/mongod.log"
mkdir -p "$MONGO_DATA"

if ! pgrep -x "mongod" > /dev/null; then
  mongod --dbpath "$MONGO_DATA" --logpath "$MONGO_LOG" --fork --quiet
  echo "MongoDB started"
  sleep 2
else
  echo "MongoDB already running"
fi

node src/scripts/auto-seed.mjs

pkill -f "next dev" 2>/dev/null || true
sleep 1
rm -rf .next
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=3072"
exec npm run dev
