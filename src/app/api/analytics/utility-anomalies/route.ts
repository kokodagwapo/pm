/**
 * SmartStartPM — Utility Cost Anomaly Detection API
 *
 * Detects abnormal spikes in utility-related maintenance and vendor costs.
 * Utility categories: Electrical, Plumbing, HVAC, Pest Control.
 *
 * Algorithm: Compare current calendar month spend vs. prior calendar month spend
 * (month-over-month). Flag if current month is >20% above prior month.
 * Severity: critical if ≥50% spike, warning if 20–49%.
 * Each anomaly includes affected units and a recommended inspection action.
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

const RECOMMENDED_ACTION: Record<string, string> = {
  "Electrical": "Schedule an electrical inspection to identify overloaded circuits, faulty wiring, or new equipment draws.",
  "Plumbing": "Inspect for hidden leaks, failing fixtures, or water main issues. Consider a leak detection scan.",
  "HVAC": "Arrange HVAC inspection for refrigerant leaks, compressor wear, or increased load from weather.",
  "Pest Control": "Conduct a thorough site inspection for active infestation, entry points, and moisture sources.",
};

const UTILITY_CATEGORIES = ["Electrical", "Plumbing", "HVAC", "Pest Control"];
const SPIKE_THRESHOLD = 0.20;   // 20% month-over-month increase triggers alert
const CRITICAL_THRESHOLD = 0.50; // 50% = critical severity

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    const now = new Date();
    // Current month: e.g. March 2026 → 2026-03
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Prior month
    const priorMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const priorMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

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
      return createSuccessResponse({ anomalies: [], summary: { total: 0, critical: 0, warning: 0, byCategoryCount: {} } });
    }

    // Aggregate maintenance and vendor spend for current and prior month
    const [maintCurrent, maintPrior, vendorCurrent, vendorPrior] = await Promise.all([
      MaintenanceRequest.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            deletedAt: null,
            category: { $in: UTILITY_CATEGORIES },
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
          },
        },
        {
          $group: {
            _id: { propertyId: "$propertyId", category: "$category" },
            totalCost: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
            count: { $sum: 1 },
            unitIds: { $addToSet: "$unitId" },
          },
        },
      ]),
      MaintenanceRequest.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            deletedAt: null,
            category: { $in: UTILITY_CATEGORIES },
            createdAt: { $gte: priorMonthStart, $lte: priorMonthEnd },
          },
        },
        {
          $group: {
            _id: { propertyId: "$propertyId", category: "$category" },
            totalCost: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
            count: { $sum: 1 },
          },
        },
      ]),
      VendorJob.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            status: { $in: ["payment_released", "approved", "completed"] },
            category: { $in: UTILITY_CATEGORIES },
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
          },
        },
        {
          $group: {
            _id: { propertyId: "$propertyId", category: "$category" },
            totalCost: { $sum: { $ifNull: ["$finalCost", "$budget"] } },
            count: { $sum: 1 },
            unitIds: { $addToSet: "$unitId" },
          },
        },
      ]),
      VendorJob.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            status: { $in: ["payment_released", "approved", "completed"] },
            category: { $in: UTILITY_CATEGORIES },
            createdAt: { $gte: priorMonthStart, $lte: priorMonthEnd },
          },
        },
        {
          $group: {
            _id: { propertyId: "$propertyId", category: "$category" },
            totalCost: { $sum: { $ifNull: ["$finalCost", "$budget"] } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Combine current and prior month totals per (property, category)
    type SpendEntry = { current: number; prior: number; unitIds: Set<string> };
    const spendMap = new Map<string, SpendEntry>();

    const addEntry = (
      propId: string,
      category: string,
      cost: number,
      period: "current" | "prior",
      unitIds?: string[]
    ) => {
      const key = `${propId}||${category}`;
      const existing = spendMap.get(key) ?? { current: 0, prior: 0, unitIds: new Set<string>() };
      existing[period] += cost;
      if (period === "current" && unitIds) {
        for (const uid of unitIds) {
          if (uid) existing.unitIds.add(uid.toString());
        }
      }
      spendMap.set(key, existing);
    };

    for (const r of maintCurrent) addEntry(r._id.propertyId.toString(), r._id.category, r.totalCost ?? 0, "current", r.unitIds ?? []);
    for (const r of maintPrior) addEntry(r._id.propertyId.toString(), r._id.category, r.totalCost ?? 0, "prior");
    for (const r of vendorCurrent) addEntry(r._id.propertyId.toString(), r._id.category, r.totalCost ?? 0, "current", r.unitIds ?? []);
    for (const r of vendorPrior) addEntry(r._id.propertyId.toString(), r._id.category, r.totalCost ?? 0, "prior");

    // Detect anomalies: current > prior by ≥20%
    const anomalies: {
      propertyId: string;
      propertyName: string;
      category: string;
      currentMonthCost: number;
      priorMonthCost: number;
      spikePercent: number;
      severity: "warning" | "critical";
      affectedUnitIds: string[];
      affectedUnitCount: number;
      recommendedAction: string;
    }[] = [];

    for (const [key, { current, prior, unitIds }] of spendMap.entries()) {
      const [propId, category] = key.split("||");

      // Only flag if there's actual spend this month and a valid prior baseline
      if (current <= 0) continue;
      if (prior <= 0) continue; // no baseline for comparison

      const spike = (current - prior) / prior;

      if (spike >= SPIKE_THRESHOLD) {
        const affectedUnitIds = Array.from(unitIds).filter(Boolean);
        anomalies.push({
          propertyId: propId,
          propertyName: propertyNameMap.get(propId) ?? "Unknown Property",
          category,
          currentMonthCost: Math.round(current),
          priorMonthCost: Math.round(prior),
          spikePercent: Math.round(spike * 100),
          severity: spike >= CRITICAL_THRESHOLD ? "critical" : "warning",
          affectedUnitIds,
          affectedUnitCount: affectedUnitIds.length,
          recommendedAction: RECOMMENDED_ACTION[category] ?? "Review recent work orders and vendor invoices for this category.",
        });
      }
    }

    anomalies.sort((a, b) => b.spikePercent - a.spikePercent);

    const byCategoryCount: Record<string, number> = {};
    for (const a of anomalies) {
      byCategoryCount[a.category] = (byCategoryCount[a.category] ?? 0) + 1;
    }

    const currentMonthLabel = currentMonthStart.toLocaleString("en-US", { month: "long", year: "numeric" });
    const priorMonthLabel = priorMonthStart.toLocaleString("en-US", { month: "long", year: "numeric" });

    return createSuccessResponse({
      anomalies,
      summary: {
        total: anomalies.length,
        critical: anomalies.filter((a) => a.severity === "critical").length,
        warning: anomalies.filter((a) => a.severity === "warning").length,
        byCategoryCount,
      },
      comparisonPeriod: {
        current: currentMonthLabel,
        prior: priorMonthLabel,
        thresholdPct: Math.round(SPIKE_THRESHOLD * 100),
      },
      detectedAt: now,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
