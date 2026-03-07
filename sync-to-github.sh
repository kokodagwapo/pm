#!/bin/bash
# ─────────────────────────────────────────────────────────────
# sync-to-github.sh
# Force-push the current Replit state to GitHub.
# Overwrites GitHub with whatever is in Replit right now.
# ─────────────────────────────────────────────────────────────
set -e

echo "→ Aborting any in-progress merge or rebase..."
git merge --abort 2>/dev/null || true
git rebase --abort 2>/dev/null || true

echo "→ Removing index lock if present..."
rm -f .git/index.lock

echo "→ Staging all current files..."
git add -A

echo "→ Committing (if anything is new)..."
git commit -m "chore: sync Replit → GitHub" 2>/dev/null || echo "  (nothing new to commit)"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "→ Force-pushing branch '$BRANCH' to GitHub..."
git push origin "$BRANCH" --force

echo ""
echo "✓ Done — GitHub is now in sync with Replit."
