# PropertyPro

A Next.js 15 property management application using the App Router (`src/app/`).

## Stack
- **Framework**: Next.js 15.5.9 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with Radix UI components
- **Database**: MongoDB via Mongoose (local via Nix)
- **Auth**: NextAuth v5 (beta) with MongoDB adapter
- **Payments**: Stripe
- **Storage**: Cloudflare R2 / AWS S3
- **AI**: OpenAI
- **Package Manager**: npm

## Project Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components
- `src/lib/` - Utility libraries
- `src/models/` - Mongoose models
- `src/hooks/` - Custom React hooks
- `src/stores/` - Zustand state stores
- `src/middleware/` - Custom middleware (audit)
- `src/scripts/` - Seed and data management scripts
- `data/` - DB snapshots and static seed data (`vms-properties.json`)
- `src/styles/` - Global styles
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions
- `src/templates/` - Email/notification templates
- `src/locales/` - i18n translations

## Running (Replit)
- Workflow: `bash start.sh` — starts local MongoDB, runs auto-seed, then `next dev` on port 5000
- Dev: `npm run dev` (port 5000, bound to 0.0.0.0)
- Build: `npm run build`
- Start: `npm run start` (port 5000, bound to 0.0.0.0)

## Replit-Specific Configuration
- **MongoDB**: Running locally via Nix (mongodb 7.0), data at `.mongodb/data/`
- **start.sh**: Starts `mongod` (background) → runs `src/scripts/auto-seed.mjs` → then `npm run dev`
- **Auto-seed**: `src/scripts/auto-seed.mjs` checks if properties/users collections are empty; if so, seeds 33 VMS Florida properties from `data/vms-properties.json` and 4 demo accounts. Safe for production — skips seeding if data already exists.
- **Port/Host**: 5000 / 0.0.0.0 (set in `package.json` dev script)
- **allowedDevOrigins**: `next.config.ts` reads `REPLIT_DEV_DOMAIN`/`REPLIT_DOMAINS` env vars and adds wildcard `*.replit.dev` patterns
- **NODE_OPTIONS**: `--max-old-space-size=3072` for build memory
- **MONGODB_URI secret quirk**: Secret value may be stored as `MONGODB_URI=mongodb://...` (with key prefix). Both `src/lib/mongodb.ts` and `src/lib/auth.ts` strip this prefix automatically.

## Property Data
- **Source**: 33 real properties scraped from vms-florida.com/advanced-search
- **Neighborhoods**: Falling Waters (20), Winter Park (4), World Tennis Club (3), and 6 others
- **Data file**: `data/vms-properties.json` (committed, used by auto-seed)
- **Scrape script**: `src/scripts/scrape-vms-florida.mjs` (re-run to refresh data)
- **Import script**: `src/scripts/import-vms-properties.mjs` (manual full re-import)
- **Image domain**: `vms-florida.com` is allowed in `next.config.ts` `remotePatterns`

## Demo Accounts (seeded into local MongoDB)
| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Admin   | hi@smartstart.us         | SmartStart2025 |
| Manager | manager@smartstart.us    | SmartStart2025 |
| Owner   | owner@smartstart.us      | SmartStart2025 |
| Tenant  | tenant@smartstart.us     | SmartStart2025 |

## Quick Login
The sign-in page (`/auth/signin`) always shows "Dev Quick Login" buttons for all 4 roles — no environment check, always visible.

## Required Environment Variables (Replit Secrets)
- `MONGODB_URI` - MongoDB connection string (e.g. `mongodb://localhost:27017/SmartStartPM`)
- `AUTH_SECRET` - NextAuth secret (required for session signing)
- `NEXTAUTH_URL` - NextAuth base URL (e.g. `https://<replit-domain>`)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe (optional at build time)
- `OPENAI_API_KEY`, `OPENAI_MODEL` - OpenAI
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL` - Cloudflare R2
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` - AWS S3
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth

## Deployment / Build Notes
- **Stripe lazy init**: All `new Stripe(...)` calls are lazy — only run inside route handlers, never at module load time.
- **environment.ts**: Stripe and Publishable key fields are `.optional()` in the Zod schema.
- **NEXTAUTH_SECRET vs AUTH_SECRET**: NextAuth v5 uses `AUTH_SECRET`. The env schema validates `NEXTAUTH_SECRET` but this is not required.
- **Production seeding**: `start.sh` runs `auto-seed.mjs` on every start. In a fresh deployment container with empty MongoDB, this auto-seeds 33 properties + 4 demo users. In an existing deployment, it skips (collections already populated).
