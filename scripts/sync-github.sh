#!/bin/bash
# Sync all local changes to GitHub: add, commit, pull --rebase, push.
# Usage: ./scripts/sync-github.sh [commit message]
#        npm run sync
#        npm run sync -- "your commit message"
set -e

cd "$(dirname "$0")/.."
MSG="${1:-Sync: latest changes}"

git add -A
if git diff --staged --quiet; then
  echo "Nothing to commit. Working tree clean."
else
  git commit -m "$MSG"
fi
git pull --rebase
git push
echo "Done. GitHub is in sync."
