# SmartStartPM — Implementation Plan (Post-Audit)

This plan sequences work after `SMARTPM_FEATURE_AUDIT.md`. Goal: **ship value in vertical slices** without breaking leases, payments, or auth.

---

## Principles

1. **One slice = model + API + RBAC + minimal UI** (or API-first for internal tools).
2. **Reuse** `withRoleAndDB`, `NotificationType`, dashboard cards, calendar `Event` / `DateBlock`.
3. **Vendor** work starts with **data model alignment** (User vs Vendor) before portal.
4. **Secure crons** with shared `verifyCronSecret()` before adding new scheduled jobs.

---

## Milestone A — Foundations (1–2 weeks)

| # | Task | Outcome |
|---|------|---------|
| A1 | Cron auth helper + apply to all `api/*/cron/*` routes | No unauthenticated cron in prod |
| A2 | `Vendor` exported from `@/models` (done) | Consistent imports |
| A3 | Document Luna vendor fields in API responses for maintenance | UI can show dispatched vendor |
| A4 | Owner property scoping audit checklist | Spreadsheet of routes vs `propertyId` filter |

---

## Milestone B — Vacancy & renewals (2–4 weeks)

| # | Task | Outcome |
|---|------|---------|
| B1 | **Computed vacancy service** — derive from `Lease` + unit `PropertyStatus` | JSON for dashboard |
| B2 | Add `RenewalOpportunity` model: `leaseId`, `tenantId`, `propertyId`, `status` (candidate → not_renewing), `notes`, `nextContactAt` | Persist pipeline |
| B3 | Manager UI: property detail “Renewal” section + list view | Matches audit Phase 3 |
| B4 | Optional: link to existing tenant intelligence scores | Prioritization |

---

## Milestone C — Availability & calendar overlay (2–3 weeks)

| # | Task | Outcome |
|---|------|---------|
| C1 | `AvailabilityNote` model: `propertyId`, `unitId?`, `start`, `end`, `note`, `visibility` | Data for STR-style ops |
| C2 | `GET /api/calendar/aggregate` — events + blocks + notes + (later) cleaning | Single feed for UI |
| C3 | Calendar UI: layer toggles | Phase 3 overlay spec |

---

## Milestone D — Ancillary services (4–8 weeks)

| # | Task | Outcome |
|---|------|---------|
| D1 | `ServiceCatalog` + `ServiceRequest` (type, property, reservation link optional, status, amount) | Marketplace core |
| D2 | Tenant request flow + manager approval | Revenue capture |
| D3 | Tie revenue to `Invoice` or parallel ledger | Reporting |
| D4 | `CleaningTask` or map cleaning to `ServiceRequest` with type=cleaning | Avoid duplicate concepts |

---

## Milestone E — Vendor system (6–10 weeks)

| # | Task | Outcome |
|---|------|---------|
| E1 | Add `UserRole.VENDOR` or separate `VendorAccount` linked to `User` | Auth |
| E2 | Vendor schema: `company`, `address`, `serviceArea` (GeoJSON or zips[]) | Matching |
| E3 | `GET/PATCH /api/vendor/jobs` scoped to assigned work | Portal backend |
| E4 | Vendor portal UI (Next.js route group `/vendor`) | Jobs, photos, status |
| E5 | Unify assignment: either `WorkOrder.assignedVendorId` or `ServiceRequest.assigneeVendorId` | Single workflow |
| E6 | Notifications: email/SMS to vendor on assign | Operational |

---

## Milestone F — Communications & HOA (2–4 weeks)

| # | Task | Outcome |
|---|------|---------|
| F1 | WhatsApp adapter (Twilio or Meta) behind feature flag | Channel |
| F2 | HOA obligation template + cron at T-6 weeks | Phase 2 reminder |
| F3 | Welcome workflow: trigger on lease `moveInDate` / status | Tenant experience |

---

## Milestone G — Dashboard KPIs (parallel)

Implement cards **only when** backing APIs exist:

1. Available properties / units — from B1  
2. Vacant / vacant soon — from B1 + rules  
3. Renewal opportunities — from B2  
4. Home watch opportunities — tag on vacancy rules  
5. Service revenue — from D3  
6. Pending services — from D1/D2  
7. Active vendors / jobs today — from E3 + aggregates  

Each card: **click → filtered list or property drilldown**.

---

## Blocked / needs product decision

- **After 10PM tracking** — legal/privacy  
- **Reservation without contract** — business rules per jurisdiction  
- **Vendor payouts** — accounting integration  

---

## Suggested first sprint (engineering)

1. Secure crons.  
2. Surface `lunaVendor*` on maintenance in manager UI + API serializers.  
3. B1 vacancy computation + one dashboard card (read-only).  
4. Sketch `RenewalOpportunity` schema + migration script for Mongo.

---

*Maintainers: keep this file updated when milestones ship; link PRs in `CHANGELOG_SMARTPM.md`.*
