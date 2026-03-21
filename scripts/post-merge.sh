#!/bin/bash
set -e

npm install --prefer-offline --legacy-peer-deps --no-audit --no-fund 2>/dev/null || true

# WARNING: Do NOT add `rm -rf .next` here. This script runs while the dev
# server is still serving. Deleting .next mid-session causes permanent 500
# errors (ENOENT on routes-manifest.json). The .next cleanup is handled by
# dev.sh which runs it before starting the server.
