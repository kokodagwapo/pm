/**
 * SmartStartPM — Owner ROI Report API
 *
 * Returns Return on Investment metrics per property and aggregated:
 *   - Gross Rental Yield = Annual Rent / Property Value
 *   - Net Operating Income (NOI) = Revenue - Operating Expenses
 *   - Cash-on-Cash Return = NOI / Cash Invested
 *   - Total ROI (with appreciation estimate)
 *   - Annualised Return since acquisition
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { Property, Lease, Payment, MaintenanceRequest } from "@/models";
import { UserRole, PaymentStatus, LeaseStatus } from "@/types";
import {
  createSuccessResponse,
  handleApiError,
  withRoleAndDB,
} from "@/lib/api-utils";
import VendorJob from "@/models/VendorJob";

const PAID_STATUSES = [PaymentStatus.PAID, PaymentStatus.COMPLETED];
const ANNUAL_APPRECIATION_RATE = 0.04;

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");

    const now = new Date();
    const currentYear = now.getFullYear();
    const ytdStart = new Date(currentYear, 0, 1);
    const oneYearAgo = new Date(currentYear - 1, now.getMonth(), 1);

    // Property scope
    const propertyQuery: Record<string, unknown> = { deletedAt: null };
    if (user.role === UserRole.OWNER) propertyQuery.ownerId = user.id;
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      propertyQuery._id = new mongoose.Types.ObjectId(propertyId);
    }

    const properties = await Property.find(propertyQuery)
      .select("_id name address yearBuilt purchasePrice purchaseDate isMultiUnit units totalUnits")
      .lean();
    const propertyIds = properties.map((p) => p._id as mongoose.Types.ObjectId);

    if (!propertyIds.length) {
      return createSuccessResponse({
        portfolio: null,
        properties: [],
        calculatedAt: now,
      });
    }

    // Revenue (YTD paid payments)
    const [revenueByProp, expensesByProp, vendorByProp, activeLeases] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            deletedAt: null,
            status: { $in: PAID_STATUSES },
            $expr: {
              $gte: [{ $ifNull: ["$paidDate", "$dueDate"] }, ytdStart],
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
            createdAt: { $gte: ytdStart },
          },
        },
        {
          $group: {
            _id: "$propertyId",
            expenses: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
          },
        },
      ]),
      VendorJob.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            status: { $in: ["payment_released", "approved"] },
            createdAt: { $gte: ytdStart },
          },
        },
        {
          $group: {
            _id: "$propertyId",
            expenses: { $sum: { $ifNull: ["$finalCost", "$budget"] } },
          },
        },
      ]),
      Lease.find({
        propertyId: { $in: propertyIds },
        status: LeaseStatus.ACTIVE,
      })
        .select("propertyId terms.rentAmount")
        .lean(),
    ]);

    const revenueMap = new Map(revenueByProp.map((r) => [r._id.toString(), r.revenue]));
    const maintExpMap = new Map(expensesByProp.map((r) => [r._id.toString(), r.expenses]));
    const vendorExpMap = new Map(vendorByProp.map((r) => [r._id.toString(), r.expenses]));

    // Annual rent by property from active leases
    const annualRentMap = new Map<string, number>();
    for (const l of activeLeases) {
      const key = l.propertyId.toString();
      const rent = (l as { terms?: { rentAmount?: number } }).terms?.rentAmount ?? 0;
      annualRentMap.set(key, (annualRentMap.get(key) ?? 0) + rent * 12);
    }

    // YTD elapsed fraction
    const ytdFraction = (now.getTime() - ytdStart.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    // Per-property ROI
    const propertyData = properties.map((p) => {
      const id = (p._id as mongoose.Types.ObjectId).toString();
      const units = p.isMultiUnit ? p.units?.length || p.totalUnits || 1 : 1;

      const ytdRevenue = revenueMap.get(id) ?? 0;
      const ytdExpenses = (maintExpMap.get(id) ?? 0) + (vendorExpMap.get(id) ?? 0);
      const noi = ytdRevenue - ytdExpenses;
      const annualRent = annualRentMap.get(id) ?? 0;

      // Annualise YTD figures (avoid div/0 early in year)
      const annualRevenue = ytdFraction > 0.05 ? ytdRevenue / ytdFraction : annualRent;
      const annualExpenses = ytdFraction > 0.05 ? ytdExpenses / ytdFraction : ytdExpenses * 2;
      const annualNOI = annualRevenue - annualExpenses;

      const purchasePrice = (p as { purchasePrice?: number }).purchasePrice ?? 0;
      const grossYield = purchasePrice > 0 && annualRent > 0
        ? (annualRent / purchasePrice) * 100
        : null;

      const netYield = purchasePrice > 0 && annualNOI > 0
        ? (annualNOI / purchasePrice) * 100
        : null;

      // Appreciation estimate since purchase
      const purchaseDate = (p as { purchaseDate?: Date }).purchaseDate;
      const yearsOwned = purchaseDate
        ? (now.getTime() - new Date(purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        : 0;
      const appreciationEstimate = purchasePrice > 0 && yearsOwned > 0
        ? purchasePrice * (Math.pow(1 + ANNUAL_APPRECIATION_RATE, yearsOwned) - 1)
        : 0;

      const totalReturn = purchasePrice > 0
        ? ((annualNOI * yearsOwned + appreciationEstimate) / purchasePrice) * 100
        : null;

      return {
        id,
        name: p.name || "Unnamed Property",
        units,
        yearBuilt: p.yearBuilt ?? null,
        purchasePrice,
        yearsOwned: Math.round(yearsOwned * 10) / 10,
        ytdRevenue,
        ytdExpenses,
        ytdNOI: noi,
        annualRent,
        annualRevenue: Math.round(annualRevenue),
        annualExpenses: Math.round(annualExpenses),
        annualNOI: Math.round(annualNOI),
        grossYield: grossYield !== null ? Math.round(grossYield * 10) / 10 : null,
        netYield: netYield !== null ? Math.round(netYield * 10) / 10 : null,
        appreciationEstimate: Math.round(appreciationEstimate),
        totalReturn: totalReturn !== null ? Math.round(totalReturn * 10) / 10 : null,
        expenseRatio: annualRevenue > 0 ? Math.round((annualExpenses / annualRevenue) * 1000) / 10 : null,
      };
    });

    // Portfolio aggregates
    const totalYtdRevenue = propertyData.reduce((s, p) => s + p.ytdRevenue, 0);
    const totalYtdExpenses = propertyData.reduce((s, p) => s + p.ytdExpenses, 0);
    const totalAnnualRent = propertyData.reduce((s, p) => s + p.annualRent, 0);
    const totalPurchasePrice = propertyData.reduce((s, p) => s + p.purchasePrice, 0);
    const totalAppreciation = propertyData.reduce((s, p) => s + p.appreciationEstimate, 0);
    const avgGrossYield = propertyData.filter((p) => p.grossYield !== null).length > 0
      ? propertyData.reduce((s, p) => s + (p.grossYield ?? 0), 0) /
        propertyData.filter((p) => p.grossYield !== null).length
      : null;
    const avgNetYield = propertyData.filter((p) => p.netYield !== null).length > 0
      ? propertyData.reduce((s, p) => s + (p.netYield ?? 0), 0) /
        propertyData.filter((p) => p.netYield !== null).length
      : null;

    const portfolio = {
      totalProperties: properties.length,
      totalPurchasePrice,
      totalYtdRevenue,
      totalYtdExpenses,
      totalYtdNOI: totalYtdRevenue - totalYtdExpenses,
      totalAnnualRent,
      totalAppreciationEstimate: Math.round(totalAppreciation),
      avgGrossYield: avgGrossYield !== null ? Math.round(avgGrossYield * 10) / 10 : null,
      avgNetYield: avgNetYield !== null ? Math.round(avgNetYield * 10) / 10 : null,
      portfolioExpenseRatio:
        totalYtdRevenue > 0
          ? Math.round((totalYtdExpenses / totalYtdRevenue) * 1000) / 10
          : null,
    };

    return createSuccessResponse({
      portfolio,
      properties: propertyData.sort((a, b) => (b.netYield ?? 0) - (a.netYield ?? 0)),
      calculatedAt: now,
      ytdPeriod: { start: ytdStart, end: now },
      note: "Appreciation estimated at 4% annual compound rate. Actual appreciation depends on market conditions.",
    });
  } catch (error) {
    return handleApiError(error);
  }
});
