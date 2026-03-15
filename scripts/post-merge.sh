#!/bin/bash
set -e

npm install --prefer-offline --legacy-peer-deps --no-audit --no-fund 2>/dev/null || true

rm -rf .next
