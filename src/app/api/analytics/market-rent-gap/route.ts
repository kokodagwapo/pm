/**
 * SmartStartPM — Market Rent Gap Alerts API
 * Returns active leases expiring within 60 days whose rent is >10% below
 * the per-property market rent (from PropertySystems.marketRent override) or
 * falls back to the unit-level rent average in the portfolio.
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Property, Lease } from "@/models";
import { UserRole, LeaseStatus } from "@/types";
import {
  createSuccessResponse,
  handleApiError,
  withRoleAndDB,
} from "@/lib/api-utils";
import PropertySystems from "@/models/PropertySystems";

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const thresholdPct = Number(searchParams.get("threshold") ?? "10") / 100;

    const now = new Date();
    const sixtyDaysOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Property scope
    const propertyQuery: Record<string, unknown> = { deletedAt: null };
    if (user.role === UserRole.OWNER) propertyQuery.ownerId = user.id;
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      propertyQuery._id = new mongoose.Types.ObjectId(propertyId);
    }

    const properties = await Property.find(propertyQuery).lean();
    const propertyIds = properties.map((p) => p._id as mongoose.Types.ObjectId);

    if (!propertyIds.length) {
      return createSuccessResponse({ alerts: [], marketRent: 0, alertCount: 0, expiringCount: 0 });
    }

    // Load per-property market rent overrides from PropertySystems
    const propertySystems = await PropertySystems.find(
      { propertyId: { $in: propertyIds } },
      { propertyId: 1, marketRent: 1 }
    ).lean();

    const perPropertyMarketRent = new Map<string, number>(
      propertySystems
        .filter((ps) => ps.marketRent != null && ps.marketRent > 0)
        .map((ps) => [ps.propertyId.toString(), ps.marketRent as number])
    );

    // Compute portfolio fallback market rent = average unit rent from property.units
    let totalRent = 0;
    let unitCount = 0;
    const propertyMap = new Map<string, (typeof properties)[0]>();

    for (const p of properties) {
      const pid = (p._id as mongoose.Types.ObjectId).toString();
      propertyMap.set(pid, p);

      if (!perPropertyMarketRent.has(pid)) {
        if (p.isMultiUnit && Array.isArray(p.units)) {
          for (const u of p.units as { rentAmount?: number }[]) {
            if (u.rentAmount && u.rentAmount > 0) {
              totalRent += u.rentAmount;
              unitCount++;
            }
          }
        }
      }
    }

    const portfolioAvgRent = unitCount > 0 ? totalRent / unitCount : 0;

    // Leases expiring in 60 days
    const expiringLeases = await Lease.find({
      propertyId: { $in: propertyIds },
      status: LeaseStatus.ACTIVE,
      endDate: { $gte: now, $lte: sixtyDaysOut },
    })
      .select("propertyId unitId tenantId terms.rentAmount endDate")
      .populate("tenantId", "firstName lastName email")
      .lean();

    const alerts = expiringLeases.map((lease) => {
      const rent = (lease as { terms?: { rentAmount?: number } }).terms?.rentAmount ?? 0;
      const pid = lease.propertyId.toString();

      // Use per-property override if set, otherwise portfolio average
      const marketRentForProperty = perPropertyMarketRent.get(pid) ?? portfolioAvgRent;
      const marketRentSource = perPropertyMarketRent.has(pid) ? "property-override" : "portfolio-average";

      const gap = marketRentForProperty > 0 ? (marketRentForProperty - rent) / marketRentForProperty : 0;
      const property = propertyMap.get(pid);

      return {
        leaseId: (lease._id as mongoose.Types.ObjectId).toString(),
        propertyId: pid,
        propertyName: property?.name ?? "Unknown Property",
        unitId: lease.unitId?.toString() ?? null,
        tenantName: (() => {
          const t = lease.tenantId as { firstName?: string; lastName?: string } | null;
          if (!t) return "Unknown Tenant";
          return `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim();
        })(),
        currentRent: rent,
        marketRent: Math.round(marketRentForProperty),
        marketRentSource,
        gapPercent: Math.round(gap * 1000) / 10,
        potentialUplift: Math.max(0, Math.round(marketRentForProperty - rent)),
        endDate: lease.endDate,
        daysUntilExpiry: Math.ceil(
          ((lease.endDate as Date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        ),
        isBelowMarket: gap > thresholdPct,
      };
    });

    const belowMarket = alerts.filter((a) => a.isBelowMarket);
    belowMarket.sort((a, b) => b.gapPercent - a.gapPercent);

    const totalPotentialUplift = belowMarket.reduce((s, a) => s + a.potentialUplift, 0);

    return createSuccessResponse({
      alerts: belowMarket,
      allExpiringLeases: alerts,
      marketRent: Math.round(portfolioAvgRent),
      thresholdPct: Math.round(thresholdPct * 100),
      alertCount: belowMarket.length,
      expiringCount: expiringLeases.length,
      totalPotentialUplift,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
