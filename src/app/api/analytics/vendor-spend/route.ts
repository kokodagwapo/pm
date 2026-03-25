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

    const properties = await Property.find(propertyQuery).select("_id").lean();
    const allowedIds = properties.map((p) => p._id as mongoose.Types.ObjectId);

    if (!allowedIds.length) {
      return createSuccessResponse({
        totalSpend: 0,
        byCategory: [],
        byVendor: [],
        byMonth: [],
        jobCount: 0,
      });
    }

    const matchQuery: Record<string, unknown> = {
      propertyId: { $in: propertyId && mongoose.Types.ObjectId.isValid(propertyId)
        ? [new mongoose.Types.ObjectId(propertyId)]
        : allowedIds },
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

    return createSuccessResponse({
      totalSpend: totals[0]?.totalSpend ?? 0,
      jobCount: totals[0]?.jobCount ?? 0,
      byCategory: byCategory.map((r) => ({
        category: r._id || "Uncategorised",
        totalSpend: r.totalSpend ?? 0,
        jobCount: r.jobCount,
        avgCost: Math.round(r.avgCost ?? 0),
      })),
      byVendor: byVendor.map((r) => ({
        vendorId: r._id?.toString(),
        vendorName: r.vendorName || "Unknown Vendor",
        totalSpend: r.totalSpend ?? 0,
        jobCount: r.jobCount,
        avgRating: r.avgRating ? Math.round(r.avgRating * 10) / 10 : null,
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
