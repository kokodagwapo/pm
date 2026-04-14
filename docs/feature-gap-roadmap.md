# Feature Gap Roadmap

## Goal
Turn the existing property, rental-request, lease, payment, and maintenance foundation into a production-ready reservation and guest-operations platform.

## Highest-Value Gaps
### Missing or weak end-to-end workflows
- Confirmed reservation lifecycle separate from rental requests
- Contract delivery for signature by email and SMS
- Owner contract-copy delivery after signature
- Check-in / check-out operations
- Cleaning turnover management
- Staged deposit / balance payment experience
- Proof-of-payment review flow
- Welcome-message orchestration across email and SMS
- HOA preregistration / lead-time workflow
- WhatsApp messaging

### What is already reusable
- Rental request intake and approval: [`src/app/api/rental-requests/`](src/app/api/rental-requests/)
- Lease and document primitives: [`src/models/Lease.ts`](src/models/Lease.ts), [`src/models/Document.ts`](src/models/Document.ts)
- Payment / invoice / receipt primitives: [`src/models/Payment.ts`](src/models/Payment.ts), [`src/models/Invoice.ts`](src/models/Invoice.ts), [`src/models/PaymentReceipt.ts`](src/models/PaymentReceipt.ts)
- Messaging channels: [`src/lib/email-service.ts`](src/lib/email-service.ts), [`src/lib/services/sms.service.ts`](src/lib/services/sms.service.ts)
- Maintenance and vendor dispatch: [`src/models/MaintenanceRequest.ts`](src/models/MaintenanceRequest.ts), [`src/models/VendorJob.ts`](src/models/VendorJob.ts)
- Calendar foundation: [`src/app/api/calendar/`](src/app/api/calendar/)

## Phase 1: Fastest High-Value Wins
### 1. Contract signature email dispatch
- Reason: The app already has e-sign endpoints and email infrastructure; adding delivery will immediately close a visible workflow gap.
- Likely files/modules:
  - [`src/app/api/leases/[id]/sign/route.ts`](src/app/api/leases/[id]/sign/route.ts)
  - [`src/lib/email-service.ts`](src/lib/email-service.ts)
  - [`src/lib/services/email.service.ts`](src/lib/services/email.service.ts)
  - lease dashboard pages under [`src/app/dashboard/leases/`](src/app/dashboard/leases/)
- Dependencies: existing lease signing behavior
- Complexity: `Medium`
- Recommended order: `1`

### 2. Owner contract-copy email
- Reason: Small follow-up to contract dispatch with high operational value.
- Likely files/modules:
  - [`src/app/api/leases/[id]/sign/route.ts`](src/app/api/leases/[id]/sign/route.ts)
  - email services
  - owner/property lookup in [`src/models/Property.ts`](src/models/Property.ts)
- Dependencies: contract email dispatch
- Complexity: `Small`
- Recommended order: `2`

### 3. Maintenance video upload
- Reason: Current maintenance media is image-only; extending to video is low-risk and user-visible.
- Likely files/modules:
  - [`src/components/ui/image-upload.tsx`](src/components/ui/image-upload.tsx)
  - [`src/components/forms/maintenance-request-form.tsx`](src/components/forms/maintenance-request-form.tsx)
  - upload endpoints under [`src/app/api/upload/`](src/app/api/upload/)
- Dependencies: storage validation rules
- Complexity: `Small`
- Recommended order: `3`

### 4. Unified welcome email/SMS triggers
- Reason: Message primitives exist but are fragmented across flows.
- Likely files/modules:
  - [`src/lib/email-service.ts`](src/lib/email-service.ts)
  - [`src/lib/notification-service.ts`](src/lib/notification-service.ts)
  - [`src/lib/services/sms.service.ts`](src/lib/services/sms.service.ts)
  - rental approvals and user-creation routes
- Dependencies: template decisions and user preferences
- Complexity: `Medium`
- Recommended order: `4`

### 5. Vacancy operations queue
- Reason: Vacancy analytics exist, but operations still need action-oriented tooling.
- Likely files/modules:
  - [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx)
  - [`src/app/dashboard/analytics/occupancy/page.tsx`](src/app/dashboard/analytics/occupancy/page.tsx)
  - [`src/app/api/dashboard/overview/route.ts`](src/app/api/dashboard/overview/route.ts)
- Dependencies: none
- Complexity: `Medium`
- Recommended order: `5`

## Phase 2: Core Workflow Completion
### 1. Create a real reservation entity and lifecycle
- Reason: Many requested features depend on having a confirmed reservation record separate from a rental request or lease.
- Likely files/modules:
  - new `src/models/Reservation.ts`
  - rental-request approval APIs
  - public rentals and tenant reservation screens
  - reservation-specific services and notifications
- Dependencies: existing rental request approval flow
- Complexity: `Large`
- Recommended order: `1`

### 2. Build check-in / check-out workflow
- Reason: Required for arrival messaging, door-code delivery, late arrival, and turnover coordination.
- Likely files/modules:
  - reservation pages/APIs
  - notification services
  - property access-secret logic in [`src/lib/unit-access-secrets.ts`](src/lib/unit-access-secrets.ts)
- Dependencies: reservation entity
- Complexity: `Large`
- Recommended order: `2`

### 3. Add staged deposit / balance payment flow
- Reason: Payment primitives exist, but the UX is not productized for hospitality-style payment schedules.
- Likely files/modules:
  - [`src/models/Payment.ts`](src/models/Payment.ts)
  - [`src/models/Invoice.ts`](src/models/Invoice.ts)
  - payment APIs and Stripe routes
  - payment UI under [`src/app/dashboard/payments/`](src/app/dashboard/payments/)
- Dependencies: reservation or lease schedule rules
- Complexity: `Medium`
- Recommended order: `3`

### 4. Build proof-of-payment review flow
- Reason: Upload/storage exists generically, but manual payment review does not.
- Likely files/modules:
  - tenant document upload APIs
  - payment models/pages
  - manager review screen
- Dependencies: payment workflow decisions
- Complexity: `Medium`
- Recommended order: `4`

### 5. Build dedicated cleaning management
- Reason: Vendor dispatch exists, but turnover cleaning is a distinct operational domain.
- Likely files/modules:
  - new `CleaningTask` model
  - new dashboard pages under `src/app/dashboard/cleaning/`
  - APIs under `src/app/api/cleaning/`
  - vendor assignment integration
- Dependencies: checkout workflow
- Complexity: `Large`
- Recommended order: `5`

## Phase 3: Advanced Integrations and Polish
### 1. Complete Google Calendar sync
- Reason: Internal calendar is strong; external sync is the remaining credibility gap.
- Likely files/modules:
  - [`src/app/api/calendar/google/`](src/app/api/calendar/google/)
  - [`src/lib/services/calendar.service.ts`](src/lib/services/calendar.service.ts)
  - [`src/models/CalendarSettings.ts`](src/models/CalendarSettings.ts)
- Dependencies: stable event ownership rules
- Complexity: `Medium`
- Recommended order: `1`

### 2. HOA preregistration / lead-time automation
- Reason: HOA data exists, but the workflow most hospitality operators need is missing.
- Likely files/modules:
  - property models/forms
  - compliance APIs
  - cron and notification services
- Dependencies: clarified business rules per association
- Complexity: `Large`
- Recommended order: `2`

### 3. Add WhatsApp messaging
- Reason: Frequently requested guest communication channel, but not present in code.
- Likely files/modules:
  - new provider service in `src/lib/services/`
  - notification settings and templates
  - delivery logs
- Dependencies: channel policy and credentials
- Complexity: `Large`
- Recommended order: `3`

### 4. Decide on external e-sign provider
- Reason: In-app signing may be enough for some use cases but not all legal/compliance expectations.
- Likely files/modules:
  - lease/document services
  - signing routes
  - template and audit layers
- Dependencies: contract dispatch flow
- Complexity: `Large`
- Recommended order: `4`

### 5. Add home watch and pet-watch operations if those are real products
- Reason: These appear in notes but are not present in code; should only be built if confirmed by product.
- Likely files/modules:
  - new task/request models
  - owner/guest request UIs
  - scheduling and notifications
- Dependencies: product clarification
- Complexity: `Medium`
- Recommended order: `5`

## Category-by-Category Gap Breakdown
### Reservation / booking
- Missing:
  - confirmed reservation entity
  - late arrival handling
  - late checkout requests
  - check-in / check-out operations
- Why it matters: These gaps block a true guest lifecycle.

### Owner / tenant communication
- Missing:
  - owner contract-copy delivery
  - orchestrated welcome journeys
  - richer preference-aware message dispatch
- Why it matters: Communication exists, but not as a reliable product workflow.

### Contracts / e-sign
- Missing:
  - signature invitations by email
  - signature invitations by SMS
  - stronger owner distribution and reminder automation
- Why it matters: E-sign looks present, but contract delivery is incomplete.

### Payments
- Missing:
  - guided two-step payment experience
  - manual proof-of-payment review
- Why it matters: Financial primitives exist, but user-facing workflow depth is limited.

### Maintenance
- Missing:
  - maintenance video uploads
  - better review / approval states for media-backed requests
- Why it matters: This is a small gap with clear UX value.

### HOA
- Missing:
  - preregistration lead-time rules
  - operational HOA workflow
- Why it matters: HOA fields alone do not solve the real process.

### Calendar / cleaning
- Missing:
  - turnover cleaning management
  - stronger external calendar sync
- Why it matters: These are central to hospitality-style operations.

## Recommended Delivery Sequence
1. Fix the smallest visible workflow gaps first: contract email, owner copy, maintenance video, unified welcome triggers.
2. Then build the missing reservation backbone and arrival/departure workflow.
3. Use that backbone to productize staged payments and cleaning turnover.
4. Finish with external integrations and niche operational products.
