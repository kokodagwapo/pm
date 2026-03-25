/**
 * SmartStartPM — Utility Cost Anomaly Detection API
 *
 * Detects abnormal spikes in utility-related maintenance and vendor costs.
 * Utility categories: Electrical, Plumbing, HVAC, Pest Control.
 *
 * Algorithm: Compare current month's spend in each utility category
 * against the 3-month rolling average. Flag if spend is ≥30% above baseline.
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Property, MaintenanceRequest } from "@/models";
import { UserRole } from "@/types";
import {
  createSuccessResponse,
  handleApiError,
  withRoleAndDB,
} from "@/lib/api-utils";
import VendorJob from "@/models/VendorJob";

const UTILITY_CATEGORIES = ["Electrical", "Plumbing", "HVAC", "Pest Control", "Cleaning"];
const SPIKE_THRESHOLD = 0.30;

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // Property scope
    const propertyQuery: Record<string, unknown> = { deletedAt: null };
    if (user.role === UserRole.OWNER) propertyQuery.ownerId = user.id;
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      propertyQuery._id = new mongoose.Types.ObjectId(propertyId);
    }

    const properties = await Property.find(propertyQuery).select("_id name").lean();
    const propertyIds = properties.map((p) => p._id as mongoose.Types.ObjectId);
    const propertyNameMap = new Map(
      properties.map((p) => [(p._id as mongoose.Types.ObjectId).toString(), p.name])
    );

    if (!propertyIds.length) {
      return createSuccessResponse({ anomalies: [], summary: { total: 0, byCategoryCount: {} } });
    }

    const [maintByMonth, vendorByMonth] = await Promise.all([
      // Maintenance costs by category and month
      MaintenanceRequest.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            deletedAt: null,
            category: { $in: UTILITY_CATEGORIES },
            createdAt: { $gte: threeMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              propertyId: "$propertyId",
              category: "$category",
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalCost: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
            count: { $sum: 1 },
          },
        },
      ]),

      // Vendor job costs by category and month
      VendorJob.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            status: { $in: ["payment_released", "approved", "completed"] },
            category: { $in: UTILITY_CATEGORIES },
            createdAt: { $gte: threeMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              propertyId: "$propertyId",
              category: "$category",
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalCost: { $sum: { $ifNull: ["$finalCost", "$budget"] } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Combine maintenance and vendor spend into unified map
    type MonthData = { totalCost: number; count: number };
    type CategoryMonthMap = Map<string, MonthData>;
    type PropertyCategoryMap = Map<string, CategoryMonthMap>;

    const spendMap = new Map<string, PropertyCategoryMap>();

    const addToMap = (
      propId: string,
      category: string,
      year: number,
      month: number,
      cost: number,
      count: number
    ) => {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const propKey = propId;
      if (!spendMap.has(propKey)) spendMap.set(propKey, new Map());
      const catMap = spendMap.get(propKey)!;
      if (!catMap.has(category)) catMap.set(category, new Map());
      const mMap = catMap.get(category)! as unknown as Map<string, MonthData>;
      const existing = mMap.get(monthKey) ?? { totalCost: 0, count: 0 };
      mMap.set(monthKey, { totalCost: existing.totalCost + cost, count: existing.count + count });
    };

    for (const r of [...maintByMonth, ...vendorByMonth]) {
      addToMap(
        r._id.propertyId.toString(),
        r._id.category,
        r._id.year,
        r._id.month,
        r.totalCost ?? 0,
        r.count
      );
    }

    // Compute current month key
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Detect anomalies
    const anomalies: {
      propertyId: string;
      propertyName: string;
      category: string;
      currentMonthCost: number;
      baselineAvg: number;
      spikePercent: number;
      severity: "warning" | "critical";
    }[] = [];

    for (const [propId, catMap] of spendMap.entries()) {
      for (const [category, monthData] of (catMap as unknown as Map<string, Map<string, MonthData>>).entries()) {
        const allMonths = Array.from(monthData.entries());
        const currentMonthEntry = allMonths.find(([k]) => k === currentMonthKey);
        const historicalEntries = allMonths.filter(([k]) => k !== currentMonthKey);

        if (!currentMonthEntry || historicalEntries.length === 0) continue;

        const currentCost = currentMonthEntry[1].totalCost;
        const avgHistorical =
          historicalEntries.reduce((s, [, d]) => s + d.totalCost, 0) /
          historicalEntries.length;

        if (avgHistorical <= 0) continue;

        const spike = (currentCost - avgHistorical) / avgHistorical;

        if (spike >= SPIKE_THRESHOLD) {
          anomalies.push({
            propertyId: propId,
            propertyName: propertyNameMap.get(propId) ?? "Unknown Property",
            category,
            currentMonthCost: currentCost,
            baselineAvg: Math.round(avgHistorical),
            spikePercent: Math.round(spike * 100),
            severity: spike >= 0.6 ? "critical" : "warning",
          });
        }
      }
    }

    anomalies.sort((a, b) => b.spikePercent - a.spikePercent);

    const byCategoryCount: Record<string, number> = {};
    for (const a of anomalies) {
      byCategoryCount[a.category] = (byCategoryCount[a.category] ?? 0) + 1;
    }

    return createSuccessResponse({
      anomalies,
      summary: {
        total: anomalies.length,
        critical: anomalies.filter((a) => a.severity === "critical").length,
        warning: anomalies.filter((a) => a.severity === "warning").length,
        byCategoryCount,
      },
      detectedAt: now,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
