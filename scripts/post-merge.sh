#!/bin/bash
set -e

npm install --prefer-offline --legacy-peer-deps --no-audit --no-fund 2>/dev/null || true

# Signal that a rebuild is needed on next workflow restart.
# Only delete the BUILD_ID marker — NOT the entire .next directory.
# start.sh checks for this file and rebuilds when it's missing.
rm -f .next/BUILD_ID 2>/dev/null || true
