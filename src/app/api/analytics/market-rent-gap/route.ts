/**
 * SmartStartPM — Market Rent Gap Alerts API
 * Returns active leases expiring within 60 days whose rent is >10% below
 * the portfolio market rate (average unit rent amount).
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

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

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
      return createSuccessResponse({ alerts: [], marketRent: 0, alertCount: 0 });
    }

    // Compute market rent = average of all unit rentAmounts in portfolio
    let totalRent = 0;
    let unitCount = 0;
    const propertyMap = new Map<string, (typeof properties)[0]>();
    for (const p of properties) {
      propertyMap.set((p._id as mongoose.Types.ObjectId).toString(), p);
      if (p.isMultiUnit && Array.isArray(p.units)) {
        for (const u of p.units as { rentAmount?: number }[]) {
          if (u.rentAmount && u.rentAmount > 0) {
            totalRent += u.rentAmount;
            unitCount++;
          }
        }
      }
    }
    const marketRent = unitCount > 0 ? totalRent / unitCount : 0;

    // Leases expiring in 60 days
    const expiringLeases = await Lease.find({
      propertyId: { $in: propertyIds },
      status: LeaseStatus.ACTIVE,
      endDate: { $gte: now, $lte: sixtyDaysOut },
    })
      .select("propertyId unitId tenantId terms.rentAmount endDate")
      .populate("tenantId", "firstName lastName email")
      .lean();

    const alerts = expiringLeases
      .map((lease) => {
        const rent = (lease as { terms?: { rentAmount?: number } }).terms?.rentAmount ?? 0;
        const gap = marketRent > 0 ? (marketRent - rent) / marketRent : 0;
        const property = propertyMap.get(lease.propertyId.toString());

        return {
          leaseId: (lease._id as mongoose.Types.ObjectId).toString(),
          propertyId: lease.propertyId.toString(),
          propertyName: property?.name || "Unknown Property",
          unitId: lease.unitId?.toString() ?? null,
          tenantName: (() => {
            const t = lease.tenantId as { firstName?: string; lastName?: string } | null;
            if (!t) return "Unknown Tenant";
            return `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim();
          })(),
          currentRent: rent,
          marketRent: Math.round(marketRent),
          gapPercent: Math.round(gap * 1000) / 10,
          endDate: lease.endDate,
          daysUntilExpiry: Math.ceil(
            ((lease.endDate as Date).getTime() - now.getTime()) /
              (24 * 60 * 60 * 1000)
          ),
          isBelowMarket: gap > 0.1,
        };
      })
      .filter((a) => a.isBelowMarket)
      .sort((a, b) => b.gapPercent - a.gapPercent);

    return createSuccessResponse({
      alerts,
      marketRent: Math.round(marketRent),
      alertCount: alerts.length,
      expiringCount: expiringLeases.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
