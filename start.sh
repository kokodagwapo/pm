#!/bin/bash
mkdir -p /home/runner/workspace/.mongodb/data

if ! pgrep -x "mongod" > /dev/null; then
  mongod --dbpath /home/runner/workspace/.mongodb/data \
    --logpath /home/runner/workspace/.mongodb/mongod.log \
    --fork --quiet
  echo "MongoDB started"
  sleep 2
else
  echo "MongoDB already running"
fi

echo "Running auto-seed check..."
node src/scripts/auto-seed.mjs

exec npm run dev
