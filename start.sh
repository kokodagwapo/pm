#!/bin/bash
# Replit "Run" workflow: stable preview using `next start` (no HMR) unless REPLIT_DEV_SERVER=1.
set -e
export PORT="${PORT:-5000}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/replit-mongo.sh
source "$SCRIPT_DIR/scripts/replit-mongo.sh"

# Auth URL: prefer APP_URL, then CUSTOM_DOMAIN, then a custom domain from
# REPLIT_DOMAINS. Replit may expose both the internal *.replit.* hostname and a
# custom domain; auth should use the custom hostname when present.
pick_public_domain() {
  local first_domain=""
  IFS=',' read -ra domains <<< "${REPLIT_DOMAINS:-}"
  for raw_domain in "${domains[@]}"; do
    domain="$(echo "$raw_domain" | tr -d ' ')"
    if [ -z "$domain" ]; then
      continue
    fi
    if [ -z "$first_domain" ]; then
      first_domain="$domain"
    fi
    case "$domain" in
      *.replit.app|*.replit.dev)
        ;;
      *)
        echo "$domain"
        return 0
        ;;
    esac
  done
  if [ -n "$first_domain" ]; then
    echo "$first_domain"
  fi
}

APP_BASE_URL="${APP_URL:-$CUSTOM_DOMAIN}"
if [ -n "$APP_BASE_URL" ]; then
  BASE="${APP_BASE_URL#https://}"
  BASE="${BASE#http://}"
  export NEXTAUTH_URL="https://${BASE}"
  export AUTH_URL="https://${BASE}"
  export NEXT_PUBLIC_APP_URL="https://${BASE}"
elif [ -n "$REPLIT_DOMAINS" ]; then
  PUBLIC_DOMAIN="$(pick_public_domain)"
  export NEXTAUTH_URL="https://${PUBLIC_DOMAIN}"
  export AUTH_URL="https://${PUBLIC_DOMAIN}"
  export NEXT_PUBLIC_APP_URL="https://${PUBLIC_DOMAIN}"
fi

replit_start_local_mongo_if_needed

echo "Running auto-seed check..."
node src/scripts/auto-seed.mjs

if [ "$PROVISION_BOOTSTRAP_ACCOUNTS" = "true" ]; then
  echo "Provisioning bootstrap auth accounts..."
  node src/scripts/provision-bootstrap-accounts.mjs
fi

pkill -f "next dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 1

export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=3072"

if [ "${REPLIT_DEV_SERVER:-0}" = "1" ]; then
  echo "REPLIT_DEV_SERVER=1 — starting Next dev on port $PORT."
  rm -rf .next
  exec npm run dev:5000
fi

if [ -d .next ] && [ ! -f .next/BUILD_ID ]; then
  echo "Stale/incomplete .next directory detected (no BUILD_ID) — removing it to avoid crash loop."
  rm -rf .next
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "No .next build found — running clean Replit build..."
  bash scripts/replit-build.sh
fi

echo "Starting production server on port $PORT (next start)..."
exec npm run start
