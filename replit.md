# smartPM

A Next.js 15 property management application using the App Router (`src/app/`).

## Internationalization (i18n)
- **9 languages supported**: English (en), German (de), Spanish (es), French (fr), Italian (it), Chinese Simplified (zh), Japanese (ja), Filipino (fil), Russian (ru)
- **LanguageSwitcher component**: `src/components/ui/LanguageSwitcher.tsx` — dropdown with flag emojis and native labels; `variant="light"|"dark"` prop; integrated into `LandingHeader` and the sign-in page
- **Translation files**: `src/locales/{lang}/*.json` — each language has `common.json`, `auth.json`, `tour.json`, `dashboard.json`, `settings.json`, `properties.json`, `tenants.json`, `leases.json`, `maintenance.json`, `payments.json`, `analytics.json`, `messages.json`, `calendar.json`, `admin.json`
- **Catalog registration**: `src/locales/index.ts` — merges all JSON files per language into the `translations` map used by `LocalizationProvider`
- **Localization service**: `src/lib/services/localization.service.ts` — LOCALES map includes all 9 languages including `fil-PH`
- **Translated pages**: Home `/` (new landing page), Dashboard (full), Sign-in (full), Rentals (key UI strings); all pages fallback to English for missing keys
- **LanguageSwitcher placement**: LandingHeader top bar (all landing pages incl. `/`), LandingHeader mobile dropdown menu, Dashboard `MobileHeader` (top bar, light variant), AdminTourWidget panel header (dark variant), Sign-in page (fixed overlay)
- **Provider scope**: `LocalizationProvider` wraps the entire app via `src/components/providers/index.tsx`

## Design System — Modern Minimalist (March 2026)
- **Color palette**: Neutral zinc scale (background `#fafafa`, foreground `#18181b`, borders `#e4e4e7`). Primary indigo (`#4f46e5`). Dark mode uses `#09090b` / `#fafafa` / `#27272a` zinc tones.
- **Typography**: Light/normal weight headings (font-light for hero, font-medium for section labels), no bold/extrabold. 11px uppercase tracking labels for metadata.
- **Cards**: `rounded-xl border border-border shadow-sm` — flat, clean, no glassmorphism in dashboard. Hover: `shadow-md`.
- **Sidebar**: White background, `w-60`, clean border. Active nav uses `text-primary bg-primary/8 font-medium`. Muted-foreground for inactive items.
- **Dashboard**: Emoji-free section headers. Lighter greeting (font-light). KPI cards with compact padding. Charts in bordered cards.
- **Landing page**: Preserved cinematic dark aesthetic with video background, ultra-thin typography (weight 100-300).
- **Plus Jakarta Sans**: Applied to dashboard layout via `--font-jakarta`.
- **FlickeringGridBackground**: Removed from dashboard layout for cleaner appearance.

## Dev Server Stability (Replit-specific)
- **Turbopack disabled**: The `--turbopack` flag was removed from the Replit dev scripts (`dev`, `dev:5000`) because Turbopack's file watcher is incompatible with Replit's cloud filesystem, causing an infinite Fast Refresh loop. Only `dev:local` uses `--turbopack` (for local Cursor development).
- **File watcher disabled**: Webpack's file watcher is set to `ignored: /.*/` in `next.config.ts` because Replit's filesystem sends phantom inotify events (no actual file changes) that trigger constant recompiles and break the preview iframe. After code changes, restart the workflow to pick them up.
- **Do NOT re-add `--turbopack`** to Replit-facing scripts or remove the `ignored: /.*/` watchOption — it will reintroduce the refresh loop on Replit.
- **Watcher is Replit-only**: The `ignored: /.*/` watchOption is gated behind `process.env.REPLIT_DEV_DOMAIN`, so local development (Cursor) gets normal Turbopack HMR.
- **`.next` cache cleanup**: `dev.sh` runs `rm -rf .next` before starting Next.js to ensure a fresh build. Do NOT put `rm -rf .next` in `scripts/post-merge.sh` — that script runs while the dev server is still serving, and deleting `.next` mid-session causes permanent 500 errors (the server can't recover because the watcher is disabled).
- **SSR hydration safety**: All providers (`DashboardAppearanceProvider`, `LocalizationProvider`, `localization.service.ts`) use stable SSR-safe defaults ("immersive", "en-US", "USD") in initial state. Client-side localStorage values are applied only in `useEffect` after hydration.
- **React Strict Mode disabled**: `reactStrictMode: false` in `next.config.ts` to prevent double-mounting of components in dev mode, which exacerbates hydration issues on Replit.
- **Auto-recovering error boundaries**: `global-error.tsx` and `error.tsx` detect hydration-related errors and auto-retry via `reset()` after 200ms. This prevents blank-page crashes from Fast Refresh module updates during initial page compilation.
- **Production build limitation**: The production build (`next build`) requires more memory than Replit's container provides (~1.5GB available). The app runs in dev mode on Replit; use `start.sh` with `BUILD_ID` check for local/Docker production builds.

## Local Development (Cursor + Docker)
- **Docker**: `docker-compose.dev.yml` runs MongoDB 7 on port 27017
- **Env vars**: Copy `.env.local.example` to `.env.local` and fill in values
- **Quick start**: `npm run setup:local` (starts Docker MongoDB + seeds data), then `npm run dev:local` (Turbopack on port 3000)
- **Scripts**: `npm run docker:up`, `docker:down`, `docker:logs` for container management
- **Production Docker**: `docker compose up` uses the full `docker-compose.yml` with Dockerfile to build and run app + MongoDB together

## Stack
- **Framework**: Next.js 15.5.12 (App Router)
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
- Workflow: `bash dev.sh` — starts local MongoDB, runs auto-seed, cleans `.next`, then `next dev` (webpack, no Turbopack) on port 5000
- Dev: `npm run dev` (port 5000, webpack mode — for Replit workflow)
- Dev local: `npm run dev:local` (port 3000, Turbopack — for local Cursor development)
- Build: `npm run build`
- Start: `npm run start` (port 5000, bound to 0.0.0.0)

## Replit-Specific Configuration
- **MongoDB**: Running locally via Nix (mongodb 7.0), data at `/home/runner/.mongodb-data/data/` (outside project root to avoid file-watcher loops)
- **start.sh**: Starts `mongod` (background) → runs `src/scripts/auto-seed.mjs` → `npm run build` → `npm run start`
- **start-prod.sh**: Production start script for Reserved VM deployment — starts local mongod, runs auto-seed, then `npm run start`. Build is handled separately by deployment build step (`npm run build`).
- **Auto-seed**: `src/scripts/auto-seed.mjs` checks if properties/users collections are empty; if so, seeds 33 VMS Florida properties from `data/vms-properties.json` and 4 demo accounts. Safe for production — skips seeding if data already exists.
- **Port/Host**: 5000 / 0.0.0.0 (set in `package.json` dev script)
- **allowedDevOrigins**: `next.config.ts` reads `REPLIT_DEV_DOMAIN`/`REPLIT_DOMAINS` env vars and adds wildcard `*.replit.dev` patterns
- **NODE_OPTIONS**: `--max-old-space-size=3072` for build memory
- **MONGODB_URI secret quirk**: Secret value may be stored as `MONGODB_URI=mongodb://...` (with key prefix). Both `src/lib/mongodb.ts` and `src/lib/auth.ts` strip this prefix automatically.
- **next/image**: ALL `next/image` `<Image>` usage replaced with plain `<img>` tags to avoid Turbopack HMR stale module errors. Do NOT re-introduce `import Image from "next/image"` anywhere.
- **Error logging**: Dashboard error boundary sends errors to `/api/log-error` for server-side logging (visible in workflow logs).

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
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - Twilio SMS (optional — gracefully skipped if missing)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL` - Cloudflare R2
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` - AWS S3
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth

## Availability Calendar, Date Blocking & Dynamic Pricing

### Models
- **DateBlock** (`src/models/DateBlock.ts`): Blocked date ranges per unit with type (owner_stay, maintenance, hold, renovation, personal, seasonal_closure), hard/soft block, recurring support, and role-based access control
- **PricingRule** (`src/models/PricingRule.ts`): Pricing overrides per unit supporting daily override, weekend/weekday, seasonal, holiday, last-minute, long-term discount, and early-bird discount rule types
- **RentalRequest** (`src/models/RentalRequest.ts`): Tenant rental requests with auto-calculated pricing, discount breakdown, 7-day TTL auto-expiry, and full approval workflow

### Services
- **Pricing Service** (`src/lib/services/pricing.service.ts`): Calculates effective nightly rate by rule priority (daily override > holiday > seasonal > weekend/weekday > base rent), applies advance booking and long-term discounts, returns full breakdown

### API Routes
- `GET/POST/DELETE /api/properties/[id]/units/[unitId]/blocks` — Unit-level date block CRUD
- `GET/POST /api/properties/[id]/blocks` — Property-level blocks (bulk operations)
- `GET/POST/PUT/DELETE /api/properties/[id]/units/[unitId]/pricing-rules` — Pricing rule CRUD
- `POST /api/pricing/calculate` — Calculate price for date range with full breakdown
- `GET/POST /api/rental-requests` — List/create rental requests
- `GET/PATCH/DELETE /api/rental-requests/[id]` — Rental request details/approve/reject/cancel

### UI Components
- `src/components/calendar/AvailabilityCalendar.tsx` — 2-month navigable calendar with color-coded days, drag-to-select, tooltips, read-only mode
- `src/components/calendar/DateBlockForm.tsx` — Block creation form with type, reason, recurring, hard/soft toggle
- `src/components/calendar/PricingRuleForm.tsx` — Rule creation form with type-specific fields, discount tiers, live preview

### Dashboard Pages
- `/dashboard/properties/[id]/calendar` — Property-level calendar management (blocks, pricing rules, bulk ops)
- `/dashboard/properties/[id]/units/[unitId]/calendar` — Unit-specific calendar management
- `/dashboard/rental-requests` — Admin/manager/owner rental request management (approve/reject)
- `/dashboard/rentals/request` — Tenant rental request creation with availability + pricing
- `/dashboard/rentals/my-requests` — Tenant's request history and status

### Public Pages
- `/rentals` — Luxury Florida aesthetic: cream `bg-[#f8f7f4]` background, rounded-full filter bar, Playfair Display property names, amber neighborhood tags. Split layout with interactive Leaflet map (**CartoDB Positron tiles**, 3D pastel price markers: mint <$3k / sky $3k–$5k / violet $5k–$8k / coral >$8k) + `PropertyListCard` / `PropertyFeaturedCard`. Filter chips: All/neighborhoods/Saved (badge count). **Heart/save** (localStorage), **compare** (GitCompare), **floating comparison bar**, **CompareModal** side-by-side table.
- `/properties/[id]` — Luxury Florida detail page: cream background, Playfair Display headings, sticky nav with `bg-white/95 backdrop-blur-md` and slate-900 underline. Photo gallery grid, section tabs (Overview/Pricing/Amenities/Availability/Reviews/Map). Availability uses `AvailabilityCalendar` (drag-to-select dates), real-time pricing via `/api/pricing/calculate-public`. **Sidebar booking widget**: large Playfair price, date grid, live pricing breakdown (rate×nights, discounts, total), **Quick Facts** pastel icon tiles (violet/sky/rose/amber/emerald/orange), slate-900 CTAs. **Booking Summary dark header** (slate-900 + amber DollarSign), "Request this Rental" slate-900 button. Collapsible coupon input (WELCOME10/SUMMER25), guest inquiry form, inquiry success → "Apply Now" prompt, **4-step rental application modal**. **Guest Reviews** with star ratings + submit form. **Virtual Tour** iframe (YouTube/Matterport). **SinglePropertyMap** component (CartoDB Positron, teardrop marker, popup, Google Maps link). Luna AI floating chat (LunaWidget) with voice TTS. Heart/save in sticky nav, share button (native share API).

*Virtual Tour tab only appears if `virtualTourUrl` is set on the property

### Role Hierarchy
- **Admin/Manager**: Full access — block any unit, override owner blocks, manage all pricing rules, approve/reject all requests
- **Owner**: Block own properties, manage pricing on own units, approve/reject requests for own properties
- **Tenant**: View availability, submit rental requests, cancel own pending requests

### Permissions Added
- `calendar_manage`, `pricing_manage`, `date_block_manage`, `rental_request_view`, `rental_request_manage`

## Deployment / Build Notes
- **Deployment type**: Reserved VM (`deploymentTarget = "vm"` in `.replit`). Build: `npm run build`. Run: `bash start-prod.sh`.
- **MongoDB in deployment**: Reserved VM runs local mongod (same as dev). `start-prod.sh` starts mongod, seeds, then starts Next.js.
- **NEXTAUTH_URL**: Set as development-only env var (dev domain). In production, Auth.js v5 auto-detects from request headers (`trustHost: true`). The `NEXTAUTH_URL` secret serves as fallback.
- **Stripe lazy init**: All `new Stripe(...)` calls are lazy — only run inside route handlers, never at module load time.
- **environment.ts**: Stripe and Publishable key fields are `.optional()` in the Zod schema.
- **NEXTAUTH_SECRET vs AUTH_SECRET**: NextAuth v5 uses `AUTH_SECRET`. The env schema validates `NEXTAUTH_SECRET` but this is not required.
- **Production seeding**: Both `start.sh` and `start-prod.sh` run `auto-seed.mjs` on every start. In a fresh deployment with empty MongoDB, this auto-seeds 33 properties + 4 demo users. In an existing deployment, it skips (collections already populated).
