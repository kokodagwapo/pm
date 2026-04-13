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
- **Run button uses production server**: The `Project` workflow in `.replit` runs `bash start.sh`, which runs `npm run build` when `.next/BUILD_ID` is missing, then `npm run start` on port **5000** (no HMR — stable preview). Use `npm run replit:dev` (sets `REPLIT_DEV_SERVER=1`) or `bash dev.sh` only when you need webpack dev + HMR; it is heavier and less stable on Replit.
- **Turbopack disabled**: Replit-facing scripts (`dev`, `dev:5000`) do not use Turbopack. `dev:local` uses webpack on port 3000 for Cursor/local development.
- **File watcher on Replit dev**: `next.config.ts` sets `watchOptions.ignored: /.*/` when `REPLIT_DEV_DOMAIN` or `REPL_ID` is set so phantom FS events do not spin the dev server. Local development without those env vars gets normal webpack HMR.
- **Do NOT re-add `--turbopack`** to Replit-facing scripts or remove the `ignored: /.*/` watchOption on Replit without testing — it can reintroduce refresh loops.
- **`.next` cache cleanup**: `dev.sh` runs `rm -rf .next` before `next dev` for a fresh dev build. **`start.sh` does not delete `.next`** on each run — it only builds when `BUILD_ID` is missing. `scripts/post-merge.sh` removes `.next/BUILD_ID` so the next Run triggers a rebuild without wiping the whole cache mid-session.
- **SSR hydration safety**: All providers (`DashboardAppearanceProvider`, `LocalizationProvider`, `localization.service.ts`) use stable SSR-safe defaults ("immersive", "en-US", "USD") in initial state. Client-side localStorage values are applied only in `useEffect` after hydration.
- **React Strict Mode disabled**: `reactStrictMode: false` in `next.config.ts` to prevent double-mounting of components in dev mode, which exacerbates hydration issues on Replit.
- **Global error boundary**: `global-error.tsx` classifies errors as "empty" (null/undefined/plain `{}` but NOT `Error` instances) vs real. Empty errors render a minimal blank HTML page with NO hooks, NO `reset()`, NO `useEffect` — completely inert to avoid triggering the Next.js dev overlay. Real errors show the full error UI with "Try Again" and "Go to Homepage" buttons. No `window.location.reload()` — avoids infinite refresh loops on Replit.
- **Webpack error guard (BannerPlugin)**: `next.config.ts` uses `webpack.BannerPlugin` to inject a dev-only error event listener into `webpack|main-app|app-pages` chunks. This catches `options.factory` / `webpack_require` errors at the window level and prevents the Next.js dev overlay from appearing. The guard is gated behind `dev && !isServer` — production never runs this code.
- **Transient webpack race condition**: On Replit's slow environment, initial route compilation triggers a brief webpack chunk loading race condition (`options.factory` is undefined). This causes 1-2 Fast Refresh full reloads before the page stabilizes. This is a known Next.js dev-mode limitation on cloud environments and does NOT affect production builds or end users.
- **Production build memory**: `npm run build` uses a constrained heap in `package.json` for Replit-sized containers. If `start.sh` fails during build, use a larger Repl or build in CI/Docker, then deploy artifacts.

## Google Maps Integration
- **Vanilla JS API only**: No `@react-google-maps/api` package. Maps are loaded via a shared `loadGoogleMapsScript()` utility that injects the script tag once, deduplicates, and resolves a promise when ready.
- **Key helpers**: `src/lib/google-maps.ts` — `getGoogleMapsBrowserKey()` (returns `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`), `hasGoogleMapsBrowserKey()` (boolean check), `getGoogleMapsServerKey()` (returns `GOOGLE_MAPS_GEOCODE_KEY` for server-side geocoding).
- **RentalsGoogleMap** (`src/components/landing/RentalsGoogleMap.tsx`): Multi-property map with price pill overlays. Uses a lazily-constructed `OverlayView` subclass via `getOverlayClass()` factory (NEVER at module level — `google.maps.OverlayView` doesn't exist until the script loads). Supports roadmap/satellite/terrain/street view modes. Falls back to `google.maps.Marker` if OverlayView init fails.
- **SinglePropertyMap** (`src/components/landing/SinglePropertyMap.tsx`): Single-property map with one marker. Handles prop changes (lat/lon) after initial mount by updating marker position and map center.
- **MapErrorBoundary** (`src/components/landing/MapErrorBoundary.tsx`): React class error boundary wrapping all map components. Catches any map JS error and shows "Map temporarily unavailable" instead of crashing the page. Used in `/rentals` (both mobile + desktop maps) and `/properties/[id]` (location section).
- **CRITICAL**: Never extend `google.maps.*` at module top level. Always defer to runtime after the Maps script is loaded. Module-level references to `google.maps` crash the app before the script tag finishes loading.

## PWA & Mobile
- **Manifest**: `public/manifest.json` — `start_url: /dashboard`, `theme_color: #4f46e5`, PNG icons (72–512px) with maskable entries for 192/512.
- **Icons**: `public/icons/icon-{size}x{size}.png` (72, 96, 128, 144, 152, 180, 192, 384, 512). Apple touch icon: `icon-180x180.png`.
- **Service Worker**: `public/sw.js` — caches static assets and Next.js bundles only. Does NOT cache authenticated `/api/*` responses (privacy/security). Disabled in development via `ServiceWorkerRegistration.tsx`.
- **Safe-area insets**: Applied only in `@media (display-mode: standalone)` — header gets top inset padding, main content area gets left/right/bottom insets. No double-padding on body.
- **Mobile overflow**: `overflow-x: hidden` on `html.dashboard-layout`, body, and main. Select triggers constrained to `max-width: 100%` on mobile. Page headers use `data-slot="page-header"` for mobile flex-wrap behavior.
- **data-scroll-behavior**: `data-scroll-behavior="smooth"` on `<html>` element per Next.js 15 recommendation.

## Local Development (Cursor + Docker)
- **Docker**: `docker-compose.dev.yml` runs MongoDB 7 on port 27017
- **Where data is stored**: MongoDB database from `MONGODB_URI` (e.g. `SmartStartPM`). Rental/property documents are in the **`properties`** collection (plus `users`, `leases`, etc.). Imports from vms-florida.com use `importSource: "vms-florida.com"` and `importListingUrl`.
- **Import VMS Florida listings** (optional): `npm run docker:mongo`, set `ENABLE_DEMO_AUTH=true` and `MONGODB_URI` in `.env.local`, run `npm run seed:demo`, then `npm run migrate:vms` (35 listings from advanced search). For Replit/Atlas, set `MONGODB_URI` in Secrets instead of localhost.
- **Env vars**: Copy `.env.local.example` to `.env.local` and fill in values
- **Quick start**: `npm run setup:local` (starts Docker MongoDB + seeds data), then `npm run dev:local` (port 3000)
- **Scripts**: `npm run docker:up`, `docker:down`, `docker:logs` for container management
- **Production Docker**: `docker compose up` uses the full `docker-compose.yml` with Dockerfile to build and run app + MongoDB together

## Compliance Intelligence Engine (Task #8)
- **Models**: `src/models/JurisdictionRule.ts` — state-specific regulatory rules DB (FL/CA/NY/TX/WA seeded); `src/models/ComplianceObligation.ts` — per-property compliance tasks with status/severity/due date tracking
- **API routes**:
  - `GET/POST /api/compliance/jurisdiction-rules` — query state regulations (filter by stateCode, category)
  - `GET/POST /api/compliance/obligations` — list/create compliance obligations; auto-stats (total/pending/overdue/critical)
  - `PATCH/DELETE /api/compliance/obligations/[id]` — update status, mark complete, soft delete
  - `POST /api/compliance/rent-calculator` — validate rent increases against state law; returns compliance verdict + recommendations
  - `POST /api/compliance/eviction-workflow` — generate state-specific step-by-step eviction workflow with required docs
  - `POST /api/compliance/fair-housing` — scan text for discriminatory language (20+ pattern rules, severity-graded)
  - `GET /api/compliance/cron` — cron endpoint: marks overdue obligations + sends deadline alerts (14-day, 3-day)
  - `GET/POST /api/compliance/seed` — seeds FL/CA/NY/TX/WA jurisdiction rules on first run
- **Components**: `src/components/compliance/RentCalculatorModal.tsx`, `EvictionWorkflowModal.tsx`, `FairHousingModal.tsx`, `AddObligationModal.tsx` — all-in-one modal tools
  - `RentCalculatorModal`: generates downloadable `.txt` rent increase notice via `generateNotice()` after compliance check
  - `EvictionWorkflowModal`: saves cases to `EvictionCase` collection via `/api/compliance/eviction-cases`; tracks step completion with checkmark UI and confirmation banner
- **Page**: `/dashboard/compliance` — unified Compliance Hub with stats cards, 3 tool launchers, Jurisdiction Profiles grid (per-state rent control / notice period / max increase %), filterable obligation list with urgency-colored due dates (red ≤7 days / amber ≤30 days / green >30 days)
- **Automation**: Compliance deadline alerts integrated into `notification-automation.ts` — 14-day and 3-day pre-deadline notifications to property managers/owners/assigned users; held vendors excluded from Luna auto-dispatch
- **Sidebar**: New "Legal & Compliance" section (admin/manager/owner roles) with Hub, Rent Calculator, Eviction Workflow, Fair Housing links

## Financial Intelligence & Portfolio Health (Task #10 — fully remediated)

### APIs
- **Portfolio Health Score**: `GET /api/analytics/portfolio-health` — 0-100 composite score with letter grade, 5-component breakdown, insights, per-property breakdown. **Now persists daily snapshots** to `PortfolioHealthSnapshot` model and returns 30-day history + day-over-day trend delta.
- **Vendor Spend Analytics**: `GET /api/analytics/vendor-spend` — aggregates VendorJob spend by category, vendor, and month. **Now includes industry benchmark** (BOMA/IREM ~$500/unit/yr) with spend-per-unit vs benchmark comparison and status indicator.
- **Market Rent Gap**: `GET /api/analytics/market-rent-gap` — identifies active leases expiring within 60 days priced >threshold% below market. **Now uses per-property `PropertySystems.marketRent` override** with portfolio-average fallback. Returns potential uplift amounts and source indicator.
- **Tax Prep Export**: `GET /api/analytics/tax-export` — year-end income/expense summary with CSV download. **Now includes full IRS Schedule E line mapping** (Line 3 rents, Line 7 cleaning, Line 9 insurance, Line 11 management, Line 14 repairs, Line 17 utilities, etc.) aggregated in both JSON and CSV output.
- **CapEx Planning**: `GET /api/analytics/capex` — age-based CapEx projections ($300–$3000/unit/yr benchmarks).
- **Utility Anomaly Detection** *(new)*: `GET /api/analytics/utility-anomalies` — flags Electrical, Plumbing, HVAC, Pest Control categories with ≥30% spend spike vs. 3-month rolling average. Returns warning/critical severity, affected properties, spike percent.
- **Owner ROI Report** *(new)*: `GET /api/analytics/owner-roi` — per-property gross yield, net yield, NOI, YTD revenue/expenses, appreciation estimate (4% annual), expense ratio, total return. Portfolio-level aggregates.
- **Property Systems** *(new)*: `GET/PUT /api/analytics/property-systems` — stores and retrieves per-property building system ages (Roof, HVAC, Electrical, Plumbing, Water Heater, etc.) with last-replaced year, lifespan, and per-property market rent override.

### Models
- **`PortfolioHealthSnapshot`**: `src/models/PortfolioHealthSnapshot.ts` — daily score snapshots with components, grade, meta. Indexed by `portfolioKey + date`.
- **`PropertySystems`**: `src/models/PropertySystems.ts` — per-property building system ages + `marketRent` override field.

### Frontend
- **PortfolioHealthWidget**: Updated to show 30-day score sparkline (color-coded bars) and day-over-day trend indicator (+/- pts).
- **CapEx Planning Page**: Added collapsible "Building System Ages" panel — select property, edit last-replaced year and estimated lifespan for each system (Roof, HVAC, etc.), save to DB. Status shows age % of expected lifespan with color coding.
- **Financial Dashboard** (tabs added/updated):
  - **Vendor Spend** — now shows industry benchmark card with BOMA/IREM comparison
  - **Rent Gaps** — now uses per-property market rent overrides, shows `marketRentSource` indicator
  - **Tax Export** — now shows IRS Schedule E summary table by line number in UI and CSV
  - **Utility Alerts** *(new tab)* — anomaly detection UI with critical/warning breakdown and property-level spike cards
- **Owner ROI Page** *(new)*: `/dashboard/analytics/roi` — portfolio and per-property ROI with gross/net yield, NOI, appreciation, expense ratio, total return. Color-coded yield thresholds.
- **Sidebar nav**: Added "Owner ROI Report" link under Analytics section (all 9 locales, key `nav.analytics.roi`).

## Vendor Marketplace & Smart Dispatch (Task #9)
- **Models**: `src/models/Vendor.ts` extended with serviceArea, location, userId, walletBalance, isAvailable, complianceHold; `src/models/VendorJob.ts` with full status timeline, bids, photos, dispatch log
- **API routes**:
  - `GET/POST /api/vendors` — browse/create vendors with filter by category, rating, availability, location
  - `GET/PATCH/DELETE /api/vendors/[id]` — vendor profile CRUD
  - `GET/POST /api/vendors/jobs` — post jobs, list marketplace jobs
  - `GET/POST/PATCH /api/vendors/jobs/[id]` — accept/complete/approve/dispatch/bid on jobs
  - `POST /api/vendors/dispatch` — smart dispatch: selects top-rated available vendor in category
  - `POST/GET /api/vendors/ratings` — submit and read vendor ratings
  - `GET/POST /api/vendors/wallet` — vendor earnings and payout history
  - `GET /api/vendors/[id]/compliance-check` — check vendor compliance hold status
- **Pages**: `/dashboard/vendors` — full marketplace UI (browse, filter, post job, rate vendors); `/dashboard/vendors/portal` — vendor-facing portal (profile, jobs, payments)
- **Sidebar**: "Vendors" nav entry under Operations section (Store icon) for admin/manager/owner roles; localized in all 9 languages

## Predictive Tenant Intelligence Suite (Task #7)
- **Model**: `src/models/TenantIntelligence.ts` — MongoDB document per tenant storing churn risk score/level, renewal likelihood %, delinquency probability %, lifetime value estimate, sentiment signal, raw signals, explanation array, intervention tracking, and credit builder enrollment
- **Service**: `src/lib/services/tenant-intelligence.service.ts` — rule-based scoring engine; computes all scores from Payment, Lease, MaintenanceRequest data; `computeAndPersistScores()` upserts to DB with 24h cache
- **API routes**:
  - `GET/POST /api/tenant-intelligence/[id]` — compute/fetch score for a single tenant (24h cache with `?refresh=true` bypass)
  - `GET /api/tenant-intelligence/portfolio` — paginated scored tenant list with filters (all/high_churn/medium_churn/payment_risk/renewal_soon/high_ltv); auto-computes stale scores
  - `GET/POST /api/tenant-intelligence/credit-builder` — tenant self-service credit builder opt-in (tenant role only)
  - `GET /api/tenant-intelligence/intervention` — list retention offer templates; `POST` sends a named offer to a tenant
- **Components**: `src/components/tenant-intelligence/TenantIntelligenceCard.tsx` (compact card with gauge bars, expandable signals, retention offer dialog — shown on tenant profile page for admin/manager/owner), `src/components/tenant-intelligence/CreditBuilderWidget.tsx` (benefit list + enroll/unenroll toggle for tenant settings)
- **Pages**: `/dashboard/analytics/tenant-intelligence` — full portfolio intelligence dashboard with summary stats, filter bar, scored tenant list with inline 1-click intervention
- **Integration**: TenantIntelligenceCard injected into `/dashboard/tenants/[id]`; CreditBuilderWidget injected into `/dashboard/settings/profile` (tenants only); "Tenant Intelligence Suite" feature link card on `/dashboard/analytics` (admin/manager only)
- **Scoring signals**: payment history (12 mo), avg days late, maintenance volume (6 mo), days until lease expiry, lease renewals, tenancy length, monthly rent

## Luna Autonomous Operations Agent (Task #6)
- **Model**: `src/models/LunaAutonomousAction.ts` — MongoDB model logging every action Luna evaluates or takes
- **Service**: `src/lib/services/luna-autonomous.service.ts` — trigger engine with decision runtime; configurable autonomy mode (full/supervised/off), confidence threshold, per-category enable/disable, human review threshold, max actions/hour
- **API routes**: `src/app/api/luna/actions/route.ts` (GET log + stats, POST review/demo trigger), `src/app/api/luna/settings/route.ts` (GET/PUT autonomy config)
- **Pages**: `/dashboard/automation` (hub overview), `/dashboard/automation/luna` (Luna dashboard — action log, review queue, settings)
- **Component**: `src/components/automation/LunaAutonomousDashboard.tsx` — full-featured client dashboard with action log, pending review queue, settings panel with sliders
- **UI**: New `src/components/ui/slider.tsx` (native range input, no extra package required)
- **Sidebar**: New "Automation" section (admin/manager only) with Overview + Luna Agent links
- **Capabilities**: Payment overdue → auto-send reminder/escalation; Maintenance submitted → auto-triage/emergency escalation; Lease expiry → auto-renewal notices; System digest → daily portfolio summary email
- **Autonomy modes**: `full` (acts without confirmation), `supervised` (high-confidence auto, low-confidence → human review queue), `off` (log only)

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
- **Run button (Project workflow)**: `bash start.sh` — MongoDB, property auto-seed, optional bootstrap-account provisioning, then a production-style Next startup on port 5000. It builds automatically when `.next/BUILD_ID` is missing and runs `next start` by default for a more Replit-stable preview.
- **Deployment runtime**: `bash start-prod.sh` — MongoDB, property auto-seed, optional bootstrap-account provisioning, then `next start` on port 5000.
- **Manual dev**: `bash dev.sh` — MongoDB, auto-seed, stops stale `next dev`, clears `.next`, then `next dev` (webpack, port 5000). Restart dev after edits when the watcher is ignored on Replit.
- **Local (Cursor)**: `npm run dev:local` — port 3000, webpack (no Turbopack).
- Build: `npm run build`
- Start: `npm run start` (port 5000, bound to 0.0.0.0)

## Replit-Specific Configuration
- **MongoDB**: Running locally via Nix (mongodb 7.0), data at `/home/runner/.mongodb-data/data/` (outside project root to avoid file-watcher loops)
- **start.sh**: Starts `mongod` (background) → runs `src/scripts/auto-seed.mjs` → optionally runs `src/scripts/provision-bootstrap-accounts.mjs` when `PROVISION_BOOTSTRAP_ACCOUNTS=true` → runs `npm run build` if needed → `npm run start`. Set `REPLIT_DEV_SERVER=1` only when you explicitly want webpack dev mode.
- **start-prod.sh**: Production start script for Reserved VM deployment — starts local mongod, runs auto-seed, optionally provisions bootstrap auth accounts, then `npm run start`. Build is handled separately by deployment build step (`npm run build`).
- **Auto-seed**: `src/scripts/auto-seed.mjs` seeds properties and promo codes. It only seeds demo users when `ENABLE_DEMO_AUTH=true` in a non-production environment.
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

## Auth Provisioning
- **Production sign-in**: `/auth/signin` is credentials-only. Demo quick-login UI is removed from the normal auth flow.
- **Public sign-up**: `/auth/signup` creates tenant accounts only.
- **Bootstrap accounts**: Set `PROVISION_BOOTSTRAP_ACCOUNTS=true` plus the `BOOTSTRAP_*` secrets listed below to create/update your initial superadmin, manager, owner, and tenant accounts on Replit startup.
- **Demo auth**: Leave `ENABLE_DEMO_AUTH` unset in production. Demo endpoints return `404` unless explicitly enabled in a non-production environment.

## Required Environment Variables (Replit Secrets)
- `MONGODB_URI` - MongoDB connection string (e.g. `mongodb://localhost:27017/SmartStartPM`)
- `AUTH_SECRET` - NextAuth secret (required for session signing)
- `APP_URL` - **Preferred for custom domains** (e.g. `https://pm.smarts.fi`). Sets NEXTAUTH_URL/AUTH_URL so auth redirects use your domain instead of the default Replit hostname.
- `CUSTOM_DOMAIN` - Optional fallback if you prefer setting your custom URL here instead of `APP_URL`
- `NEXTAUTH_URL` - NextAuth base URL fallback (e.g. `https://<replit-domain>`). Ignored when APP_URL is set.
- `PROVISION_BOOTSTRAP_ACCOUNTS` - Set to `true` once on a fresh environment to create/update your initial auth users from secrets, then set back to `false`
- `BOOTSTRAP_SUPERADMIN_EMAIL`, `BOOTSTRAP_SUPERADMIN_PASSWORD`
- `BOOTSTRAP_MANAGER_EMAIL`, `BOOTSTRAP_MANAGER_PASSWORD`
- `BOOTSTRAP_OWNER_EMAIL`, `BOOTSTRAP_OWNER_PASSWORD`
- `BOOTSTRAP_TENANT_EMAIL`, `BOOTSTRAP_TENANT_PASSWORD`
- Optional name/phone overrides: `BOOTSTRAP_*_FIRST_NAME`, `BOOTSTRAP_*_LAST_NAME`, `BOOTSTRAP_*_PHONE`
- `ENABLE_DEMO_AUTH` - Optional, non-production only. Enables demo-user endpoints and demo-user seeding when set to `true`
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
- `/rentals` — Luxury Florida aesthetic: cream `bg-[#f8f7f4]` background, rounded-full filter bar, Playfair Display property names, amber neighborhood tags. **Stayfinder-integrated**: range calendar + guests + “Check availability” drives `/api/properties/public/available-for-stay` (shareable `checkIn`/`checkOut` query params); browse mode still uses paginated `/api/properties/public`. **Desktop map-first** with optional **Browse list** drawer; featured pin card overlays the map. Filter chips: type/beds/**parking (garage etc.)**/price/areas/Saved. Interactive Leaflet map (**CartoDB Positron tiles**, 3D pastel price markers: mint <$3k / sky $3k–$5k / violet $5k–$8k / coral >$8k). **Heart/save** (localStorage), **compare** (GitCompare), **floating comparison bar**, **CompareModal** side-by-side table. *No Replit script or port changes* — same `start.sh` / port 5000 workflow as before.
- `/properties/[id]` — Luxury Florida detail page: cream background, Playfair Display headings, sticky nav with `bg-white/95 backdrop-blur-md` and slate-900 underline. Photo gallery grid, section tabs (Overview/Pricing/Amenities/Availability/Reviews/Map). Availability uses `AvailabilityCalendar` (drag-to-select dates), real-time pricing via `/api/pricing/calculate-public`. **Sidebar booking widget**: large Playfair price, date grid, live pricing breakdown (rate×nights, discounts, total), **Quick Facts** pastel icon tiles (violet/sky/rose/amber/emerald/orange), slate-900 CTAs. **Booking Summary dark header** (slate-900 + amber DollarSign), "Request this Rental" slate-900 button. Collapsible coupon input (WELCOME10/SUMMER25), guest inquiry form, inquiry success → "Apply Now" prompt, **4-step rental application modal**. **Guest Reviews** with star ratings + submit form. **Virtual Tour** iframe (YouTube/Matterport). **SinglePropertyMap** component (vanilla Google Maps JS API, single marker, Google Maps link). Luna AI floating chat (LunaWidget) with voice TTS. Heart/save in sticky nav, share button (native share API).

*Virtual Tour tab only appears if `virtualTourUrl` is set on the property

### Role Hierarchy
- **Admin/Manager**: Full access — block any unit, override owner blocks, manage all pricing rules, approve/reject all requests
- **Owner**: Block own properties, manage pricing on own units, approve/reject requests for own properties
- **Tenant**: View availability, submit rental requests, cancel own pending requests

### Permissions Added
- `calendar_manage`, `pricing_manage`, `date_block_manage`, `rental_request_view`, `rental_request_manage`

## Deployment / Build Notes
- **Deployment type**: Reserved VM (`deploymentTarget = "vm"` in `.replit`). Build: `npm run build`. Run: `bash start-prod.sh`.
- **Secrets (Replit lock icon)**: Do **not** commit API keys or Stripe keys in `.replit`. Set at minimum:
  - **`AUTH_SECRET`** and **`NEXTAUTH_SECRET`** (e.g. `openssl rand -base64 32`).
  - **`MONGODB_URI`**: Prefer **MongoDB Atlas** (`mongodb+srv://...`) for production; local `mongod` is skipped automatically when the URI is not `mongodb://localhost` / `127.0.0.1`.
  - **`NEXT_PUBLIC_APP_URL`**: `https://<your-repl>.replit.app` or your custom domain (must match the browser origin).
  - Optional: **`APP_URL`** / **`CUSTOM_DOMAIN`** (https://…) for auth redirect base — same as public URL if unsure.
  - Optional: Stripe, R2, `OPENAI_API_KEY`, `UNIT_SECRETS_ENCRYPTION_KEY`, Google Maps keys — see `.env.local.example`.
- **MongoDB**: If `MONGODB_URI` is Atlas, `start.sh` / `start-prod.sh` do not start local `mongod` (see `scripts/replit-mongo.sh`).
- **Custom domain**: Set `APP_URL=https://your.domain` in Secrets so `start-prod.sh` exports `NEXTAUTH_URL` / `AUTH_URL` correctly.
- **NEXTAUTH_URL**: Also derived from **`REPLIT_DOMAINS`** (auto-provided on Replit) when `APP_URL` is unset. Auth uses `trustHost: true` (`AUTH_TRUST_HOST` in `.replit` shared env).
- **Stripe lazy init**: All `new Stripe(...)` calls are lazy — only run inside route handlers, never at module load time.
- **environment.ts**: Stripe and Publishable key fields are `.optional()` in the Zod schema.
- **NEXTAUTH_SECRET vs AUTH_SECRET**: NextAuth v5 uses `AUTH_SECRET`. The env schema validates `NEXTAUTH_SECRET` but this is not required.
- **Production seeding**: Both `start.sh` and `start-prod.sh` run `auto-seed.mjs` on every start. In a fresh deployment, this seeds properties and promo codes. User accounts are only auto-created if you explicitly enable bootstrap provisioning through secrets.
