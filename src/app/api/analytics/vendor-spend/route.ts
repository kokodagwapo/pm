/**
 * SmartStartPM — Vendor Spend Analytics API
 * Returns spend aggregated by category, vendor, and month.
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Property } from "@/models";
import { UserRole } from "@/types";
import {
  createSuccessResponse,
  handleApiError,
  withRoleAndDB,
} from "@/lib/api-utils";
import VendorJob from "@/models/VendorJob";

const PAID_STATUSES = ["payment_released", "approved", "completed"];

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("startDate");
    const endParam = searchParams.get("endDate");
    const propertyId = searchParams.get("propertyId");

    const now = new Date();
    const startDate = startParam
      ? new Date(startParam)
      : new Date(now.getFullYear(), 0, 1);
    const endDate = endParam ? new Date(endParam) : now;

    // Property scope
    const propertyQuery: Record<string, unknown> = { deletedAt: null };
    if (user.role === UserRole.OWNER) propertyQuery.ownerId = user.id;

    const properties = await Property.find(propertyQuery)
      .select("_id isMultiUnit units totalUnits")
      .lean();
    const allowedIds = properties.map((p) => p._id as mongoose.Types.ObjectId);

    // Total units for benchmarking
    const totalPortfolioUnits = properties.reduce((s, p) => {
      if (p.isMultiUnit) return s + (p.units?.length || (p as { totalUnits?: number }).totalUnits || 1);
      return s + 1;
    }, 0);

    if (!allowedIds.length) {
      return createSuccessResponse({
        totalSpend: 0,
        byCategory: [],
        byVendor: [],
        byMonth: [],
        jobCount: 0,
      });
    }

    // Validate propertyId filter: ensure it belongs to the user's allowed set
    let scopedPropertyIds = allowedIds;
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      const requestedId = new mongoose.Types.ObjectId(propertyId);
      const isAllowed = allowedIds.some((id) => id.equals(requestedId));
      if (!isAllowed) {
        return createSuccessResponse({ totalSpend: 0, byCategory: [], byVendor: [], byMonth: [], jobCount: 0 });
      }
      scopedPropertyIds = [requestedId];
    }

    const matchQuery: Record<string, unknown> = {
      propertyId: { $in: scopedPropertyIds },
      status: { $in: PAID_STATUSES },
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const [byCategory, byVendor, byMonth, totals] = await Promise.all([
      // Spend by category
      VendorJob.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: "$category",
            totalSpend: { $sum: { $ifNull: ["$finalCost", "$budget"] } },
            jobCount: { $sum: 1 },
            avgCost: { $avg: { $ifNull: ["$finalCost", "$budget"] } },
          },
        },
        { $sort: { totalSpend: -1 } },
      ]),

      // Spend by vendor
      VendorJob.aggregate([
        {
          $match: {
            ...matchQuery,
            assignedVendorId: { $exists: true },
          },
        },
        {
          $group: {
            _id: "$assignedVendorId",
            vendorName: { $first: "$assignedVendorName" },
            totalSpend: { $sum: { $ifNull: ["$finalCost", "$budget"] } },
            jobCount: { $sum: 1 },
            avgRating: { $avg: "$vendorRating" },
          },
        },
        { $sort: { totalSpend: -1 } },
        { $limit: 10 },
      ]),

      // Monthly trend
      VendorJob.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalSpend: { $sum: { $ifNull: ["$finalCost", "$budget"] } },
            jobCount: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      // Overall totals
      VendorJob.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalSpend: { $sum: { $ifNull: ["$finalCost", "$budget"] } },
            jobCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const MONTH_LABELS = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const totalSpend = totals[0]?.totalSpend ?? 0;
    const jobCount = totals[0]?.jobCount ?? 0;

    // Industry benchmarks (maintenance spend per unit per year)
    // Source: BOMA/IREM industry standards
    const BENCHMARK_PER_UNIT_ANNUAL = 500;
    const dateRangeYears = Math.max(
      (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      1 / 12
    );
    const proRatedBenchmark = BENCHMARK_PER_UNIT_ANNUAL * totalPortfolioUnits * dateRangeYears;
    const spendPerUnit = totalPortfolioUnits > 0 ? totalSpend / totalPortfolioUnits : 0;
    const benchmarkPerUnit = BENCHMARK_PER_UNIT_ANNUAL * dateRangeYears;
    const vsIndustry = benchmarkPerUnit > 0 ? ((spendPerUnit - benchmarkPerUnit) / benchmarkPerUnit) * 100 : null;

    return createSuccessResponse({
      totalSpend,
      jobCount,
      totalUnits: totalPortfolioUnits,
      spendPerUnit: Math.round(spendPerUnit),
      benchmark: {
        perUnitAnnual: BENCHMARK_PER_UNIT_ANNUAL,
        proRatedTotal: Math.round(proRatedBenchmark),
        proRatedPerUnit: Math.round(benchmarkPerUnit),
        vsIndustryPct: vsIndustry !== null ? Math.round(vsIndustry * 10) / 10 : null,
        status: vsIndustry === null
          ? "unknown"
          : vsIndustry > 20
          ? "above-benchmark"
          : vsIndustry < -20
          ? "below-benchmark"
          : "on-track",
        note: "Industry benchmark ~$500/unit/year (BOMA/IREM standard for residential maintenance)",
      },
      byCategory: byCategory.map((r) => ({
        category: r._id || "Uncategorised",
        totalSpend: r.totalSpend ?? 0,
        jobCount: r.jobCount,
        avgCost: Math.round(r.avgCost ?? 0),
        pctOfTotal: totalSpend > 0 ? Math.round(((r.totalSpend ?? 0) / totalSpend) * 1000) / 10 : 0,
      })),
      byVendor: byVendor.map((r) => ({
        vendorId: r._id?.toString(),
        vendorName: r.vendorName || "Unknown Vendor",
        totalSpend: r.totalSpend ?? 0,
        jobCount: r.jobCount,
        avgRating: r.avgRating ? Math.round(r.avgRating * 10) / 10 : null,
        pctOfTotal: totalSpend > 0 ? Math.round(((r.totalSpend ?? 0) / totalSpend) * 1000) / 10 : 0,
      })),
      byMonth: byMonth.map((r) => ({
        month: MONTH_LABELS[(r._id.month ?? 1) - 1],
        year: r._id.year,
        totalSpend: r.totalSpend ?? 0,
        jobCount: r.jobCount,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
});
