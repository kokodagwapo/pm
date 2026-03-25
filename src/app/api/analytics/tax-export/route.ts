/**
 * SmartStartPM — Tax Prep Export API
 * Generates a year-end income/expense summary as CSV, JSON, or PDF.
 * Query params:
 *   year       (number, defaults to current year)
 *   format     "csv" | "json" | "pdf"
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

/** Generate an HTML-based Schedule E report styled for printing/saving as PDF */
function generateTaxHtmlReport(params: {
  year: number;
  properties: string[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  scheduleESummary: { line: string; description: string; income: number; expenses: number }[];
  income: { category: string; amount: number; scheduleELine: string; scheduleEDescription: string; monthName: string }[];
  expenses: { category: string; amount: number; scheduleELine: string; scheduleEDescription: string; monthName: string }[];
}): string {
  const { year, properties, totalIncome, totalExpenses, netIncome, scheduleESummary, income, expenses } = params;
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const today = new Date().toLocaleDateString("en-US", { dateStyle: "long" });
  const netColor = netIncome >= 0 ? "#16a34a" : "#dc2626";

  const scheduleERows = scheduleESummary
    .map((s) => `
      <tr>
        <td>Line ${s.line}</td>
        <td>${s.description}</td>
        <td style="text-align:right;color:#16a34a">${s.income > 0 ? fmt(s.income) : "—"}</td>
        <td style="text-align:right;color:#dc2626">${s.expenses > 0 ? fmt(s.expenses) : "—"}</td>
      </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Tax Prep Report — Schedule E ${year}</title>
  <style>
    @media print { @page { margin: 1in; } .no-print { display: none; } }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 20px; }
    h1 { font-size: 20px; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }
    h2 { font-size: 14px; margin-top: 24px; color: #1e40af; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #1e40af; color: white; padding: 6px 8px; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #f8fafc; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 16px 0; }
    .kpi-box { border: 1px solid #ddd; padding: 12px; border-radius: 6px; text-align: center; }
    .kpi-label { font-size: 11px; color: #666; text-transform: uppercase; }
    .kpi-value { font-size: 18px; font-weight: bold; margin-top: 4px; }
    .disclaimer { margin-top: 24px; padding: 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; font-size: 11px; color: #92400e; }
    .no-print { margin-bottom: 16px; }
    .print-btn { background: #1e40af; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <h1>IRS Schedule E Summary — Tax Year ${year}</h1>
  <p><strong>Generated:</strong> ${today}</p>
  <p><strong>Properties:</strong> ${properties.join(", ")}</p>

  <h2>Financial Overview</h2>
  <div class="summary-grid">
    <div class="kpi-box">
      <div class="kpi-label">Total Income (Line 3)</div>
      <div class="kpi-value" style="color:#16a34a">${fmt(totalIncome)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Total Expenses</div>
      <div class="kpi-value" style="color:#dc2626">${fmt(totalExpenses)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Net Income / (Loss)</div>
      <div class="kpi-value" style="color:${netColor}">${fmt(netIncome)}</div>
    </div>
  </div>

  <h2>Schedule E Line Summary (Form 1040, Part I)</h2>
  <table>
    <thead><tr><th>Line</th><th>Description</th><th style="text-align:right">Income</th><th style="text-align:right">Expenses</th></tr></thead>
    <tbody>${scheduleERows}</tbody>
  </table>

  <h2>Income Detail</h2>
  <table>
    <thead><tr><th>Month</th><th>Category</th><th>Schedule E</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${income.map((r) => `<tr>
      <td>${r.monthName}</td>
      <td>${r.category}</td>
      <td>Line ${r.scheduleELine} — ${r.scheduleEDescription}</td>
      <td style="text-align:right;color:#16a34a">${fmt(r.amount)}</td>
    </tr>`).join("")}</tbody>
  </table>

  <h2>Expense Detail</h2>
  <table>
    <thead><tr><th>Month</th><th>Category</th><th>Schedule E</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${expenses.map((r) => `<tr>
      <td>${r.monthName}</td>
      <td>${r.category}</td>
      <td>Line ${r.scheduleELine} — ${r.scheduleEDescription}</td>
      <td style="text-align:right;color:#dc2626">${fmt(r.amount)}</td>
    </tr>`).join("")}</tbody>
  </table>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report is generated for informational purposes only and does not constitute tax advice.
    Consult a licensed CPA or tax professional before filing. Depreciation, amortization, and other adjustments may require
    additional documentation (Form 4562, Form 4797, etc.). Figures are based on recorded transactions in SmartStartPM.
  </div>
</body>
</html>`;
}

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
  // Property management and operating expense categories
  "Management": { line: "11", description: "Management Fees" },
  "Property Management": { line: "11", description: "Management Fees" },
  "Insurance": { line: "9",  description: "Insurance" },
  "Property Tax": { line: "16", description: "Taxes" },
  "Taxes": { line: "16", description: "Taxes" },
  "Advertising": { line: "5",  description: "Advertising" },
  "Legal": { line: "10", description: "Legal and Professional Fees" },
  "Accounting": { line: "10", description: "Legal and Professional Fees — Accounting" },
  "Utilities": { line: "17", description: "Utilities" },
  "Water": { line: "17", description: "Utilities — Water" },
  "Gas": { line: "17", description: "Utilities — Gas" },
  "Depreciation": { line: "18", description: "Depreciation Expense" },
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

    // Map payment type to Schedule E income or expense line
    const paymentTypeToScheduleE = (payType: string): { line: string; description: string; incomeOrExpense: "income" | "expense" } => {
      const t = String(payType ?? "").toLowerCase();
      if (t.includes("rent")) return { line: "3", description: "Rents Received", incomeOrExpense: "income" };
      if (t.includes("late")) return { line: "3", description: "Rents Received — Late Fees", incomeOrExpense: "income" };
      if (t.includes("deposit")) return { line: "3", description: "Deposits (if income)", incomeOrExpense: "income" };
      if (t.includes("util")) return { line: "17", description: "Utilities", incomeOrExpense: "expense" };
      if (t.includes("maintenance")) return { line: "14", description: "Repairs", incomeOrExpense: "expense" };
      if (t.includes("invoice")) return { line: "11", description: "Management Fees / Professional Services", incomeOrExpense: "expense" };
      return { line: "3", description: "Rents Received — Other", incomeOrExpense: "income" };
    };

    type TaxRow = {
      year: number; month: number; monthName: string; propertyId: string | undefined;
      propertyName: string; type: string; category: string; amount: number; count: number;
      scheduleELine: string; scheduleEDescription: string;
    };
    // Separate payments into income vs expense based on type classification
    const paymentIncome: TaxRow[] = [];
    const paymentExpenses: TaxRow[] = [];

    for (const r of incomeRows) {
      const se = paymentTypeToScheduleE(String(r._id.type ?? ""));
      const row = {
        year,
        month: r._id.month,
        monthName: MONTH_NAMES[r._id.month - 1],
        propertyId: r._id.propertyId?.toString(),
        propertyName: propertyNameMap.get(r._id.propertyId?.toString()) ?? "Unknown",
        type: se.incomeOrExpense,
        category: String(r._id.type ?? "other").replace(/_/g, " "),
        amount: r.amount ?? 0,
        count: r.count,
        scheduleELine: se.line,
        scheduleEDescription: se.description,
      };
      if (se.incomeOrExpense === "expense") {
        paymentExpenses.push(row);
      } else {
        paymentIncome.push(row);
      }
    }

    const income = paymentIncome;

    const expenses = [
      ...paymentExpenses,
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

    if (format === "pdf") {
      const html = generateTaxHtmlReport({
        year,
        properties: properties.map((p) => p.name ?? "Property"),
        totalIncome,
        totalExpenses,
        netIncome,
        scheduleESummary,
        income,
        expenses,
      });
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="schedule-e-${year}.html"`,
        },
      });
    }

    return createSuccessResponse({ year, income, expenses, summary, scheduleE: scheduleESummary });
  } catch (error) {
    return handleApiError(error);
  }
});
