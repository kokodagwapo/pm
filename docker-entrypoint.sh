#!/bin/sh
set -e

# Create super admin and demo accounts (idempotent: replaces existing demo users)
echo "Seeding demo accounts..."
npm run seed:demo || true

exec node node_modules/next/dist/bin/next start
