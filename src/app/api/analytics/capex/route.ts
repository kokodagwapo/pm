/**
 * SmartStartPM — CapEx Planning Analytics API
 * Returns capital expenditure projections based on property age,
 * historical maintenance spend, and per-system ages from PropertySystems.
 *
 * CapEx lifecycle benchmarks (per-unit annual estimates):
 *   0-10 yrs  – $300   (minor wear)
 *   11-20 yrs – $700   (systems aging)
 *   21-30 yrs – $1,200 (roof, HVAC, plumbing)
 *   31-50 yrs – $2,000 (major renovations)
 *   50+  yrs  – $3,000 (full capital renewal)
 *
 * When PropertySystems data is available for a property, the API
 * generates a system-level replacement schedule showing each system's
 * current age, remaining useful life, and projected replacement cost.
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
import PropertySystems from "@/models/PropertySystems";

function annualCapexBenchmark(age: number): number {
  if (age <= 10) return 300;
  if (age <= 20) return 700;
  if (age <= 30) return 1_200;
  if (age <= 50) return 2_000;
  return 3_000;
}

function riskLevel(age: number): "low" | "medium" | "high" | "critical" {
  if (age <= 10) return "low";
  if (age <= 20) return "medium";
  if (age <= 30) return "high";
  return "critical";
}

/**
 * Per-system replacement cost estimates (one-time cost, not annual).
 * Source: National Average data (RSMeans / BOMA benchmarks).
 */
const SYSTEM_REPLACEMENT_COSTS: Record<string, number> = {
  "Roof":          8_000,
  "HVAC":          5_000,
  "Electrical":    4_000,
  "Plumbing":      3_500,
  "Water Heater":  1_200,
  "Foundation":   15_000,
  "Windows":       3_000,
  "Exterior":      6_000,
  "Flooring":      2_500,
  "Appliances":    1_500,
  "Elevators":    25_000,
  "Other":         2_000,
};

/** Reserve rate: annual contribution = replacementCost / lifespanYears */
function reserveContribution(systemType: string, lifespanYears: number): number {
  const cost = SYSTEM_REPLACEMENT_COSTS[systemType] ?? 2_000;
  return Math.round(cost / lifespanYears);
}

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const years = Math.min(
      10,
      Math.max(1, parseInt(searchParams.get("years") ?? "5", 10))
    );

    const now = new Date();
    const currentYear = now.getFullYear();
    const threeYearsAgo = new Date(currentYear - 3, 0, 1);

    // Property scope
    const propertyQuery: Record<string, unknown> = { deletedAt: null };
    if (user.role === UserRole.OWNER) propertyQuery.ownerId = user.id;
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      propertyQuery._id = new mongoose.Types.ObjectId(propertyId);
    }

    const properties = await Property.find(propertyQuery).lean();
    const propertyIds = properties.map((p) => p._id as mongoose.Types.ObjectId);

    if (!propertyIds.length) {
      return createSuccessResponse({
        properties: [],
        projections: [],
        totalBudget: 0,
        highRiskCount: 0,
        systemSchedules: [],
      });
    }

    // Load PropertySystems data for per-system replacement schedules
    const propertySystems = await PropertySystems.find({
      propertyId: { $in: propertyIds },
    }).lean();

    const systemsMap = new Map(
      propertySystems.map((ps) => [ps.propertyId.toString(), ps])
    );

    // Historical maintenance spend (last 3 years) per property
    const [maintSpend, vendorSpend] = await Promise.all([
      MaintenanceRequest.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            deletedAt: null,
            createdAt: { $gte: threeYearsAgo },
          },
        },
        {
          $group: {
            _id: "$propertyId",
            total: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
            count: { $sum: 1 },
            categories: { $addToSet: "$category" },
          },
        },
      ]),
      VendorJob.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            status: { $in: ["payment_released", "approved", "completed"] },
            createdAt: { $gte: threeYearsAgo },
          },
        },
        {
          $group: {
            _id: "$propertyId",
            total: { $sum: { $ifNull: ["$finalCost", "$budget"] } },
          },
        },
      ]),
    ]);

    const maintMap = new Map(
      maintSpend.map((r) => [r._id.toString(), { total: r.total, count: r.count, categories: r.categories }])
    );
    const vendorMap = new Map(vendorSpend.map((r) => [r._id.toString(), r.total]));

    // Build per-property analysis including system-level replacement schedule
    const propertyData = properties.map((p) => {
      const id = (p._id as mongoose.Types.ObjectId).toString();
      const age = p.yearBuilt ? currentYear - p.yearBuilt : 20;
      const units = p.isMultiUnit ? p.units?.length || p.totalUnits || 1 : 1;
      const benchmarkPerUnit = annualCapexBenchmark(age);
      const annualBenchmark = benchmarkPerUnit * units;

      const historicalMaint = maintMap.get(id)?.total ?? 0;
      const historicalVendor = vendorMap.get(id) ?? 0;
      const historicalTotal = historicalMaint + historicalVendor;
      const annualHistorical = historicalTotal / 3;

      // Per-system replacement schedule (if PropertySystems data exists)
      const ps = systemsMap.get(id);
      const systemReplacementSchedule = ps?.systems.map((sys) => {
        // Sanitize: treat 0 or out-of-range lastReplacedYear as missing
        const rawYear = sys.lastReplacedYear ?? sys.installYear;
        const validYear = rawYear && rawYear > 1900 && rawYear <= currentYear ? rawYear : null;
        const effectiveInstallYear = validYear ?? (currentYear - Math.floor(sys.estimatedLifespanYears / 2));
        const systemAge = currentYear - effectiveInstallYear;
        const remainingLife = Math.max(0, sys.estimatedLifespanYears - systemAge);
        const replacementYear = effectiveInstallYear + sys.estimatedLifespanYears;
        const replacementCost = SYSTEM_REPLACEMENT_COSTS[sys.systemType] ?? 2_000;
        const annualReserve = reserveContribution(sys.systemType, sys.estimatedLifespanYears);
        const agePercent = Math.min(100, Math.round((systemAge / sys.estimatedLifespanYears) * 100));

        return {
          systemType: sys.systemType,
          installYear: effectiveInstallYear,
          systemAge,
          estimatedLifespanYears: sys.estimatedLifespanYears,
          remainingLifeYears: remainingLife,
          replacementYear,
          replacementCost,
          annualReserve,
          agePercent,
          urgency: agePercent >= 90 ? "immediate" : agePercent >= 70 ? "near-term" : "future",
          notes: sys.notes,
        };
      }) ?? [];

      // Compute system-informed reserve fund total per year
      const totalAnnualReserve = systemReplacementSchedule.reduce((s, sys) => s + sys.annualReserve, 0);

      // Year-by-year projections: use system replacement schedule if available,
      // otherwise fall back to age-based benchmark
      const projectedYears = Array.from({ length: years }, (_, i) => {
        const yr = currentYear + i + 1;
        const ageAtYear = age + i + 1;
        const benchmarkAtYear = annualCapexBenchmark(ageAtYear) * units;

        // Add any systems due for replacement in this year
        const systemReplacementsThisYear = systemReplacementSchedule.filter(
          (s) => s.replacementYear === yr
        );
        const systemReplacementCost = systemReplacementsThisYear.reduce(
          (s, sys) => s + sys.replacementCost, 0
        );

        // Use system data if available, otherwise use age benchmark
        const projected = systemReplacementSchedule.length > 0
          ? Math.round(totalAnnualReserve + systemReplacementCost)
          : Math.round(benchmarkAtYear);

        return {
          year: yr,
          projected,
          systemReplacements: systemReplacementsThisYear.map((s) => ({
            systemType: s.systemType,
            cost: s.replacementCost,
          })),
        };
      });

      return {
        id,
        name: p.name || "Unnamed Property",
        yearBuilt: p.yearBuilt ?? null,
        age,
        units,
        riskLevel: riskLevel(age),
        annualBenchmark,
        annualHistorical: Math.round(annualHistorical),
        historicalCategories: maintMap.get(id)?.categories ?? [],
        hasSystemData: systemReplacementSchedule.length > 0,
        systemReplacementSchedule,
        totalAnnualReserve: Math.round(totalAnnualReserve),
        projectedYears,
      };
    });

    // Aggregate year-by-year projections
    const projectionMap = new Map<number, number>();
    for (const prop of propertyData) {
      for (const yr of prop.projectedYears) {
        projectionMap.set(yr.year, (projectionMap.get(yr.year) ?? 0) + yr.projected);
      }
    }

    const projections = Array.from(projectionMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, amount]) => ({ year, amount }));

    const totalBudget = projections.reduce((s, r) => s + r.amount, 0);
    const highRiskCount = propertyData.filter(
      (p) => p.riskLevel === "high" || p.riskLevel === "critical"
    ).length;

    // Category spend breakdown (last 3 yrs)
    const categoryBreakdown = await MaintenanceRequest.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          deletedAt: null,
          createdAt: { $gte: threeYearsAgo },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    // Immediate and near-term system replacements (across all properties)
    const urgentSystems = propertyData.flatMap((p) =>
      p.systemReplacementSchedule
        .filter((s) => s.urgency === "immediate" || s.urgency === "near-term")
        .map((s) => ({ ...s, propertyId: p.id, propertyName: p.name }))
    ).sort((a, b) => a.remainingLifeYears - b.remainingLifeYears);

    return createSuccessResponse({
      properties: propertyData,
      projections,
      totalBudget,
      annualAvgBudget: Math.round(totalBudget / years),
      highRiskCount,
      urgentSystems,
      categoryBreakdown: categoryBreakdown.map((r) => ({
        category: r._id || "General",
        total: r.total ?? 0,
        count: r.count,
        annualAvg: Math.round((r.total ?? 0) / 3),
      })),
      currentYear,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
