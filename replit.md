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
- **Sidebar**: Dashboard rail uses glass styling (`dashboard-ui-surface`); expanded width is `15rem` (`md:w-60`). Collapsed state is a narrow icon rail (~56px) via `SidebarCollapseProvider` + layout wrapper sizing — client-only state, no env or Replit script changes required.
- **Dashboard**: Emoji-free section headers. Lighter greeting (font-light). KPI cards with compact padding. Charts in bordered cards.
- **Landing page**: Preserved cinematic dark aesthetic with video background, ultra-thin typography (weight 100-300).
- **Plus Jakarta Sans**: Applied to dashboard layout via `--font-jakarta`.
- **FlickeringGridBackground**: Removed from dashboard layout for cleaner appearance.

## Dev Server Stability (Replit-specific)
- **Run button uses production**: The `Project` workflow in `.replit` runs `bash start.sh` → `npm run build` (if needed) → `npm run start` on port 5000 for a stable webview (no HMR). Use `bash dev.sh` only when you need webpack dev; restart after edits on Replit.
- **Turbopack disabled**: Replit-facing scripts (`dev`, `dev:5000`) do not use Turbopack. `dev:local` uses webpack on port 3000 for Cursor/local development.
- **File watcher on Replit dev**: `next.config.ts` sets `watchOptions.ignored: /.*/` when `REPLIT_DEV_DOMAIN` or `REPL_ID` is set so phantom FS events do not spin the dev server. Local development without those env vars gets normal webpack HMR.
- **Do NOT re-add `--turbopack`** to Replit-facing scripts or remove the `ignored: /.*/` watchOption on Replit without testing — it can reintroduce refresh loops.
- **`.next` cache cleanup**: `dev.sh` runs `rm -rf .next` before starting Next.js to ensure a fresh build. Do NOT put `rm -rf .next` in `scripts/post-merge.sh` — that script runs while the dev server is still serving, and deleting `.next` mid-session causes permanent 500 errors (the server can't recover because the watcher is disabled).
- **SSR hydration safety**: All providers (`DashboardAppearanceProvider`, `LocalizationProvider`, `localization.service.ts`) use stable SSR-safe defaults ("immersive", "en-US", "USD") in initial state. Client-side localStorage values are applied only in `useEffect` after hydration.
- **React Strict Mode disabled**: `reactStrictMode: false` in `next.config.ts` to prevent double-mounting of components in dev mode, which exacerbates hydration issues on Replit.
- **Auto-recovering error boundaries**: `global-error.tsx` and `error.tsx` detect transient dev errors (webpack chunk loading, hydration, invalid hook calls, dynamic import / chunk failures) and auto-retry via `reset()` with 500ms×attempt backoff. **Retry counts use module-level state** (not `useRef`) so remounts after `reset()` do not reset the counter — this prevents infinite retry/crash loops on Replit. A **session cap** (`sessionStorage`, max 12 auto-recoveries per tab) stops endless reload storms; then the full error UI is shown. Production behavior is unchanged: non-transient errors show the UI immediately; transient classification is dev-only.
- **Webpack error guard (BannerPlugin)**: `next.config.ts` uses `webpack.BannerPlugin` to inject a dev-only error event listener into `webpack|main-app|app-pages` chunks. This catches `options.factory` / `webpack_require` errors at the window level and prevents the Next.js dev overlay from appearing. The guard is gated behind `dev && !isServer` — production never runs this code.
- **Transient webpack race condition**: On Replit's slow environment, initial route compilation triggers a brief webpack chunk loading race condition (`options.factory` is undefined). This causes 1-2 Fast Refresh full reloads before the page stabilizes. This is a known Next.js dev-mode limitation on cloud environments and does NOT affect production builds or end users.
- **Production build memory**: `npm run build` uses a constrained heap in `package.json` for Replit-sized containers. If `start.sh` fails during build, use a larger Repl or build in CI/Docker, then deploy artifacts.

## PWA & Mobile
- **Manifest**: `public/manifest.json` — `start_url: /dashboard`, `theme_color: #4f46e5`, PNG icons (72–512px) with maskable entries for 192/512.
- **Icons**: `public/icons/icon-{size}x{size}.png` (72, 96, 128, 144, 152, 180, 192, 384, 512). Apple touch icon: `icon-180x180.png`.
- **Service Worker**: `public/sw.js` — caches static assets and Next.js bundles only. Does NOT cache authenticated `/api/*` responses (privacy/security). Disabled in development via `ServiceWorkerRegistration.tsx`.
- **Safe-area insets**: Applied only in `@media (display-mode: standalone)` — header gets top inset padding, main content area gets left/right/bottom insets. No double-padding on body.
- **Mobile overflow**: `overflow-x: hidden` on `html.dashboard-layout`, body, and main. Select triggers constrained to `max-width: 100%` on mobile. Page headers use `data-slot="page-header"` for mobile flex-wrap behavior.
- **data-scroll-behavior**: `data-scroll-behavior="smooth"` on `<html>` element per Next.js 15 recommendation.

## Local Development (Cursor + Docker)
- **Docker**: `docker-compose.dev.yml` runs MongoDB 7 on port 27017
- **Env vars**: Copy `.env.local.example` to `.env.local` and fill in values
- **Quick start**: `npm run setup:local` (starts Docker MongoDB + seeds data), then `npm run dev:local` (port 3000)
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
- **Run button (Project workflow)**: `bash start.sh` — MongoDB, auto-seed, conditional `npm run build`, then `next start` on port 5000 (stable preview).
- **Manual dev**: `bash dev.sh` — MongoDB, auto-seed, stops stale `next dev`, clears `.next`, then `next dev` (webpack, port 5000). Prefer **Run** (`start.sh`) for daily preview; restart dev after edits when the watcher is ignored on Replit.
- **Local (Cursor)**: `npm run dev:local` — port 3000, webpack (no Turbopack).
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
- `APP_URL` - **Preferred for custom domains** (e.g. `https://pm.smarts.fi`). Sets NEXTAUTH_URL/AUTH_URL so auth redirects use your domain instead of smartpm.replit.app.
- `NEXTAUTH_URL` - NextAuth base URL fallback (e.g. `https://<replit-domain>`). Ignored when APP_URL is set.
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
- **Custom domain (pm.smarts.fi)**: Set `APP_URL=https://pm.smarts.fi` in Replit Secrets. This overrides NEXTAUTH_URL so auth and demo-login redirect to your domain. Without it, redirects may go to smartpm.replit.app.
- **NEXTAUTH_URL**: Set by start-prod.sh from APP_URL or REPLIT_DOMAINS. Auth.js v5 also uses `trustHost: true` to accept request headers.
- **Stripe lazy init**: All `new Stripe(...)` calls are lazy — only run inside route handlers, never at module load time.
- **environment.ts**: Stripe and Publishable key fields are `.optional()` in the Zod schema.
- **NEXTAUTH_SECRET vs AUTH_SECRET**: NextAuth v5 uses `AUTH_SECRET`. The env schema validates `NEXTAUTH_SECRET` but this is not required.
- **Production seeding**: Both `start.sh` and `start-prod.sh` run `auto-seed.mjs` on every start. In a fresh deployment with empty MongoDB, this auto-seeds 33 properties + 4 demo users. In an existing deployment, it skips (collections already populated).
