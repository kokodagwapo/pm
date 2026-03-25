/**
 * SmartStartPM — Tax Prep Export API
 * Generates a year-end income/expense summary as CSV or JSON.
 * Query params:
 *   year       (number, defaults to current year)
 *   format     "csv" | "json"
 *   propertyId (optional)
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Property, Payment, MaintenanceRequest } from "@/models";
import { UserRole, PaymentStatus, PaymentType } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
} from "@/lib/api-utils";
import VendorJob from "@/models/VendorJob";

const PAID_STATUSES = [PaymentStatus.PAID, PaymentStatus.COMPLETED];

function toCsvRow(obj: Record<string, unknown>) {
  return Object.values(obj)
    .map((v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    })
    .join(",");
}

export const GET = withRoleAndDB([
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.OWNER,
])(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
    const format = searchParams.get("format") ?? "json";
    const propertyId = searchParams.get("propertyId");

    if (isNaN(year) || year < 2000 || year > 2100) {
      return createErrorResponse("Invalid year", 400);
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    // Property scope
    const propertyQuery: Record<string, unknown> = { deletedAt: null };
    if (user.role === UserRole.OWNER) propertyQuery.ownerId = user.id;
    if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
      propertyQuery._id = new mongoose.Types.ObjectId(propertyId);
    }

    const properties = await Property.find(propertyQuery)
      .select("_id name address")
      .lean();
    const propertyIds = properties.map((p) => p._id as mongoose.Types.ObjectId);
    const propertyNameMap = new Map(
      properties.map((p) => [(p._id as mongoose.Types.ObjectId).toString(), p.name])
    );

    if (!propertyIds.length) {
      if (format === "csv") {
        return new NextResponse("No properties found", {
          headers: { "Content-Type": "text/csv" },
        });
      }
      return createSuccessResponse({ year, income: [], expenses: [], summary: {} });
    }

    // ── Income: paid payments ─────────────────────────────────────────────────
    const incomeRows = await Payment.aggregate([
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
          _id: {
            propertyId: "$propertyId",
            type: "$type",
            month: { $month: { $ifNull: ["$paidDate", "$dueDate"] } },
          },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1, "_id.type": 1 } },
    ]);

    // ── Expenses: maintenance + vendor jobs ───────────────────────────────────
    const [maintRows, vendorRows] = await Promise.all([
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
              propertyId: "$propertyId",
              category: { $ifNull: ["$category", "General Repair"] },
              month: { $month: "$createdAt" },
            },
            amount: { $sum: { $ifNull: ["$actualCost", "$estimatedCost"] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.month": 1, "_id.category": 1 } },
      ]),
      VendorJob.aggregate([
        {
          $match: {
            propertyId: { $in: propertyIds },
            status: { $in: ["payment_released", "approved"] },
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              propertyId: "$propertyId",
              category: "$category",
              month: { $month: "$createdAt" },
            },
            amount: { $sum: { $ifNull: ["$finalCost", "$budget"] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.month": 1, "_id.category": 1 } },
      ]),
    ]);

    const MONTH_NAMES = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const income = incomeRows.map((r) => ({
      year,
      month: r._id.month,
      monthName: MONTH_NAMES[r._id.month - 1],
      propertyId: r._id.propertyId?.toString(),
      propertyName: propertyNameMap.get(r._id.propertyId?.toString()) ?? "Unknown",
      type: "income",
      category: String(r._id.type ?? "other").replace(/_/g, " "),
      amount: r.amount ?? 0,
      count: r.count,
    }));

    const expenses = [
      ...maintRows.map((r) => ({
        year,
        month: r._id.month,
        monthName: MONTH_NAMES[r._id.month - 1],
        propertyId: r._id.propertyId?.toString(),
        propertyName: propertyNameMap.get(r._id.propertyId?.toString()) ?? "Unknown",
        type: "expense",
        category: `Maintenance – ${r._id.category}`,
        amount: r.amount ?? 0,
        count: r.count,
      })),
      ...vendorRows.map((r) => ({
        year,
        month: r._id.month,
        monthName: MONTH_NAMES[r._id.month - 1],
        propertyId: r._id.propertyId?.toString(),
        propertyName: propertyNameMap.get(r._id.propertyId?.toString()) ?? "Unknown",
        type: "expense",
        category: `Vendor – ${r._id.category}`,
        amount: r.amount ?? 0,
        count: r.count,
      })),
    ].sort((a, b) => a.month - b.month);

    const totalIncome = income.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    const summary = {
      year,
      totalIncome,
      totalExpenses,
      netIncome,
      properties: properties.length,
    };

    if (format === "csv") {
      const allRows = [
        ...income.map((r) => ({
          Year: r.year,
          Month: r.monthName,
          Property: r.propertyName,
          Type: "Income",
          Category: r.category,
          Amount: r.amount.toFixed(2),
          Transactions: r.count,
        })),
        ...expenses.map((r) => ({
          Year: r.year,
          Month: r.monthName,
          Property: r.propertyName,
          Type: "Expense",
          Category: r.category,
          Amount: r.amount.toFixed(2),
          Transactions: r.count,
        })),
      ];

      const headers = ["Year", "Month", "Property", "Type", "Category", "Amount", "Transactions"];
      const csvLines = [
        headers.join(","),
        ...allRows.map(toCsvRow),
        "",
        `Summary`,
        `Total Income,${totalIncome.toFixed(2)}`,
        `Total Expenses,${totalExpenses.toFixed(2)}`,
        `Net Income,${netIncome.toFixed(2)}`,
      ];

      return new NextResponse(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="tax-prep-${year}.csv"`,
        },
      });
    }

    return createSuccessResponse({ year, income, expenses, summary });
  } catch (error) {
    return handleApiError(error);
  }
});
