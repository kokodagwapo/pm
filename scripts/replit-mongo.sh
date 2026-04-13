#!/usr/bin/env bash
# Shared by start.sh and start-prod.sh on Replit: local mongod only when using localhost URI.

_raw="${MONGODB_URI:-mongodb://localhost:27017/SmartStartPM}"
if [[ "$_raw" == MONGODB_URI=* ]]; then
  _raw="${_raw#MONGODB_URI=}"
fi
export MONGODB_URI="$_raw"

replit_should_start_local_mongo() {
  case "${MONGODB_URI}" in
  mongodb://localhost* | mongodb://127.0.0.1*) return 0 ;;
  *) return 1 ;;
  esac
}

replit_start_local_mongo_if_needed() {
  if ! replit_should_start_local_mongo; then
    echo "MONGODB_URI points to a remote host; skipping local mongod."
    return 0
  fi

  local MONGO_DATA="/home/runner/.mongodb-data/data"
  local MONGO_LOG="/home/runner/.mongodb-data/mongod.log"
  mkdir -p "$MONGO_DATA"

  if ! pgrep -x "mongod" >/dev/null; then
    mongod --dbpath "$MONGO_DATA" \
      --logpath "$MONGO_LOG" \
      --fork --quiet
    echo "MongoDB started (local)"
    sleep 2
  else
    echo "MongoDB already running"
  fi
}
