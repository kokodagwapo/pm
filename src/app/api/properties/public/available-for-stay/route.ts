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
import { PropertyStatus } from "@/types";
import {
  parseDateOnlyInput,
  stayRangesOverlap,
} from "@/lib/stay-date-range";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const checkInRaw = searchParams.get("checkIn") || "";
    const checkOutRaw = searchParams.get("checkOut") || "";
    const bedrooms = searchParams.get("bedrooms")
      ? parseInt(searchParams.get("bedrooms")!, 10)
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

    const [blocks, leases, properties] = await Promise.all([
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

    const available: typeof properties = [];

    for (const property of properties) {
      const p = property as Record<string, unknown> & { _id: { toString: () => string }; units?: Array<Record<string, unknown>> };
      const pid = String(p._id);
      const units = Array.isArray(p.units) ? p.units : [];

      let hasUnit = false;
      for (const u of units) {
        const uid = u._id ? String(u._id) : "";
        if (!uid) continue;

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

        hasUnit = true;
        break;
      }

      if (hasUnit) {
        available.push(property);
      }
    }

    const shaped = available.map((property: Record<string, unknown>) => {
      const copy = { ...property };
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
      return copy;
    });

    return createSuccessResponse(
      {
        properties: shaped,
        checkIn: checkInRaw,
        checkOut: checkOutRaw,
        count: shaped.length,
      },
      "Available properties for stay window"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
