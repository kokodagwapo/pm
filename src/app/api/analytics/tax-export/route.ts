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

/**
 * IRS Schedule E category mapping (Form 1040, Part I — Supplemental Income and Loss)
 *
 * Income: Line 3 — Rents received
 * Expenses mapped to Schedule E lines:
 *   Line 5  — Advertising
 *   Line 6  — Auto and travel
 *   Line 7  — Cleaning and maintenance
 *   Line 8  — Commissions
 *   Line 9  — Insurance
 *   Line 10 — Legal and other professional fees
 *   Line 11 — Management fees
 *   Line 12 — Mortgage interest paid to banks
 *   Line 13 — Other interest
 *   Line 14 — Repairs
 *   Line 15 — Supplies
 *   Line 16 — Taxes
 *   Line 17 — Utilities
 *   Line 18 — Depreciation expense or depletion
 *   Line 19 — Other
 */
const MAINTENANCE_TO_SCHEDULE_E: Record<string, { line: string; description: string }> = {
  "Plumbing": { line: "14", description: "Repairs — Plumbing" },
  "Electrical": { line: "17", description: "Utilities — Electrical" },
  "HVAC": { line: "14", description: "Repairs — HVAC" },
  "Appliances": { line: "14", description: "Repairs — Appliances" },
  "Flooring": { line: "14", description: "Repairs — Flooring" },
  "Painting": { line: "7",  description: "Cleaning and Maintenance — Painting" },
  "Roofing": { line: "14", description: "Repairs — Roofing" },
  "Windows": { line: "14", description: "Repairs — Windows" },
  "Doors": { line: "14", description: "Repairs — Doors" },
  "Landscaping": { line: "7",  description: "Cleaning and Maintenance — Landscaping" },
  "Cleaning": { line: "7",  description: "Cleaning and Maintenance" },
  "Pest Control": { line: "7",  description: "Cleaning and Maintenance — Pest Control" },
  "Security": { line: "15", description: "Supplies — Security" },
  "General Repair": { line: "14", description: "Repairs — General" },
  "Emergency": { line: "14", description: "Repairs — Emergency" },
  "Other": { line: "19", description: "Other Expenses" },
};

const VENDOR_TO_SCHEDULE_E: Record<string, { line: string; description: string }> = {
  "Plumbing": { line: "14", description: "Repairs — Plumbing (Vendor)" },
  "Electrical": { line: "17", description: "Utilities — Electrical (Vendor)" },
  "HVAC": { line: "14", description: "Repairs — HVAC (Vendor)" },
  "Appliances": { line: "14", description: "Repairs — Appliances (Vendor)" },
  "Flooring": { line: "14", description: "Repairs — Flooring (Vendor)" },
  "Roofing": { line: "14", description: "Repairs — Roofing (Vendor)" },
  "Painting": { line: "7",  description: "Cleaning and Maintenance — Painting (Vendor)" },
  "Landscaping": { line: "7",  description: "Cleaning and Maintenance — Landscaping (Vendor)" },
  "Pest Control": { line: "7",  description: "Cleaning and Maintenance — Pest Control (Vendor)" },
  "Cleaning": { line: "7",  description: "Cleaning and Maintenance (Vendor)" },
  "Security": { line: "15", description: "Supplies — Security (Vendor)" },
  "Structural": { line: "14", description: "Repairs — Structural (Vendor)" },
  "Windows": { line: "14", description: "Repairs — Windows (Vendor)" },
  "Doors": { line: "14", description: "Repairs — Doors (Vendor)" },
  "General": { line: "14", description: "Repairs — General (Vendor)" },
  "Emergency": { line: "14", description: "Repairs — Emergency (Vendor)" },
  "Other": { line: "19", description: "Other Expenses (Vendor)" },
};

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

    // Map payment type to Schedule E income line
    const paymentTypeToScheduleE = (payType: string): { line: string; description: string } => {
      const t = String(payType ?? "").toLowerCase();
      if (t.includes("rent")) return { line: "3", description: "Rents Received" };
      if (t.includes("late")) return { line: "3", description: "Rents Received — Late Fees" };
      if (t.includes("deposit")) return { line: "3", description: "Deposits (if income)" };
      if (t.includes("util")) return { line: "17", description: "Utilities" };
      return { line: "3", description: "Rents Received — Other" };
    };

    const income = incomeRows.map((r) => {
      const se = paymentTypeToScheduleE(String(r._id.type ?? ""));
      return {
        year,
        month: r._id.month,
        monthName: MONTH_NAMES[r._id.month - 1],
        propertyId: r._id.propertyId?.toString(),
        propertyName: propertyNameMap.get(r._id.propertyId?.toString()) ?? "Unknown",
        type: "income",
        category: String(r._id.type ?? "other").replace(/_/g, " "),
        amount: r.amount ?? 0,
        count: r.count,
        scheduleELine: se.line,
        scheduleEDescription: se.description,
      };
    });

    const expenses = [
      ...maintRows.map((r) => {
        const se = MAINTENANCE_TO_SCHEDULE_E[r._id.category] ?? { line: "14", description: "Repairs" };
        return {
          year,
          month: r._id.month,
          monthName: MONTH_NAMES[r._id.month - 1],
          propertyId: r._id.propertyId?.toString(),
          propertyName: propertyNameMap.get(r._id.propertyId?.toString()) ?? "Unknown",
          type: "expense",
          category: `Maintenance – ${r._id.category}`,
          amount: r.amount ?? 0,
          count: r.count,
          scheduleELine: se.line,
          scheduleEDescription: se.description,
        };
      }),
      ...vendorRows.map((r) => {
        const se = VENDOR_TO_SCHEDULE_E[r._id.category] ?? { line: "14", description: "Repairs (Vendor)" };
        return {
          year,
          month: r._id.month,
          monthName: MONTH_NAMES[r._id.month - 1],
          propertyId: r._id.propertyId?.toString(),
          propertyName: propertyNameMap.get(r._id.propertyId?.toString()) ?? "Unknown",
          type: "expense",
          category: `Vendor – ${r._id.category}`,
          amount: r.amount ?? 0,
          count: r.count,
          scheduleELine: se.line,
          scheduleEDescription: se.description,
        };
      }),
    ].sort((a, b) => a.month - b.month);

    // Aggregate Schedule E line totals
    const scheduleEByLine: Record<string, { line: string; description: string; income: number; expenses: number }> = {};
    for (const r of income) {
      const key = `L${r.scheduleELine}`;
      if (!scheduleEByLine[key]) scheduleEByLine[key] = { line: r.scheduleELine, description: r.scheduleEDescription, income: 0, expenses: 0 };
      scheduleEByLine[key].income += r.amount;
    }
    for (const r of expenses) {
      const key = `L${r.scheduleELine}`;
      if (!scheduleEByLine[key]) scheduleEByLine[key] = { line: r.scheduleELine, description: r.scheduleEDescription, income: 0, expenses: 0 };
      scheduleEByLine[key].expenses += r.amount;
    }
    const scheduleESummary = Object.values(scheduleEByLine).sort((a, b) => Number(a.line) - Number(b.line));

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
          "Schedule E Line": `Line ${r.scheduleELine}`,
          "Schedule E Description": r.scheduleEDescription,
          Amount: r.amount.toFixed(2),
          Transactions: r.count,
        })),
        ...expenses.map((r) => ({
          Year: r.year,
          Month: r.monthName,
          Property: r.propertyName,
          Type: "Expense",
          Category: r.category,
          "Schedule E Line": `Line ${r.scheduleELine}`,
          "Schedule E Description": r.scheduleEDescription,
          Amount: r.amount.toFixed(2),
          Transactions: r.count,
        })),
      ];

      const headers = ["Year", "Month", "Property", "Type", "Category", "Schedule E Line", "Schedule E Description", "Amount", "Transactions"];
      const csvLines = [
        headers.join(","),
        ...allRows.map(toCsvRow),
        "",
        "IRS Schedule E Summary",
        "Line,Description,Income,Expenses",
        ...scheduleESummary.map((s) => `Line ${s.line},"${s.description}",${s.income.toFixed(2)},${s.expenses.toFixed(2)}`),
        "",
        "Summary",
        `Total Income,${totalIncome.toFixed(2)}`,
        `Total Expenses,${totalExpenses.toFixed(2)}`,
        `Net Income,${netIncome.toFixed(2)}`,
      ];

      return new NextResponse(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="tax-prep-schedule-e-${year}.csv"`,
        },
      });
    }

    return createSuccessResponse({ year, income, expenses, summary, scheduleE: scheduleESummary });
  } catch (error) {
    return handleApiError(error);
  }
});
