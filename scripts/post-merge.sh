#!/bin/bash
set -e

npm install --prefer-offline --legacy-peer-deps --no-audit --no-fund 2>/dev/null || true

# After a Git pull on Replit, stale client chunks are the main source of
# "options.factory" / "reading 'call'" runtime crashes. Remove the whole
# build output so the next start does a completely clean rebuild.
rm -rf .next 2>/dev/null || true
