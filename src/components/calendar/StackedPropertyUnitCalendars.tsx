"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AvailabilityCalendar,
  type CalendarBlock,
  type CalendarLease,
  type CalendarPricingRule,
  type CalendarRentalRequest,
} from "@/components/calendar/AvailabilityCalendar";
import { cn } from "@/lib/utils";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";

export type StackedUnitRef = { _id: string; unitNumber: string };

type UnitCalRow = {
  unitId: string;
  unitNumber: string;
  blocks: CalendarBlock[];
  pricingRules: CalendarPricingRule[];
  leases: CalendarLease[];
  rentalRequests: CalendarRentalRequest[];
};

export function StackedPropertyUnitCalendars({
  propertyId,
  units,
  baseRentPerNight = 0,
  defaultExpanded = true,
}: {
  propertyId: string;
  units: StackedUnitRef[];
  baseRentPerNight?: number;
  /** When true, stacked calendars load open (recommended for ops / phone support). */
  defaultExpanded?: boolean;
}) {
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;
  const [open, setOpen] = useState(defaultExpanded);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UnitCalRow[]>([]);

  const loadAll = useCallback(async () => {
    if (units.length === 0) return;
    setLoading(true);
    try {
      const results: UnitCalRow[] = await Promise.all(
        units.map(async (u) => {
          const [blocksRes, rulesRes, leasesRes, requestsRes] =
            await Promise.all([
              fetch(`/api/properties/${propertyId}/units/${u._id}/blocks`),
              fetch(
                `/api/properties/${propertyId}/units/${u._id}/pricing-rules?activeOnly=true`
              ),
              fetch(
                `/api/leases?propertyId=${propertyId}&unitId=${u._id}&status=active,pending`
              ).catch(() => null),
              fetch(
                `/api/rental-requests?propertyId=${propertyId}&unitId=${u._id}&status=pending`
              ).catch(() => null),
            ]);

          let blocks: CalendarBlock[] = [];
          if (blocksRes.ok) {
            const blocksData = await blocksRes.json();
            blocks = blocksData.data || [];
          }

          let pricingRules: CalendarPricingRule[] = [];
          if (rulesRes.ok) {
            const rulesData = await rulesRes.json();
            pricingRules = rulesData.data || [];
          }

          let leases: CalendarLease[] = [];
          if (leasesRes?.ok) {
            const leasesData = await leasesRes.json();
            const leasesArr =
              leasesData.data?.leases || leasesData.data || [];
            leases = leasesArr.map((l: Record<string, unknown>) => ({
              _id: String(l._id),
              startDate: String(l.startDate),
              endDate: String(l.endDate),
              status: String(l.status),
              tenantName:
                (l.tenantId as { firstName?: string; lastName?: string } | undefined)
                  ?.firstName
                  ? `${(l.tenantId as { firstName: string }).firstName} ${(l.tenantId as { lastName?: string }).lastName || ""}`
                  : undefined,
            }));
          }

          let rentalRequests: CalendarRentalRequest[] = [];
          if (requestsRes?.ok) {
            const requestsData = await requestsRes.json();
            const requestsArr =
              requestsData.data?.requests || requestsData.data || [];
            rentalRequests = Array.isArray(requestsArr) ? requestsArr : [];
          }

          return {
            unitId: u._id,
            unitNumber: u.unitNumber,
            blocks,
            pricingRules,
            leases,
            rentalRequests,
          };
        })
      );
      setRows(results);
    } finally {
      setLoading(false);
    }
  }, [propertyId, units]);

  useEffect(() => {
    if (open && rows.length === 0 && units.length > 0) {
      void loadAll();
    }
  }, [open, rows.length, units.length, loadAll]);

  if (units.length === 0) return null;

  const headingLabel =
    units.length === 1
      ? `Unit ${units[0].unitNumber} — availability`
      : "All units — stacked view";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        isLight
          ? "border-slate-200/80 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          : "border-white/10 bg-white/[0.04] shadow-inner"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-auto w-full justify-between gap-3 px-1 py-2 text-left font-medium",
          isLight ? "text-slate-900 hover:bg-slate-100" : "text-white hover:bg-white/10"
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <Layers
            className={cn(
              "h-4 w-4 shrink-0",
              isLight ? "text-slate-600" : "text-white/70"
            )}
          />
          <span>
            {headingLabel}
            <span
              className={cn(
                "mt-0.5 block text-xs font-normal",
                isLight ? "text-slate-500" : "text-white/55"
              )}
            >
              {units.length === 1
                ? "Same data as the tab below — quick glance while comparing dates"
                : "Read-only calendars for every unit in this property"}
            </span>
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 opacity-60" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        )}
      </Button>

      {open && (
        <div
          className={cn(
            "mt-4 space-y-8 border-t pt-6",
            isLight ? "border-slate-200/60" : "border-white/10"
          )}
        >
          {loading && (
            <p
              className={cn(
                "text-sm",
                isLight ? "text-slate-500" : "text-white/60"
              )}
            >
              Loading calendars…
            </p>
          )}
          {!loading &&
            rows.map((row) => (
              <div key={row.unitId} className="space-y-3">
                <h3
                  className={cn(
                    "text-sm font-semibold tracking-tight",
                    isLight ? "text-slate-800" : "text-white/90"
                  )}
                >
                  Unit {row.unitNumber}
                  <span
                    className={cn(
                      "ml-2 text-xs font-normal",
                      isLight ? "text-slate-500" : "text-white/50"
                    )}
                  >
                    bookings / blocks
                  </span>
                </h3>
                <AvailabilityCalendar
                  blocks={row.blocks}
                  pricingRules={row.pricingRules}
                  leases={row.leases}
                  rentalRequests={row.rentalRequests}
                  baseRentPerNight={baseRentPerNight}
                  readOnly
                  showPricing
                  showLegend={false}
                  monthsShown={1}
                  daySize="default"
                  selectionMode="drag"
                  className="w-full"
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
