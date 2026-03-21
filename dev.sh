#!/bin/bash
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

# Replit workflow waits on externalPort 5000 (.replit waitForPort = 5000)
exec npm run dev:5000
