/**
 * SmartStartPM — Portfolio Health Score API
 * Computes a 0-100 composite score for the property portfolio.
 *
 * Scoring weights:
 *   Occupancy rate        30 pts
 *   Collection rate       25 pts
 *   Maintenance health    20 pts  (completion rate + avg resolution days)
 *   Rent alignment        15 pts  (leases at or near market rent)
 *   Lease pipeline        10 pts  (renewals vs expiries)
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Property, Lease, Payment, MaintenanceRequest } from "@/models";
import { UserRole, PaymentStatus, LeaseStatus, MaintenanceStatus } from "@/types";
import {
  createSuccessResponse,
  handleApiError,
  withRoleAndDB,
} from "@/lib/api-utils";

const PAID_STATUSES = [PaymentStatus.PAID, PaymentStatus.COMPLETED];

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // ── 1. Load properties ────────────────────────────────────────────────────
    const propertyQuery: Record<string, unknown> = { deletedAt: null };
    if (user.role === UserRole.OWNER) propertyQuery.ownerId = user.id;
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      propertyQuery._id = new mongoose.Types.ObjectId(propertyId);
    }

    const properties = await Property.find(propertyQuery).lean();
    const propertyIds = properties.map((p) => p._id as mongoose.Types.ObjectId);

    if (!propertyIds.length) {
      return createSuccessResponse({
        score: 0,
        grade: "N/A",
        components: [],
        insights: [],
        propertyBreakdown: [],
        calculatedAt: now,
      });
    }

    // ── 2. Occupancy (30 pts) ─────────────────────────────────────────────────
    const totalUnits = properties.reduce((s, p) => {
      if (p.isMultiUnit) return s + (p.units?.length || p.totalUnits || 1);
      return s + 1;
    }, 0);

    const activeLeases = await Lease.find({
      propertyId: { $in: propertyIds },
      status: LeaseStatus.ACTIVE,
    })
      .select("propertyId unitId terms.rentAmount endDate")
      .lean();

    const occupancyRate =
      totalUnits > 0 ? (activeLeases.length / totalUnits) * 100 : 0;
    const occupancyScore = clamp((occupancyRate / 100) * 30);

    // ── 3. Collection rate (25 pts) ───────────────────────────────────────────
    const [paidSum, totalSum] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            deletedAt: null,
            status: { $in: PAID_STATUSES },
            $expr: { $gte: [{ $ifNull: ["$paidDate", "$dueDate"] }, ninetyDaysAgo] },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            deletedAt: null,
            dueDate: { $gte: ninetyDaysAgo, $lte: now },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const collected = paidSum[0]?.total ?? 0;
    const expected = totalSum[0]?.total ?? 0;
    const collectionRate = expected > 0 ? (collected / expected) * 100 : 100;
    const collectionScore = clamp((collectionRate / 100) * 25);

    // ── 4. Maintenance health (20 pts) ────────────────────────────────────────
    const [maintTotal, maintCompleted, maintAvgDays] = await Promise.all([
      MaintenanceRequest.countDocuments({
        propertyId: { $in: propertyIds },
        deletedAt: null,
        createdAt: { $gte: ninetyDaysAgo },
      }),
      MaintenanceRequest.countDocuments({
        propertyId: { $in: propertyIds },
        deletedAt: null,
        status: MaintenanceStatus.COMPLETED,
        createdAt: { $gte: ninetyDaysAgo },
      }),
      MaintenanceRequest.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            deletedAt: null,
            status: MaintenanceStatus.COMPLETED,
            completedDate: { $exists: true },
            createdAt: { $gte: ninetyDaysAgo },
          },
        },
        {
          $project: {
            days: {
              $divide: [
                { $subtract: ["$completedDate", "$createdAt"] },
                86400000,
              ],
            },
          },
        },
        { $group: { _id: null, avgDays: { $avg: "$days" } } },
      ]),
    ]);

    const completionRate = maintTotal > 0 ? (maintCompleted / maintTotal) * 100 : 100;
    const avgResolutionDays = maintAvgDays[0]?.avgDays ?? 3;
    // Resolution score: excellent ≤3 days, poor ≥14 days
    const resolutionScore = clamp(100 - ((avgResolutionDays - 3) / 11) * 100);
    const maintScore = clamp(((completionRate * 0.6 + resolutionScore * 0.4) / 100) * 20);

    // ── 5. Rent alignment (15 pts) ────────────────────────────────────────────
    // Market rent = average rentAmount across all portfolio units
    let marketRent = 0;
    let unitCount = 0;
    for (const p of properties) {
      if (p.isMultiUnit && Array.isArray(p.units)) {
        for (const u of p.units as { rentAmount?: number }[]) {
          if (u.rentAmount && u.rentAmount > 0) {
            marketRent += u.rentAmount;
            unitCount++;
          }
        }
      }
    }
    marketRent = unitCount > 0 ? marketRent / unitCount : 0;

    let atMarket = 0;
    let below10pct = 0;
    for (const lease of activeLeases) {
      const rent = (lease as { terms?: { rentAmount?: number } }).terms?.rentAmount ?? 0;
      if (marketRent > 0) {
        const gap = (marketRent - rent) / marketRent;
        if (gap <= 0.1) atMarket++;
        else below10pct++;
      } else {
        atMarket++;
      }
    }

    const totalActive = activeLeases.length || 1;
    const rentAlignmentRate = (atMarket / totalActive) * 100;
    const rentScore = clamp((rentAlignmentRate / 100) * 15);

    // ── 6. Lease pipeline (10 pts) ─────────────────────────────────────────────
    const sixtyDaysOut = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const [expiringCount, renewedCount] = await Promise.all([
      Lease.countDocuments({
        propertyId: { $in: propertyIds },
        status: LeaseStatus.ACTIVE,
        endDate: { $gte: now, $lte: sixtyDaysOut },
      }),
      Lease.countDocuments({
        propertyId: { $in: propertyIds },
        renewedLeaseId: { $exists: true },
        createdAt: { $gte: ninetyDaysAgo },
      }),
    ]);

    const pipelineScore =
      expiringCount === 0
        ? 10
        : clamp((1 - expiringCount / Math.max(activeLeases.length, 1)) * 10 + renewedCount * 2, 0, 10);

    // ── 7. Composite score ────────────────────────────────────────────────────
    const totalScore = Math.round(
      occupancyScore + collectionScore + maintScore + rentScore + pipelineScore
    );

    const grade =
      totalScore >= 90
        ? "A"
        : totalScore >= 80
        ? "B"
        : totalScore >= 70
        ? "C"
        : totalScore >= 60
        ? "D"
        : "F";

    // ── 8. Per-property breakdown ──────────────────────────────────────────────
    const leasesByProperty = new Map<string, number>();
    for (const l of activeLeases) {
      const key = l.propertyId.toString();
      leasesByProperty.set(key, (leasesByProperty.get(key) ?? 0) + 1);
    }

    const propertyBreakdown = properties.map((p) => {
      const id = (p._id as mongoose.Types.ObjectId).toString();
      const units = p.isMultiUnit ? p.units?.length || p.totalUnits || 1 : 1;
      const occupied = leasesByProperty.get(id) ?? 0;
      const occ = units > 0 ? Math.round((occupied / units) * 1000) / 10 : 0;
      return {
        id,
        name: p.name || "Unnamed Property",
        units,
        occupied,
        occupancyRate: occ,
        yearBuilt: p.yearBuilt ?? null,
      };
    });

    // ── 9. Insights ───────────────────────────────────────────────────────────
    const insights: string[] = [];
    if (occupancyRate < 80)
      insights.push(`Occupancy at ${occupancyRate.toFixed(1)}% — consider pricing adjustments to fill ${totalUnits - activeLeases.length} vacant unit(s).`);
    if (collectionRate < 90)
      insights.push(`Collection rate ${collectionRate.toFixed(1)}% — ${Math.round(expected - collected).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })} in outstanding balances need follow-up.`);
    if (avgResolutionDays > 7)
      insights.push(`Average maintenance resolution is ${avgResolutionDays.toFixed(1)} days — aim for under 7 days to improve tenant satisfaction.`);
    if (below10pct > 0)
      insights.push(`${below10pct} active lease(s) are priced 10%+ below market rent of ${marketRent.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}.`);
    if (expiringCount > 0)
      insights.push(`${expiringCount} lease(s) expire within 60 days — start renewal conversations now.`);
    if (insights.length === 0)
      insights.push("Portfolio is performing well across all key metrics.");

    return createSuccessResponse({
      score: totalScore,
      grade,
      components: [
        {
          label: "Occupancy",
          score: Math.round(occupancyScore),
          maxScore: 30,
          value: `${occupancyRate.toFixed(1)}%`,
          status: occupancyRate >= 90 ? "good" : occupancyRate >= 75 ? "fair" : "poor",
        },
        {
          label: "Collections",
          score: Math.round(collectionScore),
          maxScore: 25,
          value: `${collectionRate.toFixed(1)}%`,
          status: collectionRate >= 95 ? "good" : collectionRate >= 85 ? "fair" : "poor",
        },
        {
          label: "Maintenance",
          score: Math.round(maintScore),
          maxScore: 20,
          value: `${completionRate.toFixed(0)}% resolved`,
          status: completionRate >= 90 ? "good" : completionRate >= 70 ? "fair" : "poor",
        },
        {
          label: "Rent Alignment",
          score: Math.round(rentScore),
          maxScore: 15,
          value: `${rentAlignmentRate.toFixed(0)}% at market`,
          status: rentAlignmentRate >= 90 ? "good" : rentAlignmentRate >= 70 ? "fair" : "poor",
        },
        {
          label: "Lease Pipeline",
          score: Math.round(pipelineScore),
          maxScore: 10,
          value: `${expiringCount} expiring`,
          status: expiringCount === 0 ? "good" : expiringCount <= 2 ? "fair" : "poor",
        },
      ],
      insights,
      propertyBreakdown,
      meta: {
        totalProperties: properties.length,
        totalUnits,
        activeLeases: activeLeases.length,
        expiringIn60Days: expiringCount,
        marketRent,
      },
      calculatedAt: now,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
