# Changelog — SmartPM audit & hardening

All notable changes from the **2026-03-21 full-stack audit pass** are recorded here.

---

## [Unreleased] — Audit session 2026-03-21

### Added (ops slice — 2026-03-21 follow-up)

- **`src/lib/cron-auth.ts`** — Shared `verifyCronRequest()` (Bearer or `x-cron-secret`) and `verifyCronRequestOrAdmin()` for cron + admin fallback.
- **`RenewalOpportunity` model** — `src/models/RenewalOpportunity.ts`; exported from `@/models`.
- **APIs:** `GET/POST /api/renewal-opportunities`, `PATCH /api/renewal-opportunities/[id]`, `POST /api/renewal-opportunities/sync` (admin/manager only).
- **`/dashboard/renewals`** — Mobile-first pipeline UI: sync from leases (90d), status select, notes.
- **Dashboard** — `operations` block on `/api/dashboard/overview` (available units, fully vacant properties, renewal pipeline count, leases expiring ≤90d); three new **clickable** KPI cards + expiring-leases card links to `/dashboard/leases/expiring`.
- **`operations-metrics.service.ts`** — Unit-level availability + fully vacant property counts.
- **Sidebar** — `nav.leases.renewals` → `/dashboard/renewals`.
- **i18n** — New dashboard card strings + `nav.leases.renewals` in all `common.json` / `dashboard.json` locales.

### Changed

- **Cron routes** now require secrets in production: `api/cron/check-leases`, `api/cron/followup-inquiries`, `api/compliance/cron` use `verifyCronRequest`. **`api/tenant-intelligence/cron`** uses `verifyCronRequestOrAdmin` with `TENANT_INTELLIGENCE_CRON_SECRET` or `CRON_SECRET`, else admin session.
- **`/dashboard/properties`** — Initial filters honor `?status=` for drilldown from the dashboard.
- **`AnalyticsCard`** — Optional `href` wraps the card in `Link` for KPI drilldowns.

### Breaking / ops

- **Production:** Set `CRON_SECRET` (or the tenant-intelligence-specific secret) on the host; otherwise cron endpoints return **500** (check-leases, compliance, followup) when no secret is configured. **`/api/luna/cron`** still uses **`LUNA_CRON_SECRET`** or manager/admin session (unchanged).

### Added (audit docs)

- `docs/SMARTPM_FEATURE_AUDIT.md` — Code-backed feature audit and master gap table (COMPLETE / PARTIAL / MISSING).
- `docs/SMARTPM_IMPLEMENTATION_PLAN.md` — Milestoned plan for vacancy, renewals, calendar aggregate, services, vendor portal, notifications.
- `docs/SMARTPM_COMPLETION_STATUS.md` — Executive completion summary tied to the audit.
- `docs/CHANGELOG_SMARTPM.md` — This file.

### Fixed

- **Luna maintenance vendor dispatch persistence:** `src/app/api/luna/actions/route.ts` was calling `MaintenanceRequest.findByIdAndUpdate` with `lunaVendorId`, `lunaVendorName`, and `lunaDispatchedAt`, but those paths were **not defined** on the Mongoose schema. With Mongoose strict mode (default), **unknown keys are stripped**, so vendor dispatch metadata was never stored.  
  - **Change:** Added optional `lunaVendorId` (ObjectId ref `Vendor`), `lunaVendorName` (string), and `lunaDispatchedAt` (Date) to `src/models/MaintenanceRequest.ts` and mirrored fields on `IMaintenanceRequest` in `src/types/index.ts`.

### Changed

- `src/models/index.ts` — Re-export `Vendor` for consistent `@/models` imports.

### Security / ops

- **Luna cron** (`/api/luna/cron`): still uses `LUNA_CRON_SECRET` or manager/admin session (not unified with `CRON_SECRET`).

---

## Notes for release managers

- No database migration script is required for the new maintenance fields (MongoDB is schemaless); existing documents simply omit the new keys until Luna dispatch runs again.
- Backfill is optional: if historical dispatches should be reconstructed, inspect Luna action logs / notifications rather than DB fields.
