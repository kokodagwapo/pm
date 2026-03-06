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

exec npm run dev
