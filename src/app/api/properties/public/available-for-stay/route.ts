/**
 * Public: properties that have at least one unit with no overlapping DateBlock or active Lease
 * for the stay window [checkIn, checkOut) (checkout day exclusive).
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Property, DateBlock, Lease } from "@/models";
import { LeaseStatus } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from "@/lib/api-utils";
import { calculatePropertyStatusFromUnits } from "@/utils/property-status-calculator";
import { stripUnitSecretsForPublicApi } from "@/lib/unit-access-secrets";
import { PropertyStatus } from "@/types";
import {
  parseDateOnlyInput,
  stayRangesOverlap,
} from "@/lib/stay-date-range";

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addCalendarDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function dateOnlyLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function nightCountInclusiveStart(stayStart: Date, stayEndExclusive: Date): number {
  const d0 = dateOnlyLocal(stayStart).getTime();
  const d1 = dateOnlyLocal(stayEndExclusive).getTime();
  return Math.max(1, Math.round((d1 - d0) / 86400000));
}

function passesPublicFilters(
  p: Record<string, unknown>,
  filters: {
    type?: string;
    neighborhood?: string;
    search?: string;
    minRent?: number;
    maxRent?: number;
  }
): boolean {
  if (filters.type && String(p.type || "") !== filters.type) return false;
  if (filters.neighborhood) {
    const n = String(p.neighborhood || "").toLowerCase();
    if (!n.includes(filters.neighborhood.toLowerCase())) return false;
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    const name = String(p.name || "").toLowerCase();
    const desc = String(p.description || "").toLowerCase();
    const addr = (p.address as Record<string, string> | undefined) || {};
    const blob = [
      name,
      desc,
      addr.city,
      addr.street,
      addr.state,
      addr.zipCode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!blob.includes(q)) return false;
  }
  const units = Array.isArray(p.units) ? p.units : [];
  if (filters.minRent != null || filters.maxRent != null) {
    const ok = units.some((u: { rentAmount?: number }) => {
      const r = u.rentAmount;
      if (typeof r !== "number") return false;
      if (filters.minRent != null && r < filters.minRent) return false;
      if (filters.maxRent != null && r > filters.maxRent) return false;
      return true;
    });
    if (!ok) return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const checkInRaw = searchParams.get("checkIn") || "";
    const checkOutRaw = searchParams.get("checkOut") || "";
    const bedrooms = searchParams.get("bedrooms")
      ? parseInt(searchParams.get("bedrooms")!, 10)
      : undefined;
    const parkingTypeRaw = (searchParams.get("parkingType") || "").toLowerCase();
    const parkingTypes = ["garage", "covered", "open", "street"] as const;
    const parkingType = parkingTypes.includes(parkingTypeRaw as (typeof parkingTypes)[number])
      ? parkingTypeRaw
      : undefined;
    const type = searchParams.get("type") || undefined;
    const neighborhood = searchParams.get("neighborhood") || undefined;
    const search = searchParams.get("search") || undefined;
    const minRent = searchParams.get("minRent")
      ? parseFloat(searchParams.get("minRent")!)
      : undefined;
    const maxRent = searchParams.get("maxRent")
      ? parseFloat(searchParams.get("maxRent")!)
      : undefined;

    const stayStart = parseDateOnlyInput(checkInRaw);
    const stayEnd = parseDateOnlyInput(checkOutRaw);
    if (!stayStart || !stayEnd) {
      return createErrorResponse(
        "checkIn and checkOut are required (YYYY-MM-DD)",
        400
      );
    }
    if (stayStart.getTime() >= stayEnd.getTime()) {
      return createErrorResponse("checkOut must be after checkIn", 400);
    }

    const filterBag = {
      type,
      neighborhood,
      search,
      minRent: minRent != null && !Number.isNaN(minRent) ? minRent : undefined,
      maxRent: maxRent != null && !Number.isNaN(maxRent) ? maxRent : undefined,
    };

    const [blocks, leases, propertiesRaw] = await Promise.all([
      DateBlock.find({
        isActive: true,
        endDate: { $gt: stayStart },
        startDate: { $lt: stayEnd },
      })
        .select("propertyId unitId startDate endDate")
        .lean(),
      Lease.find({
        deletedAt: null,
        status: LeaseStatus.ACTIVE,
        endDate: { $gt: stayStart },
        startDate: { $lt: stayEnd },
      })
        .select("propertyId unitId startDate endDate")
        .lean(),
      Property.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(250).lean(),
    ]);

    const properties = (propertiesRaw as Record<string, unknown>[]).filter((p) =>
      passesPublicFilters(p, filterBag)
    );

    type AvailableUnit = { unitId: string; unitNumber?: string };
    const rows: {
      property: (typeof properties)[0];
      availableUnits: AvailableUnit[];
    }[] = [];

    for (const property of properties) {
      const p = property as Record<string, unknown> & {
        _id: { toString: () => string };
        units?: Array<Record<string, unknown> & { unitNumber?: unknown }>;
        parking?: { type?: string };
      };
      const pid = String(p._id);
      const units = Array.isArray(p.units) ? p.units : [];

      const availableUnits: AvailableUnit[] = [];

      for (const u of units) {
        const uid = u._id ? String(u._id) : "";
        if (!uid) continue;

        const unitParking = String(
          (u as { parking?: { type?: string } }).parking?.type ||
            p.parking?.type ||
            "open"
        ).toLowerCase();
        if (parkingType && unitParking !== parkingType) {
          continue;
        }

        if (
          typeof bedrooms === "number" &&
          !Number.isNaN(bedrooms) &&
          typeof u.bedrooms === "number" &&
          u.bedrooms < bedrooms
        ) {
          continue;
        }

        const blockHit = blocks.some((b) => {
          if (String(b.propertyId) !== pid || String(b.unitId) !== uid) {
            return false;
          }
          return stayRangesOverlap(
            stayStart,
            stayEnd,
            new Date(b.startDate),
            new Date(b.endDate)
          );
        });
        if (blockHit) continue;

        const leaseHit = leases.some((l) => {
          if (String(l.propertyId) !== pid || String(l.unitId) !== uid) {
            return false;
          }
          return stayRangesOverlap(
            stayStart,
            stayEnd,
            new Date(l.startDate),
            new Date(l.endDate)
          );
        });
        if (leaseHit) continue;

        const unum = u.unitNumber;
        availableUnits.push({
          unitId: uid,
          unitNumber: typeof unum === "string" ? unum : String(unum ?? ""),
        });
      }

      if (availableUnits.length) {
        rows.push({ property, availableUnits });
      }
    }

    const shaped = rows.map(({ property, availableUnits }) => {
      const copy = { ...property } as Record<string, unknown>;
      copy.availableUnits = availableUnits;
      const units = copy.units as Array<{ status?: PropertyStatus }> | undefined;
      if (Array.isArray(units) && units.length > 0) {
        const unitStatuses = units
          .map((u) => u?.status)
          .filter((s): s is PropertyStatus =>
            Object.values(PropertyStatus).includes(s as PropertyStatus)
          );
        if (unitStatuses.length > 0) {
          copy.status = calculatePropertyStatusFromUnits(unitStatuses);
        }
      }
      if (Array.isArray(copy.units)) {
        copy.units = copy.units.map((u: Record<string, unknown>) =>
          stripUnitSecretsForPublicApi(u)
        );
      }
      return copy;
    });

    const nights = nightCountInclusiveStart(stayStart, stayEnd);
    const zeroResultHints: Array<{
      suggestedCheckIn: string;
      suggestedCheckOut: string;
      label?: string;
    }> = [];

    if (shaped.length === 0) {
      const overlapEnds: Date[] = [];
      for (const b of blocks) {
        if (
          stayRangesOverlap(
            stayStart,
            stayEnd,
            new Date(b.startDate),
            new Date(b.endDate)
          )
        ) {
          overlapEnds.push(dateOnlyLocal(new Date(b.endDate)));
        }
      }
      for (const l of leases) {
        if (
          stayRangesOverlap(
            stayStart,
            stayEnd,
            new Date(l.startDate),
            new Date(l.endDate)
          )
        ) {
          overlapEnds.push(dateOnlyLocal(new Date(l.endDate)));
        }
      }

      if (overlapEnds.length > 0) {
        let maxEnd = overlapEnds[0];
        for (const e of overlapEnds) {
          if (e.getTime() > maxEnd.getTime()) maxEnd = e;
        }
        let sugStart = maxEnd;
        if (sugStart.getTime() <= stayStart.getTime()) {
          sugStart = addCalendarDays(stayStart, 1);
        }
        const sugEnd = addCalendarDays(sugStart, nights);
        if (sugEnd.getTime() > sugStart.getTime()) {
          zeroResultHints.push({
            suggestedCheckIn: toYmd(sugStart),
            suggestedCheckOut: toYmd(sugEnd),
            label: "After current bookings (same trip length)",
          });
        }
      }

      const laterStart = addCalendarDays(stayStart, 2);
      const laterEnd = addCalendarDays(stayEnd, 2);
      zeroResultHints.push({
        suggestedCheckIn: toYmd(laterStart),
        suggestedCheckOut: toYmd(laterEnd),
        label: "Same length · start 2 days later",
      });

      const extendedEnd = addCalendarDays(stayEnd, 2);
      zeroResultHints.push({
        suggestedCheckIn: checkInRaw,
        suggestedCheckOut: toYmd(extendedEnd),
        label: "Keep check-in · +2 nights",
      });
    }

    const dedup = new Set<string>();
    const hintsDeduped = zeroResultHints.filter((h) => {
      const k = `${h.suggestedCheckIn}|${h.suggestedCheckOut}|${h.label || ""}`;
      if (dedup.has(k)) return false;
      dedup.add(k);
      return true;
    });

    return createSuccessResponse(
      {
        properties: shaped,
        checkIn: checkInRaw,
        checkOut: checkOutRaw,
        count: shaped.length,
        zeroResultHints: hintsDeduped.length ? hintsDeduped : undefined,
      },
      "Available properties for stay window"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
