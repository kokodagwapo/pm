#!/bin/bash
MONGO_DATA="/home/runner/.mongodb-data/data"
MONGO_LOG="/home/runner/.mongodb-data/mongod.log"
mkdir -p "$MONGO_DATA"

if ! pgrep -x "mongod" > /dev/null; then
  mongod --dbpath "$MONGO_DATA" \
    --logpath "$MONGO_LOG" \
    --fork --quiet
  echo "MongoDB started"
  sleep 3
else
  echo "MongoDB already running"
fi

echo "Running auto-seed check..."
node src/scripts/auto-seed.mjs

exec npm run start
