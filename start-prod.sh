#!/bin/bash
# Replit Deployments / reserved VM — same as start.sh but explicit name for .replit deployment run.
set -e
export PORT="${PORT:-5000}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/replit-mongo.sh
source "$SCRIPT_DIR/scripts/replit-mongo.sh"

# Auth base URL: prefer APP_URL, then CUSTOM_DOMAIN, then a custom domain from
# REPLIT_DOMAINS. Replit may list both the internal *.replit.* hostname and a
# custom domain, and the custom domain must win for auth/session cookies.
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
  echo "Auth URL set from app base URL: https://${BASE}"
elif [ -n "$REPLIT_DOMAINS" ]; then
  PUBLIC_DOMAIN="$(pick_public_domain)"
  export NEXTAUTH_URL="https://${PUBLIC_DOMAIN}"
  export AUTH_URL="https://${PUBLIC_DOMAIN}"
  export NEXT_PUBLIC_APP_URL="https://${PUBLIC_DOMAIN}"
  echo "Auth URL set from REPLIT_DOMAINS: https://${PUBLIC_DOMAIN}"
else
  echo "Warning: APP_URL/CUSTOM_DOMAIN not set. Production may use the wrong origin for auth or public links."
fi

replit_start_local_mongo_if_needed

echo "Running auto-seed check..."
node src/scripts/auto-seed.mjs

if [ "$PROVISION_BOOTSTRAP_ACCOUNTS" = "true" ]; then
  echo "Provisioning bootstrap auth accounts..."
  node src/scripts/provision-bootstrap-accounts.mjs
fi

if [ -d .next ] && [ ! -f .next/BUILD_ID ]; then
  echo "Stale/incomplete .next directory detected (no BUILD_ID) — removing it before startup."
  rm -rf .next
fi

if [ ! -f .next/BUILD_ID ]; then
  echo "No production build found — running clean Replit build..."
  bash scripts/replit-build.sh
fi

echo "Starting production server on port $PORT..."
exec npm run start
