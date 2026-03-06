# Code Review: SmartStartPM Performance & Refactoring

**Date:** March 6, 2025  
**Focus:** Page load performance (menu navigation), code structure, refactoring opportunities

---

## Executive Summary

The app has a solid foundation with loading states, optimized package imports, and memoized components. The main cause of **slow menu/page loading** is likely a combination of:

1. **Development mode** – Next.js compiles pages on-demand in dev, which adds latency
2. **Heavy page bundles** – Large pages (dashboard ~900 lines, properties ~1200 lines) with heavy dependencies (Recharts, DataTable, etc.)
3. **Provider waterfall** – BrandingProvider, LocalizationProvider, and UserAvatarProvider all fetch on mount
4. **No explicit prefetch** – Sidebar links rely on default prefetch; collapsed sections may not prefetch child routes until expanded

---

## Performance Findings

### 1. Menu/Navigation Slowness

| Cause | Impact | Recommendation |
|-------|--------|----------------|
| Next.js dev compilation | High (dev only) | Run `npm run build && npm run start` to test production behavior |
| Large page bundles | High | Use `next/dynamic` for Recharts, DataTable, and other heavy components |
| Provider API calls on mount | Medium | BrandingProvider, LocalizationProvider fetch `/api/branding/public` and `/api/settings/display` – consider caching or deferring |
| Link prefetch for collapsed nav | Medium | Added `prefetch={true}` to sidebar links; consider prefetching common routes on dashboard mount |

### 2. Dashboard Layout (`src/app/dashboard/layout.tsx`)

- **"use client"** – Entire layout is client-rendered; no RSC benefits
- **Session check** – Blocks render until `useSession()` resolves; appropriate for auth
- **Mobile overlay** – Good UX; no performance concerns

**Recommendation:** Consider splitting the layout – keep a server layout shell and only mark interactive parts (header, sidebar) as client components. This is a larger refactor.

### 3. Heavy Pages

| Page | Lines | Heavy Imports | Suggestion |
|------|-------|---------------|------------|
| `dashboard/page.tsx` | ~900 | Recharts (AreaChart, PieChart, etc.) | Dynamic import chart section |
| `properties/page.tsx` | ~1200 | DataTable, GlobalSearch, PropertyStats, Image | Extract PropertyCard to separate file; consider dynamic import for DataTable |
| `tenants/page.tsx` | Similar pattern | DataTable, forms | Same pattern as properties |

### 4. Providers

| Provider | Fetches On Mount | Blocking? |
|----------|------------------|-----------|
| BrandingProvider | `/api/branding/public` | No – renders children, updates when ready |
| LocalizationProvider | `/api/settings/display`, `updateExchangeRates()` | Partially – `loading` state exists but exchange rates may block |
| UserAvatarProvider | Session only | No |

**Recommendation:** Add `stale-while-revalidate` or cache branding/display settings in localStorage with a TTL.

### 5. Loading States

- **Good:** 50+ `loading.tsx` files exist for route segments
- **Fixed:** `dashboard/loading.tsx` had invalid `text` prop on `PagePreloader`
- **Note:** Loading UI shows during navigation; if it feels slow, the delay is likely from JS compilation/bundle load, not the loading component

---

## Refactoring Opportunities

### High Priority

1. **Extract PropertyCard from properties page** – 280+ lines inline; move to `components/properties/PropertyCard.tsx`
2. **Dynamic import Recharts in dashboard** – Create `DashboardCharts.tsx` and load with `next/dynamic` and `ssr: false`
3. **Split properties page** – Extract filters, table columns, and view logic into custom hooks and sub-components

### Medium Priority

4. **Consolidate duplicate logic** – `getStatusColor`, `getStatusLabel`, `getTypeLabel` appear in multiple pages; move to `lib/utils/status-utils.ts`
5. **DataTable column definitions** – Extract from page components into `columns/property-columns.tsx` etc.
6. **Dashboard page** – Extract `getActivityIcon`, `getAlertStyles`, `formatTimeAgo` to shared utils

### Low Priority

7. **Consistent error boundaries** – Add `error.tsx` for key routes if not present
8. **Type safety** – Some `any` types in MobileHeader, handleTaskClick; tighten types

---

## Changes Applied

1. **`src/app/dashboard/loading.tsx`** – Removed invalid `text` prop from `PagePreloader`
2. **`src/components/layout/sidebar.tsx`** – Added `prefetch={true}` to `Link` for explicit prefetching

---

## Next Steps (Recommended)

1. **Test in production mode** – `npm run build && npm run start` to rule out dev compilation
2. **Add dynamic imports** – Lazy load Recharts and DataTable in the heaviest pages
3. **Profile with Chrome DevTools** – Use Performance tab to identify long tasks during navigation
4. **Consider NProgress or similar** – A thin progress bar at the top during route transitions improves perceived performance

---

## File Structure Notes

- **86 page files** – Good coverage; loading.tsx present for most routes
- **next.config.ts** – `optimizePackageImports` for lucide-react, recharts, date-fns, FullCalendar – good
- **No `prefetch={false}`** – Default prefetch is enabled; explicit `prefetch={true}` added for clarity
