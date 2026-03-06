# PropertyPro

A Next.js 15 property management application using the App Router (`src/app/`).

## Stack
- **Framework**: Next.js 15.5.9 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with Radix UI components
- **Database**: MongoDB via Mongoose
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
- `data/` - DB snapshots (`snapshot.json`) produced by `export:data`
- `src/styles/` - Global styles
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions
- `src/templates/` - Email/notification templates
- `src/locales/` - i18n translations

## Running (Replit)
- Workflow: `bash start.sh` — starts local MongoDB, then `next dev` on port 5000
- Dev: `npm run dev` (port 5000, bound to 0.0.0.0)
- Build: `npm run build`
- Start: `npm run start` (port 5000, bound to 0.0.0.0)
- Seed demo accounts: `npm run seed:demo`
- Seed 35 Naples properties: `npm run seed:35`
- Export DB to `data/snapshot.json`: `npm run export:data`
- Restore from snapshot: `npm run import:data`
- Seed everything: `npm run seed:all` (demo → 35 properties → pricing → faq → owners)

## Replit-Specific Configuration
- **MongoDB**: Running locally via Nix (mongodb 7.0), data at `.mongodb/data/`
- **start.sh**: Starts `mongod` (background) then `npm run dev`
- **Port/Host**: 5000 / 0.0.0.0 (set in `package.json` dev script)
- **allowedDevOrigins**: `next.config.ts` reads `REPLIT_DEV_DOMAIN`/`REPLIT_DOMAINS` env vars and adds wildcard `*.replit.dev` patterns
- **NODE_OPTIONS**: `--max-old-space-size=3072` for build memory
- **MONGODB_URI secret quirk**: Secret value may be stored as `MONGODB_URI=mongodb://...` (with key prefix). Both `src/lib/mongodb.ts` and `src/lib/auth.ts` strip this prefix automatically.

## Demo Accounts (seeded into local MongoDB)
| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Admin   | hi@smartstart.us         | SmartStart2025 |
| Manager | manager@smartstart.us    | SmartStart2025 |
| Owner   | owner@smartstart.us      | SmartStart2025 |
| Tenant  | tenant@smartstart.us     | SmartStart2025 |

## Required Environment Variables (Replit Secrets)
- `MONGODB_URI` - MongoDB connection string (e.g. `mongodb://localhost:27017/SmartStartPM`)
- `AUTH_SECRET` - NextAuth secret (required for session signing)
- `NEXTAUTH_URL` - NextAuth base URL (e.g. `https://<replit-domain>`)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe (optional at build time — app builds without them)
- `OPENAI_API_KEY`, `OPENAI_MODEL` - OpenAI
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL` - Cloudflare R2
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` - AWS S3
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth

## Deployment / Build Notes
- **Stripe lazy init**: All `new Stripe(...)` calls are now lazy — only run inside route handlers, never at module load time. This prevents build failures when secrets aren't available during the "Collecting page data" phase.
  - Fixed files: `src/lib/stripe.ts`, `src/lib/services/core-payment.service.ts`, `src/lib/services/stripe-payment.service.ts`, `src/app/api/stripe/webhook/route.ts`, and all Stripe API routes.
- **environment.ts**: Stripe and Publishable key fields are now `.optional()` in the Zod schema. Missing keys log a warning instead of calling `process.exit(1)`.
- **NEXTAUTH_SECRET vs AUTH_SECRET**: NextAuth v5 uses `AUTH_SECRET`. The env schema validates `NEXTAUTH_SECRET` but this is not required for the app to function (auth.ts uses `AUTH_SECRET` directly).
