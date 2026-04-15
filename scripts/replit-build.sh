#!/bin/bash
set -e

# Replit can retain stale Next build artifacts across pulls/deploys.
# Always rebuild from a clean .next directory to avoid mixed chunk/CSS output.
rm -rf .next
npm run build
