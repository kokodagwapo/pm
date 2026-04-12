/**
 * SmartStartPM - Analytics API Routes
 * Generate comprehensive analytics and business intelligence data
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Property, Lease, Payment, MaintenanceRequest } from "@/models";
import {
  UserRole,
  PaymentStatus,
  LeaseStatus,
  MaintenanceStatus,
} from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
} from "@/lib/api-utils";

// ============================================================================
// GET /api/analytics - Get comprehensive analytics data
// ============================================================================

const PAID_STATUSES = [PaymentStatus.PAID, PaymentStatus.COMPLETED];

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (
  user: { id: string; email: string; role: UserRole; isActive: boolean },
  request: NextRequest
) => {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "overview";
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(new Date().getFullYear(), 0, 1);
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();
    const propertyId = searchParams.get("propertyId");

    const basePropertyQuery: Record<string, unknown> = { deletedAt: null };
    if (user.role === UserRole.OWNER) {
      basePropertyQuery.ownerId = user.id;
    }
    if (propertyId) {
      if (!mongoose.Types.ObjectId.isValid(propertyId)) {
        return createErrorResponse("Invalid property id", 400);
      }
      basePropertyQuery._id = new mongoose.Types.ObjectId(propertyId);
    }

    switch (reportType) {
      case "overview":
        return await generateOverviewAnalytics(
          basePropertyQuery,
          startDate,
          endDate
        );
      case "financial":
        return await generateFinancialAnalytics(
          basePropertyQuery,
          startDate,
          endDate
        );
      case "occupancy":
        return await generateOccupancyAnalytics(
          basePropertyQuery,
          startDate,
          endDate
        );
      case "maintenance":
        return await generateMaintenanceAnalytics(
          basePropertyQuery,
          startDate,
          endDate
        );
      case "performance":
        return await generatePerformanceAnalytics(
          basePropertyQuery,
          startDate,
          endDate
        );
      default:
        return createErrorResponse("Invalid analytics type", 400);
    }
  } catch (error) {
    return handleApiError(error);
  }
});

// ============================================================================
// ANALYTICS GENERATORS
// ============================================================================

const MONTH_LABELS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function countPropertyUnits(p: {
  isMultiUnit?: boolean;
  units?: unknown[];
  totalUnits?: number;
}): number {
  if (p?.isMultiUnit) return p.units?.length || p.totalUnits || 1;
  return 1;
}

function portfolioAverageRent(properties: Record<string, unknown>[]): number {
  let totalRent = 0;
  let n = 0;
  for (const p of properties) {
    const units = p.units as { rentAmount?: number }[] | undefined;
    if (p?.isMultiUnit && Array.isArray(units)) {
      for (const u of units) {
        if (typeof u?.rentAmount === "number" && u.rentAmount > 0) {
          totalRent += u.rentAmount;
          n += 1;
        }
      }
    }
  }
  return n > 0 ? Math.round(totalRent / n) : 0;
}

async function getMonthlyTrends(
  propertyIds: mongoose.Types.ObjectId[],
  startDate: Date,
  endDate: Date,
  occupancyRate: number
) {
  if (!propertyIds.length) return [];

  const paidMatch = {
    propertyId: { $in: propertyIds },
    deletedAt: null,
    status: { $in: PAID_STATUSES },
    $expr: {
      $and: [
        { $gte: [{ $ifNull: ["$paidDate", "$dueDate"] }, startDate] },
        { $lte: [{ $ifNull: ["$paidDate", "$dueDate"] }, endDate] },
      ],
    },
  };

  const [revenueByMonth, maintenanceByMonth] = await Promise.all([
    Payment.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: {
            year: { $year: { $ifNull: ["$paidDate", "$dueDate"] } },
            month: { $month: { $ifNull: ["$paidDate", "$dueDate"] } },
          },
          total: { $sum: "$amount" },
        },
      },
    ]),
    MaintenanceRequest.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          deletedAt: null,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          cost: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
        },
      },
    ]),
  ]);

  const revenueMap = new Map(
    revenueByMonth.map((b) => [`${b._id.year}-${b._id.month}`, b.total])
  );
  const maintMap = new Map(
    maintenanceByMonth.map((b) => [`${b._id.year}-${b._id.month}`, b.cost])
  );

  const rows: {
    month: string;
    revenue: number;
    occupancy: number;
    maintenance: number;
  }[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endM = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const occ = Math.round(occupancyRate * 10) / 10;
  while (cursor <= endM) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    const key = `${y}-${m}`;
    rows.push({
      month: MONTH_LABELS_SHORT[cursor.getMonth()],
      revenue: revenueMap.get(key) || 0,
      occupancy: occ,
      maintenance: maintMap.get(key) || 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return rows;
}

async function getRevenueBreakdownByType(
  propertyIds: mongoose.Types.ObjectId[],
  startDate: Date,
  endDate: Date
) {
  if (!propertyIds.length) return [];
  const rows = await Payment.aggregate([
    {
      $match: {
        propertyId: { $in: propertyIds },
        deletedAt: null,
        status: { $in: PAID_STATUSES },
        $expr: {
          $and: [
            { $gte: [{ $ifNull: ["$paidDate", "$dueDate"] }, startDate] },
            { $lte: [{ $ifNull: ["$paidDate", "$dueDate"] }, endDate] },
          ],
        },
      },
    },
    {
      $group: {
        _id: { $ifNull: ["$type", "other"] },
        amount: { $sum: "$amount" },
      },
    },
  ]);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return rows.map((r) => {
    const raw = String(r._id || "other");
    const name = raw
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return {
      type: raw,
      name,
      amount: r.amount,
      percentage: total > 0 ? Math.round((r.amount / total) * 1000) / 10 : 0,
    };
  });
}

async function getPropertyPerformanceRows(
  properties: Record<string, unknown>[],
  propertyIds: mongoose.Types.ObjectId[],
  startDate: Date,
  endDate: Date
) {
  if (!propertyIds.length) return [];

  const [revenueAgg, maintAgg, leaseCounts] = await Promise.all([
    Payment.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          deletedAt: null,
          status: { $in: PAID_STATUSES },
          $expr: {
            $and: [
              { $gte: [{ $ifNull: ["$paidDate", "$dueDate"] }, startDate] },
              { $lte: [{ $ifNull: ["$paidDate", "$dueDate"] }, endDate] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$propertyId",
          revenue: { $sum: "$amount" },
        },
      },
    ]),
    MaintenanceRequest.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          deletedAt: null,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$propertyId",
          maintenance: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
        },
      },
    ]),
    Lease.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          status: LeaseStatus.ACTIVE,
        },
      },
      {
        $group: {
          _id: "$propertyId",
          leasedUnits: { $sum: 1 },
        },
      },
    ]),
  ]);

  const revMap = new Map(
    revenueAgg.map((r) => [r._id.toString(), r.revenue as number])
  );
  const maintMap = new Map(
    maintAgg.map((r) => [r._id.toString(), r.maintenance as number])
  );
  const leaseMap = new Map(
    leaseCounts.map((r) => [r._id.toString(), r.leasedUnits as number])
  );

  const rows = properties.map((p) => {
    const id = (p._id as mongoose.Types.ObjectId).toString();
    const unitsCount = countPropertyUnits(
      p as { isMultiUnit?: boolean; units?: unknown[]; totalUnits?: number }
    );
    const leased = leaseMap.get(id) || 0;
    const occupancy =
      unitsCount > 0 ? Math.round((leased / unitsCount) * 1000) / 10 : 0;
    return {
      id,
      name: (p.name as string) || "Unnamed property",
      revenue: revMap.get(id) || 0,
      occupancy,
      maintenance: maintMap.get(id) || 0,
    };
  });

  return rows.sort((a, b) => b.revenue - a.revenue);
}

async function getMaintenanceCategoryBreakdown(
  propertyIds: mongoose.Types.ObjectId[],
  startDate: Date,
  endDate: Date
) {
  if (!propertyIds.length) return [];
  const rows = await MaintenanceRequest.aggregate([
    {
      $match: {
        propertyId: { $in: propertyIds },
        deletedAt: null,
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $ifNull: ["$category", "general"] },
        count: { $sum: 1 },
        cost: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 16 },
  ]);
  return rows.map((r) => ({
    category: String(r._id || "general")
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" "),
    count: r.count,
    cost: r.cost,
  }));
}

async function generateOverviewAnalytics(
  propertyQuery: Record<string, unknown>,
  startDate: Date,
  endDate: Date
) {
  try {
    const properties = await Property.find(propertyQuery).lean();
    const propertyIds = properties.map(
      (p) => p._id as mongoose.Types.ObjectId
    );

    const totalUnits = properties.reduce(
      (sum, p) =>
        sum +
        countPropertyUnits(
          p as { isMultiUnit?: boolean; units?: unknown[]; totalUnits?: number }
        ),
      0
    );

    const portfolioStats = {
      totalProperties: properties.length,
      totalUnits,
      totalValue: properties.reduce(
        (sum, p) => sum + ((p as { value?: number }).value || 0),
        0
      ),
      averageRent: portfolioAverageRent(properties as Record<string, unknown>[]),
    };

    const totalLeases =
      propertyIds.length > 0
        ? await Lease.countDocuments({
            propertyId: { $in: propertyIds },
            status: LeaseStatus.ACTIVE,
          })
        : 0;

    const occupancyRate =
      portfolioStats.totalUnits > 0
        ? (totalLeases / portfolioStats.totalUnits) * 100
        : 0;

    const financialStats =
      propertyIds.length > 0
        ? await Payment.aggregate([
            {
              $match: {
                propertyId: { $in: propertyIds },
                deletedAt: null,
                $expr: {
                  $and: [
                    {
                      $gte: [
                        { $ifNull: ["$paidDate", "$dueDate"] },
                        startDate,
                      ],
                    },
                    {
                      $lte: [{ $ifNull: ["$paidDate", "$dueDate"] }, endDate],
                    },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalRevenue: {
                  $sum: {
                    $cond: [{ $in: ["$status", PAID_STATUSES] }, "$amount", 0],
                  },
                },
                pendingRevenue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", PaymentStatus.PENDING] },
                      "$amount",
                      0,
                    ],
                  },
                },
                totalPayments: { $sum: 1 },
                completedPayments: {
                  $sum: {
                    $cond: [{ $in: ["$status", PAID_STATUSES] }, 1, 0],
                  },
                },
              },
            },
          ])
        : [];

    const financial = financialStats[0] || {
      totalRevenue: 0,
      pendingRevenue: 0,
      totalPayments: 0,
      completedPayments: 0,
    };

    const maintenanceStats =
      propertyIds.length > 0
        ? await MaintenanceRequest.aggregate([
            {
              $match: {
                propertyId: { $in: propertyIds },
                deletedAt: null,
                createdAt: { $gte: startDate, $lte: endDate },
              },
            },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalCost: {
                  $sum: { $ifNull: ["$actualCost", "$estimatedCost"] },
                },
              },
            },
          ])
        : [];

    const collectionRate =
      financial.totalPayments > 0
        ? (financial.completedPayments / financial.totalPayments) * 100
        : 0;

    const collected = Number(financial.totalRevenue) || 0;
    const pending = Number(financial.pendingRevenue) || 0;
    const flowDenom = collected + pending;
    const collectedPercent =
      flowDenom > 0 ? Math.round((collected / flowDenom) * 1000) / 10 : 0;
    const pendingPercent =
      flowDenom > 0 ? Math.round((pending / flowDenom) * 1000) / 10 : 0;
    const otherPercent = Math.max(
      0,
      Math.round((100 - collectedPercent - pendingPercent) * 10) / 10
    );

    const [
      monthlyTrends,
      propertyPerformance,
      revenueBreakdown,
      maintenanceByCategory,
    ] = await Promise.all([
      getMonthlyTrends(propertyIds, startDate, endDate, occupancyRate),
      getPropertyPerformanceRows(
        properties as Record<string, unknown>[],
        propertyIds,
        startDate,
        endDate
      ),
      getRevenueBreakdownByType(propertyIds, startDate, endDate),
      getMaintenanceCategoryBreakdown(propertyIds, startDate, endDate),
    ]);

    return createSuccessResponse(
      {
        portfolio: portfolioStats,
        occupancy: {
          rate: Math.round(occupancyRate * 100) / 100,
          occupied: totalLeases,
          total: portfolioStats.totalUnits,
          vacant: Math.max(0, portfolioStats.totalUnits - totalLeases),
        },
        financial: {
          ...financial,
          collectionRate:
            Math.round(collectionRate * 100) / 100,
          paymentMix: {
            collectedPercent,
            pendingPercent,
            otherPercent,
          },
        },
        maintenance: maintenanceStats.reduce((acc, stat) => {
          acc[stat._id] = { count: stat.count, cost: stat.totalCost };
          return acc;
        }, {} as Record<string, { count: number; cost: number }>),
        recentActivity: [] as unknown[],
        monthlyTrends,
        propertyPerformance,
        revenueBreakdown,
        maintenanceByCategory,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
      "Overview analytics generated successfully"
    );
  } catch (error) {
    throw error;
  }
}

async function generateFinancialAnalytics(
  propertyQuery: Record<string, unknown>,
  startDate: Date,
  endDate: Date
) {
  try {
    const properties = await Property.find(propertyQuery);
    const propertyIds = properties.map((p) => p._id);

    // Revenue Analysis
    const revenueAnalysis = await Payment.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          deletedAt: null,
          status: { $in: PAID_STATUSES },
          $expr: {
            $and: [
              {
                $gte: [{ $ifNull: ["$paidDate", "$dueDate"] }, startDate],
              },
              {
                $lte: [{ $ifNull: ["$paidDate", "$dueDate"] }, endDate],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: { $ifNull: ["$paidDate", "$dueDate"] } },
            month: { $month: { $ifNull: ["$paidDate", "$dueDate"] } },
            type: "$type",
          },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Property Performance
    const propertyPerformance = await Payment.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          deletedAt: null,
          $expr: {
            $and: [
              {
                $gte: [{ $ifNull: ["$paidDate", "$dueDate"] }, startDate],
              },
              {
                $lte: [{ $ifNull: ["$paidDate", "$dueDate"] }, endDate],
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "properties",
          localField: "propertyId",
          foreignField: "_id",
          as: "property",
        },
      },
      { $unwind: "$property" },
      {
        $group: {
          _id: "$propertyId",
          propertyName: { $first: "$property.name" },
          totalRevenue: {
            $sum: {
              $cond: [{ $in: ["$status", PAID_STATUSES] }, "$amount", 0],
            },
          },
          pendingRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", PaymentStatus.PENDING] },
                "$amount",
                0,
              ],
            },
          },
          paymentCount: { $sum: 1 },
          collectionRate: {
            $avg: {
              $cond: [{ $in: ["$status", PAID_STATUSES] }, 1, 0],
            },
          },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    // Cash Flow Analysis
    const cashFlow = await getCashFlowAnalysis(propertyIds, startDate, endDate);

    return createSuccessResponse(
      {
        revenueAnalysis,
        propertyPerformance,
        cashFlow,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
      "Financial analytics generated successfully"
    );
  } catch (error) {
    throw error;
  }
}

async function generateOccupancyAnalytics(
  propertyQuery: any,
  startDate: Date,
  endDate: Date
) {
  try {
    const properties = await Property.find(propertyQuery);
    const propertyIds = properties.map((p) => p._id);

    // Occupancy Trends
    const occupancyTrends = await Lease.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          $or: [
            { startDate: { $gte: startDate, $lte: endDate } },
            { endDate: { $gte: startDate, $lte: endDate } },
            { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
          ],
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$startDate" },
            month: { $month: "$startDate" },
          },
          newLeases: { $sum: 1 },
          avgRent: { $avg: "$terms.rentAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Lease Expiration Analysis
    const leaseExpirations = await Lease.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          status: LeaseStatus.ACTIVE,
          endDate: {
            $gte: new Date(),
            $lte: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$endDate" },
            month: { $month: "$endDate" },
          },
          expiringLeases: { $sum: 1 },
          potentialRevenue: { $sum: "$terms.rentAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Vacancy Analysis
    const vacancyAnalysis = await getVacancyAnalysis(propertyIds);

    return createSuccessResponse(
      {
        occupancyTrends,
        leaseExpirations,
        vacancyAnalysis,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
      "Occupancy analytics generated successfully"
    );
  } catch (error) {
    throw error;
  }
}

async function generateMaintenanceAnalytics(
  propertyQuery: any,
  startDate: Date,
  endDate: Date
) {
  try {
    const properties = await Property.find(propertyQuery);
    const propertyIds = properties.map((p) => p._id);

    // Overview Statistics
    const overviewStats = await MaintenanceRequest.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          pendingRequests: {
            $sum: {
              $cond: [{ $eq: ["$status", MaintenanceStatus.SUBMITTED] }, 1, 0],
            },
          },
          inProgressRequests: {
            $sum: {
              $cond: [
                { $eq: ["$status", MaintenanceStatus.IN_PROGRESS] },
                1,
                0,
              ],
            },
          },
          completedRequests: {
            $sum: {
              $cond: [{ $eq: ["$status", MaintenanceStatus.COMPLETED] }, 1, 0],
            },
          },
          totalCost: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
          avgCompletionTime: {
            $avg: {
              $cond: [
                { $ne: ["$completedDate", null] },
                {
                  $divide: [
                    { $subtract: ["$completedDate", "$createdAt"] },
                    1000 * 60 * 60,
                  ],
                },
                null,
              ],
            },
          },
        },
      },
    ]);

    const overview = overviewStats[0] || {
      totalRequests: 0,
      pendingRequests: 0,
      inProgressRequests: 0,
      completedRequests: 0,
      totalCost: 0,
      avgCompletionTime: 0,
    };

    overview.avgCost =
      overview.totalRequests > 0
        ? overview.totalCost / overview.totalRequests
        : 0;
    overview.completionRate =
      overview.totalRequests > 0
        ? (overview.completedRequests / overview.totalRequests) * 100
        : 0;

    // Monthly Trends
    const monthlyTrends = await MaintenanceRequest.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          requests: { $sum: 1 },
          cost: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
          avgTime: {
            $avg: {
              $cond: [
                { $ne: ["$completedDate", null] },
                {
                  $divide: [
                    { $subtract: ["$completedDate", "$createdAt"] },
                    1000 * 60 * 60,
                  ],
                },
                null,
              ],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Category Breakdown
    const categoryBreakdown = await MaintenanceRequest.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          cost: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
          avgTime: {
            $avg: {
              $cond: [
                { $ne: ["$completedDate", null] },
                {
                  $divide: [
                    { $subtract: ["$completedDate", "$createdAt"] },
                    1000 * 60 * 60,
                  ],
                },
                null,
              ],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Property Performance
    const propertyPerformance = await MaintenanceRequest.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: "properties",
          localField: "propertyId",
          foreignField: "_id",
          as: "property",
        },
      },
      { $unwind: "$property" },
      {
        $group: {
          _id: "$propertyId",
          propertyName: { $first: "$property.name" },
          totalRequests: { $sum: 1 },
          completedRequests: {
            $sum: {
              $cond: [{ $eq: ["$status", MaintenanceStatus.COMPLETED] }, 1, 0],
            },
          },
          totalCost: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $ne: ["$completedDate", null] },
                {
                  $divide: [
                    { $subtract: ["$completedDate", "$createdAt"] },
                    1000 * 60 * 60,
                  ],
                },
                null,
              ],
            },
          },
        },
      },
      { $sort: { totalRequests: -1 } },
    ]);

    // Technician Performance (if assignedTo exists)
    const technicianPerformance = await MaintenanceRequest.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null,
          assignedTo: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "technician",
        },
      },
      { $unwind: "$technician" },
      {
        $group: {
          _id: "$assignedTo",
          technicianName: {
            $first: {
              $concat: ["$technician.firstName", " ", "$technician.lastName"],
            },
          },
          assignedRequests: { $sum: 1 },
          completedRequests: {
            $sum: {
              $cond: [{ $eq: ["$status", MaintenanceStatus.COMPLETED] }, 1, 0],
            },
          },
          avgCompletionTime: {
            $avg: {
              $cond: [
                { $ne: ["$completedDate", null] },
                {
                  $divide: [
                    { $subtract: ["$completedDate", "$createdAt"] },
                    1000 * 60 * 60,
                  ],
                },
                null,
              ],
            },
          },
          rating: { $avg: { $ifNull: ["$rating", 4.5] } },
        },
      },
      { $sort: { assignedRequests: -1 } },
    ]);

    return createSuccessResponse(
      {
        overview,
        trends: {
          monthly: monthlyTrends.map((item) => ({
            month: new Date(
              item._id.year,
              item._id.month - 1
            ).toLocaleDateString("en-US", { month: "short" }),
            requests: item.requests,
            cost: item.cost,
            avgTime: item.avgTime || 0,
          })),
          categories: categoryBreakdown.map((item) => ({
            category: item._id || "Other",
            count: item.count,
            cost: item.cost,
            avgTime: item.avgTime || 0,
          })),
        },
        performance: {
          byProperty: propertyPerformance,
          byTechnician: technicianPerformance,
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
      "Maintenance analytics generated successfully"
    );
  } catch (error) {
    throw error;
  }
}

async function generatePerformanceAnalytics(
  propertyQuery: any,
  startDate: Date,
  endDate: Date
) {
  try {
    const properties = await Property.find(propertyQuery);
    const propertyIds = properties.map((p) => p._id);

    // ROI Analysis
    const roiAnalysis = await calculateROI(propertyIds, startDate, endDate);

    // Tenant Satisfaction Metrics
    const tenantMetrics = await getTenantSatisfactionMetrics(propertyIds);

    // Market Comparison
    const marketComparison = await getMarketComparison(properties);

    return createSuccessResponse(
      {
        roiAnalysis,
        tenantMetrics,
        marketComparison,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
      "Performance analytics generated successfully"
    );
  } catch (error) {
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getCashFlowAnalysis(
  propertyIds: any[],
  startDate: Date,
  endDate: Date
) {
  // Calculate cash flow metrics
  return {
    inflow: 0,
    outflow: 0,
    netCashFlow: 0,
    monthlyTrends: [],
  };
}

async function getVacancyAnalysis(propertyIds: any[]) {
  // Analyze vacancy patterns and costs
  return {
    currentVacancies: 0,
    avgVacancyDuration: 0,
    vacancyCost: 0,
    trends: [],
  };
}

async function calculateROI(
  propertyIds: any[],
  startDate: Date,
  endDate: Date
) {
  // Calculate return on investment metrics
  return {
    totalROI: 0,
    monthlyROI: 0,
    propertyROI: [],
  };
}

async function getTenantSatisfactionMetrics(propertyIds: any[]) {
  // Calculate tenant satisfaction and retention metrics
  return {
    satisfactionScore: 0,
    retentionRate: 0,
    renewalRate: 0,
  };
}

async function getMarketComparison(properties: any[]) {
  // Compare property performance to market averages
  return {
    rentComparison: 0,
    occupancyComparison: 0,
    marketTrends: [],
  };
}
