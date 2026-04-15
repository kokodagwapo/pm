#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

git fetch origin main

# Stage app/source changes while intentionally excluding local cache folders.
git add \
  "public/images/heidi-avatar.png" \
  "src/app" \
  "src/components" \
  "src/lib" \
  "src/locales" \
  "src/models" \
  "src/scripts/ingest-vms-knowledge.ts" \
  "force-push-origin-main.sh"

git commit -m "$(cat <<'EOF'
Add Heidi voice assistant upgrades and booking discount controls.

Keep Heidi persistent across navigation, improve multilingual voice/chat behavior, and add configurable long-stay discount settings with updated rentals and property pricing UX.
EOF
)"

git push --force-with-lease origin main
