/**
 * SmartStartPM — Portfolio Health Score API
 * Computes a 0-100 composite score for the property portfolio.
 *
 * Scoring weights:
 *   Occupancy rate        25 pts
 *   Collection rate       20 pts  (collection rate + delinquency count penalty)
 *   Maintenance health    20 pts  (completion rate + avg resolution days + backlog age)
 *   Rent alignment        15 pts  (leases at or near market rent)
 *   Lease pipeline        10 pts  (renewals vs expiries)
 *   Delinquency health    10 pts  (overdue payment count and severity)
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
import PortfolioHealthSnapshot from "@/models/PortfolioHealthSnapshot";

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
    const occupancyScore = clamp((occupancyRate / 100) * 25);

    // ── 3. Collection rate (20 pts) + Delinquency health (10 pts) ─────────────
    const OVERDUE_STATUSES = [
      PaymentStatus.OVERDUE,
      PaymentStatus.LATE,
      PaymentStatus.SEVERELY_OVERDUE,
      PaymentStatus.GRACE_PERIOD,
    ];

    const [paidSum, totalSum, delinquencyData] = await Promise.all([
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
      // Delinquency: count overdue payments + their total amount
      Payment.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            deletedAt: null,
            status: { $in: OVERDUE_STATUSES },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalOverdue: { $sum: "$amount" },
            severeCount: {
              $sum: {
                $cond: [{ $eq: ["$status", PaymentStatus.SEVERELY_OVERDUE] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const collected = paidSum[0]?.total ?? 0;
    const expected = totalSum[0]?.total ?? 0;
    const collectionRate = expected > 0 ? (collected / expected) * 100 : 100;
    const collectionScore = clamp((collectionRate / 100) * 20);

    // Delinquency health: 10 pts — penalize by delinquent count relative to unit count
    const delinquentCount = delinquencyData[0]?.count ?? 0;
    const severelyOverdueCount = delinquencyData[0]?.severeCount ?? 0;
    const delinquencyRate = totalUnits > 0 ? (delinquentCount / totalUnits) : 0;
    // 10 pts at 0% delinquency, 0 pts at ≥30% delinquency; severe pays double penalty
    const delinquencyScore = clamp(10 - delinquencyRate * 33.3 - severelyOverdueCount * 2);

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

    // Maintenance backlog age: count open requests older than 14 days (aged backlog)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const agedBacklogCount = await MaintenanceRequest.countDocuments({
      propertyId: { $in: propertyIds },
      deletedAt: null,
      status: { $nin: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED] },
      createdAt: { $lte: fourteenDaysAgo },
    });
    // Backlog age penalty: 0 pts deducted for 0 aged items; 20 pts at ≥10 aged items
    const backlogAgePenalty = clamp(agedBacklogCount * 2, 0, 20);
    const maintScore = clamp(((completionRate * 0.6 + resolutionScore * 0.4) / 100) * 20 - backlogAgePenalty * 0.2);

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

    // ── 7. Composite score (25 + 20 + 20 + 15 + 10 + 10 = 100) ──────────────
    const totalScore = Math.round(
      occupancyScore + collectionScore + maintScore + rentScore + pipelineScore + delinquencyScore
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
    if (delinquentCount > 0)
      insights.push(`${delinquentCount} overdue payment(s) — ${severelyOverdueCount > 0 ? `${severelyOverdueCount} severely overdue (30+ days). ` : ""}Review and initiate collections process.`);
    if (agedBacklogCount > 0)
      insights.push(`${agedBacklogCount} maintenance request(s) open for more than 14 days — aged backlog reduces score and tenant satisfaction.`);
    if (avgResolutionDays > 7)
      insights.push(`Average maintenance resolution is ${avgResolutionDays.toFixed(1)} days — aim for under 7 days to improve tenant satisfaction.`);
    if (below10pct > 0)
      insights.push(`${below10pct} active lease(s) are priced 10%+ below market rent of ${marketRent.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 })}.`);
    if (expiringCount > 0)
      insights.push(`${expiringCount} lease(s) expire within 60 days — start renewal conversations now.`);
    if (insights.length === 0)
      insights.push("Portfolio is performing well across all key metrics.");

    const components = [
      {
        label: "Occupancy",
        score: Math.round(occupancyScore),
        maxScore: 25,
        value: `${occupancyRate.toFixed(1)}%`,
        status: (occupancyRate >= 90 ? "good" : occupancyRate >= 75 ? "fair" : "poor") as "good" | "fair" | "poor",
      },
      {
        label: "Collections",
        score: Math.round(collectionScore),
        maxScore: 20,
        value: `${collectionRate.toFixed(1)}%`,
        status: (collectionRate >= 95 ? "good" : collectionRate >= 85 ? "fair" : "poor") as "good" | "fair" | "poor",
      },
      {
        label: "Maintenance",
        score: Math.round(maintScore),
        maxScore: 20,
        value: `${completionRate.toFixed(0)}% resolved`,
        detail: `${agedBacklogCount} aged >14d`,
        status: (completionRate >= 90 && agedBacklogCount === 0 ? "good" : completionRate >= 70 ? "fair" : "poor") as "good" | "fair" | "poor",
      },
      {
        label: "Rent Alignment",
        score: Math.round(rentScore),
        maxScore: 15,
        value: `${rentAlignmentRate.toFixed(0)}% at market`,
        status: (rentAlignmentRate >= 90 ? "good" : rentAlignmentRate >= 70 ? "fair" : "poor") as "good" | "fair" | "poor",
      },
      {
        label: "Lease Pipeline",
        score: Math.round(pipelineScore),
        maxScore: 10,
        value: `${expiringCount} expiring`,
        status: (expiringCount === 0 ? "good" : expiringCount <= 2 ? "fair" : "poor") as "good" | "fair" | "poor",
      },
      {
        label: "Delinquency",
        score: Math.round(delinquencyScore),
        maxScore: 10,
        value: `${delinquentCount} overdue`,
        detail: severelyOverdueCount > 0 ? `${severelyOverdueCount} severely overdue` : undefined,
        status: (delinquentCount === 0 ? "good" : delinquentCount <= 2 ? "fair" : "poor") as "good" | "fair" | "poor",
      },
    ];

    // ── 10. Persist daily snapshot (fire-and-forget) ──────────────────────────
    const portfolioKey = propertyId ? `property:${propertyId}` : `user:${user.id}`;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Save at most one snapshot per calendar day per portfolio scope
    PortfolioHealthSnapshot.findOneAndUpdate(
      { portfolioKey, date: { $gte: todayStart } },
      {
        $setOnInsert: {
          date: now,
          managerId: new mongoose.Types.ObjectId(user.id),
          portfolioKey,
          score: totalScore,
          grade,
          components,
          meta: {
            totalProperties: properties.length,
            totalUnits,
            activeLeases: activeLeases.length,
            occupancyRate,
            collectionRate,
            expiringIn60Days: expiringCount,
            delinquentCount,
            agedBacklogCount,
          },
        },
      },
      { upsert: true, new: false }
    ).catch(() => undefined);

    // ── 11. Fetch 30-day history for trend sparkline ──────────────────────────
    const historyStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const history = await PortfolioHealthSnapshot.find(
      { portfolioKey, date: { $gte: historyStart } },
      { date: 1, score: 1, grade: 1 }
    )
      .sort({ date: 1 })
      .limit(30)
      .lean();

    const prevScore = history.length >= 2 ? history[history.length - 2].score : null;
    const trend = prevScore !== null ? totalScore - prevScore : 0;

    return createSuccessResponse({
      score: totalScore,
      grade,
      trend,
      components,
      insights,
      propertyBreakdown,
      history: history.map((h) => ({
        date: h.date,
        score: h.score,
        grade: h.grade,
      })),
      meta: {
        totalProperties: properties.length,
        totalUnits,
        activeLeases: activeLeases.length,
        expiringIn60Days: expiringCount,
        marketRent,
        occupancyRate,
        collectionRate,
        delinquentCount,
        severelyOverdueCount,
        agedBacklogCount,
      },
      calculatedAt: now,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
