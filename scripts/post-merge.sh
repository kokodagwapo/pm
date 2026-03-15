#!/bin/bash
set -e

npm install --legacy-peer-deps --no-audit --no-fund 2>/dev/null || true

rm -rf .next
