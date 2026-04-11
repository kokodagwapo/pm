#!/bin/bash
# Optional: Next dev with HMR. On Replit, `start.sh` defaults to `next start` (stable).
# Set REPLIT_DEV_SERVER=1 and use this script if you need webpack dev + HMR.
set -e
echo "Tip: On Replit the Run button uses start.sh → next build (if needed) → next start."
echo "For dev + HMR here: ensure REPLIT_DEV_SERVER=1 and use npm run dev:5000, or run this script."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/replit-mongo.sh
source "$SCRIPT_DIR/scripts/replit-mongo.sh"

replit_start_local_mongo_if_needed

node src/scripts/auto-seed.mjs

pkill -f "next dev" 2>/dev/null || true
sleep 1
rm -rf .next
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=3072"
exec npm run dev
