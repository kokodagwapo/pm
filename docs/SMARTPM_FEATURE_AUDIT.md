# SmartStartPM — Feature & Architecture Audit

**Scope:** Code-backed verification of the repository at audit time (not UI assumptions).  
**Method:** Mongoose models (`src/models`), API routes (`src/app/api`), auth helpers (`src/lib/api-utils.ts`, `src/lib/auth.ts`), hooks (`src/hooks/useRolePermissions.ts`), and targeted search for integrations.

---

## 1. System snapshot

| Area | Finding |
|------|---------|
| **Frontend** | Next.js App Router under `src/app` (dashboard, tenant views, public marketing, `/br`). Client components use shared UI in `src/components`. |
| **Backend** | Route handlers in `src/app/api/**/route.ts` (~200+ routes). Service layer under `src/lib/services`. |
| **Database** | MongoDB via Mongoose; no Prisma schema in repo. |
| **Auth** | NextAuth (`auth()`); `withRoleAndDB` wraps many APIs with role checks. |
| **RBAC** | `UserRole`: `admin`, `manager`, `owner`, `tenant` only — **no `vendor` role**. Custom `Role` model + `SYSTEM_PERMISSIONS` for fine-grained flags; client mirror in `useRolePermissions`. |
| **File uploads** | `src/app/api/upload/route.ts` (local + R2); tenant document upload under `api/tenant/documents/upload`. |
| **Messaging** | `Conversation`, `Message`, `MessageStatus` models; `api/conversations`, `api/messages`. |
| **Scheduling / cron** | `api/cron/check-leases`, `api/cron/followup-inquiries`, `api/luna/cron`, `api/compliance/cron`, `api/tenant-intelligence/cron`. **Several routes do not enforce `CRON_SECRET` in code** (noted as security gap). |
| **Integrations** | Stripe (payments/webhook), Google Calendar (connect/sync), Twilio SMS (`sms.service.ts`, settings), R2 object storage, Luna automation. **No first-class WhatsApp provider surfaced in code paths reviewed.** |

---

## 2. Data model vs requested entities

| Requested | Present in codebase | Notes |
|-----------|---------------------|--------|
| Property | Yes | `Property` with embedded `units`. |
| Tenant | Yes | `User` role tenant + `Tenant` model patterns in types. |
| Reservation | **Partial** | Short-term “reservation” is closest to `RentalRequest` / `DateBlock` / pricing — not a dedicated `Reservation` collection named as such. |
| ContractDocument | **Partial** | `Document` + lease linkage; templates `DocumentTemplate`. |
| Payment | Yes | `Payment`, schedules, Stripe. |
| PaymentReceipt | Yes | `PaymentReceipt` model + tenant receipt APIs. |
| CustomField | **Missing** | No generic `CustomField` model; **HOA-specific custom field not found**. |
| ServiceCatalog | **Missing** | No unified catalog model. |
| ServiceRequest | **Partial** | Maintenance + work orders cover repair-style services only; not dog/home watch/cleaning as productized services. |
| Vendor | **Partial** | `Vendor` model + `api/luna/vendors` (admin/manager). No vendor login. |
| VendorServiceType | **Partial** | Vendor `categories` string array + maintenance enums — not configurable taxonomy. |
| VendorAssignment | **Partial** | Work orders assign **User**; Luna writes vendor refs on maintenance (now schema-backed). |
| VendorPayment | **Missing** | |
| CleaningTask | **Missing** | |
| MaintenanceUpload | **Partial** | Maintenance `images[]` URLs. |
| ActivityLog | **Partial** | `AuditLog` model; dashboard “activity” is composed in overview API. |
| AvailabilityNote | **Missing** | |
| RenewalOpportunity | **Missing** | Renewal logic in lease service + forms + tenant intelligence / Luna — no `RenewalOpportunity` entity with status pipeline. |

---

## 3. Master gap analysis table

Statuses: **COMPLETE** = end-to-end verifiable in code; **PARTIAL** = model or API exists but missing UI, RBAC edge, workflow, or persistence; **MISSING** = not found as a coherent feature.

### Phase 2 — Core SmartPM features

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| Contract storage | **COMPLETE** | `Document` model (versions, lease/property links); lease documents API | E-sign UX completion varies by screen | QA document flows per role |
| Deposit + balance tracking | **PARTIAL** | Units have `securityDeposit`; `Payment` / invoices | Unified “tenant balance” dashboard not guaranteed everywhere | Align lease/payment UIs with single source of truth |
| Proof of payment uploads | **PARTIAL** | `PaymentReceipt`, tenant receipts routes | Not verified: all payment methods attach proof | Add explicit receipt upload requirement where needed |
| HOA custom field | **MISSING** | No schema/UI for HOA | — | Add `customFields` on Property or Compliance + UI |
| Calendar | **PARTIAL** | `Event`, `DateBlock`, calendar APIs, Google sync | Overlays for cleaning/services/renewal/vacancy not unified | Design single calendar aggregation API + UI layer |
| Tenant management | **COMPLETE** | Tenants APIs, applications, leases | — | Harden owner scoping on every route |
| Cleaning scheduling | **MISSING** | No `CleaningTask` | — | New model + calendar integration |

### Phase 2 — PM/owner requests (short-term ops)

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| Future availability | **PARTIAL** | `DateBlock`, pricing, rental requests | Not framed as “availability product” | Expose availability API for dashboard |
| Empty properties detection | **PARTIAL** | Dashboard metrics (`occupiedUnits`, etc.) | No “vacant soon / long-term empty / home watch opportunity” taxonomy | Add computed flags + persistence optional |
| Home watch / dog watching | **MISSING** | — | — | Service catalog + requests |
| Cleaning logs | **MISSING** | — | — | Tie to CleaningTask + property |
| Printable check-in/out | **MISSING** | — | — | PDF templates + lease/reservation link |
| After 10PM tracking | **MISSING** | — | — | Define events + privacy review |

### Phase 2 — Tenant flow

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| Late checkout + reason | **MISSING** | No dedicated flow found | — | Request model + approval |
| Reservation without contract | **PARTIAL** | Rental request / applications | Explicit “hold without lease” policy unclear | Document + enforce in API |
| Welcome message | **PARTIAL** | Notifications, Luna, announcements | Not one canonical “welcome” pipeline | Template + trigger on move-in |
| WiFi / door code | **MISSING** | — | — | Secure fields on lease/property portal |
| Upload photos/videos | **PARTIAL** | Maintenance images; tenant documents | Video types / size limits need policy | Extend upload validation + storage |

### Phase 2 — Contracts delivery

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| E-sign | **PARTIAL** | `digitalSignatures` on `Document` | End-to-end signing UI not audited per screen | Verify sign + audit log |
| SMS + email delivery | **PARTIAL** | `notificationService`, Twilio settings, email on invoices | Contract-sent event not guaranteed | Wire document share to notifications |

### Phase 2 — HOA reminder (6 weeks)

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| 6-week automation | **MISSING** | Compliance/obligations exist; no “HOA 6 weeks” rule located | — | Cron + obligation template |

### Phase 2 — Tenant communication

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| WhatsApp | **MISSING** | No WhatsApp integration in services reviewed | — | Provider adapter + opt-in |
| SMS | **PARTIAL** | Twilio SMS service | Admin must configure keys | Settings UX + rate limits |
| Email | **COMPLETE** | Multiple email-sending paths | Deliverability monitoring partial | Add bounce handling |
| Message center | **COMPLETE** | Conversations/messages APIs | RBAC on threads must stay strict | Periodic security review |

### Phase 2 — Revenue / planning

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| 2-week forward planning | **PARTIAL** | Payment dashboard projections | Not a single “ops” view | KPI service (see implementation plan) |
| Per-property revenue | **PARTIAL** | Analytics, invoices, payments | Drilldown dashboard spec not built | Property revenue page |

---

### Phase 3 — Advanced business

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| Next-year availability + notes | **MISSING** | No `AvailabilityNote` | — | Model + API + calendar |
| Renewal opportunity pipeline | **MISSING** | Lease renewal options; intelligence scores | No status enum entity | Add `RenewalOpportunity` + UI |
| Available properties dashboard | **PARTIAL** | Properties list, public properties | Not all KPI cards + drilldown spec | New dashboard section |
| Vacant / empty taxonomy + home watch tag | **MISSING** | — | — | Derive from leases/units + tags |
| Ancillary service marketplace | **MISSING** | Maintenance only | — | Phase 4 alignment |
| Calendar overlays (full spec) | **PARTIAL** | Events + blocks | Single overlay feed missing | Aggregator endpoint |
| Dashboard KPIs (spec list) | **PARTIAL** | Existing overview metrics | Several KPIs absent | Implement incrementally |

---

### Phase 4 — Vendor system

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| Vendor entity (full fields) | **PARTIAL** | `Vendor` model | No company/address/service area as structured fields | Extend schema |
| Service types configurable | **PARTIAL** | Enum lists | Not admin-configurable | Settings CRUD |
| Vendor portal | **MISSING** | No vendor role/routes | — | Auth + scoped APIs |
| Service assignment workflow | **PARTIAL** | Luna dispatch; work orders → **User** | Vendor vs staff ambiguity | Unified assignment model |
| Auto-suggest vendor | **PARTIAL** | `luna-autonomous.service` `selectVendorForCategory` | Geo not used | Add service area match |
| Status: requested → completed | **PARTIAL** | `MaintenanceStatus` | Not same enum as spec | Map or extend |
| Notifications to vendor | **MISSING** | Tenant/manager notifications | — | Channel + consent |
| Vendor calendar + conflicts | **MISSING** | — | — | Schedule model |
| Vendor performance | **PARTIAL** | `rating`, `completedJobs` on Vendor | No job-level ratings UI | Reviews linkage |
| Vendor payouts | **MISSING** | — | — | Optional phase |
| Property drilldown: vendors/history | **PARTIAL** | Maintenance on property | Luna vendor fields now persist | Surface in UI |

---

### Phase 6 — RBAC

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| Super Admin | **PARTIAL** | `admin` role | Naming differs from spec | Map terminology in docs |
| Property Manager | **COMPLETE** | `manager` | — | Enforce on new APIs |
| Owner | **COMPLETE** | `owner` + permissions | Property scoping must be verified per route | Audit `owners` + property APIs |
| Tenant | **COMPLETE** | Scoped tenant APIs | — | Regression tests |
| Vendor | **MISSING** | No role | — | Add role + middleware |

---

### Phase 8 — Notifications (events)

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| Contract sent | **PARTIAL** | Document sharing settings | Event hook incomplete | Explicit notification type |
| Payment uploaded | **PARTIAL** | Payment notifications | — | Verify triggers |
| Late checkout | **MISSING** | No feature | — | After feature exists |
| Welcome message | **PARTIAL** | Various | Canonical trigger missing | Workflow |
| Service / vendor assigned | **PARTIAL** | Maintenance updates | Vendor not notified | Vendor channel |
| HOA reminder | **MISSING** | — | — | Cron |

---

### Phase 9 — Testing

| Feature | Status | Evidence | Missing / risk | Action |
|---------|--------|----------|----------------|--------|
| Automated E2E for spec list | **MISSING** | Jest/playwright not verified for this matrix | — | Add critical-path tests |

---

## 4. Security & ops notes (audit)

1. **Cron endpoints:** Several cron routes comment out `CRON_SECRET` checks — treat as **HIGH** risk in production until secured.
2. **Strict Mongoose:** Prior to audit fix, Luna wrote `lunaVendorId` / `lunaVendorName` / `lunaDispatchedAt` onto maintenance documents **without schema fields** → values were dropped under strict mode. **Fixed** in this pass (see `CHANGELOG_SMARTPM.md`).
3. **Vendor pool:** Email unique on `Vendor` — good; no auth linkage yet.

---

## 5. Conclusion

SmartStartPM is a **strong long-term / traditional PMS + Luna automation** codebase (leases, payments, maintenance, documents, messaging, calendar primitives). It is **not yet** a full **short-term rental ops + ancillary services marketplace + vendor portal** as described in Phases 3–4 without substantial new models, UI, and RBAC. The gap table above is the authoritative backlog; see `SMARTPM_IMPLEMENTATION_PLAN.md` for sequencing.
