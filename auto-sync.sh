#!/bin/bash
# ─────────────────────────────────────────────────────────────
# auto-sync.sh
# Periodically pulls from GitHub and runs sync-to-github.sh
# ─────────────────────────────────────────────────────────────

INTERVAL=60 # seconds

echo "🚀 Starting auto-sync every $INTERVAL seconds..."

while true; do
  echo "--- $(date) ---"
  
  # Try to pull latest changes (be careful with rebase/merge)
  echo "→ Pulling from GitHub..."
  git pull origin main --no-rebase || echo "  (pull failed - possibly divergent, sync-to-github will force resolve)"
  
  # Run the exist sync script to commit and force-push
  echo "→ Running sync-to-github.sh..."
  ./sync-to-github.sh
  
  echo "→ Sleeping for $INTERVAL seconds..."
  sleep $INTERVAL
done
