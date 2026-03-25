"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface PropertyROI {
  id: string;
  name: string;
  units: number;
  yearBuilt: number | null;
  purchasePrice: number;
  yearsOwned: number;
  ytdRevenue: number;
  ytdExpenses: number;
  ytdNOI: number;
  annualRent: number;
  annualRevenue: number;
  annualExpenses: number;
  annualNOI: number;
  grossYield: number | null;
  netYield: number | null;
  appreciationEstimate: number;
  totalReturn: number | null;
  expenseRatio: number | null;
}

interface Portfolio {
  totalProperties: number;
  totalPurchasePrice: number;
  totalYtdRevenue: number;
  totalYtdExpenses: number;
  totalYtdNOI: number;
  totalAnnualRent: number;
  totalAppreciationEstimate: number;
  avgGrossYield: number | null;
  avgNetYield: number | null;
  portfolioExpenseRatio: number | null;
}

interface ROIData {
  portfolio: Portfolio | null;
  properties: PropertyROI[];
  calculatedAt: string;
  ytdPeriod: { start: string; end: string };
  note: string;
}

const fmt = (n: number, decimals = 0) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const pct = (n: number | null) =>
  n !== null ? `${n.toFixed(1)}%` : "—";

const yieldColor = (y: number | null) => {
  if (y === null) return "text-gray-400";
  if (y >= 7) return "text-green-600 dark:text-green-400";
  if (y >= 4) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

export default function OwnerROIPage() {
  const [data, setData] = useState<ROIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/analytics/owner-roi", window.location.origin);
      if (selectedProperty) url.searchParams.set("propertyId", selectedProperty);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load ROI data");
      const json = await res.json();
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const portfolio = data?.portfolio;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/dashboard/analytics" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Analytics
            </Link>
            <span>/</span>
            <span>Owner ROI Report</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Owner ROI Report
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Return on investment metrics across your portfolio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && (
        <div className="space-y-6">
          {/* YTD period note */}
          {data.ytdPeriod && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              YTD period: {new Date(data.ytdPeriod.start).toLocaleDateString()} –{" "}
              {new Date(data.ytdPeriod.end).toLocaleDateString()}
            </div>
          )}

          {/* Portfolio summary cards */}
          {portfolio && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">YTD Revenue</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {fmt(portfolio.totalYtdRevenue)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">YTD Expenses</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {fmt(portfolio.totalYtdExpenses)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">YTD NOI</p>
                <p className={`text-xl font-bold mt-1 ${portfolio.totalYtdNOI >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {fmt(portfolio.totalYtdNOI)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Est. Appreciation</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {fmt(portfolio.totalAppreciationEstimate)}
                </p>
              </div>
            </div>
          )}

          {/* Yield summary */}
          {portfolio && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Gross Yield</p>
                <p className={`text-3xl font-bold ${yieldColor(portfolio.avgGrossYield)}`}>
                  {pct(portfolio.avgGrossYield)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Annual rent ÷ purchase price</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Avg Net Yield</p>
                <p className={`text-3xl font-bold ${yieldColor(portfolio.avgNetYield)}`}>
                  {pct(portfolio.avgNetYield)}
                </p>
                <p className="text-xs text-gray-400 mt-1">NOI ÷ purchase price (annualised)</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Expense Ratio</p>
                <p className={`text-3xl font-bold ${portfolio.portfolioExpenseRatio !== null && portfolio.portfolioExpenseRatio <= 40 ? "text-green-600 dark:text-green-400" : portfolio.portfolioExpenseRatio !== null && portfolio.portfolioExpenseRatio <= 60 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                  {pct(portfolio.portfolioExpenseRatio)}
                </p>
                <p className="text-xs text-gray-400 mt-1">YTD expenses ÷ revenue</p>
              </div>
            </div>
          )}

          {/* Per-property table */}
          {data.properties.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Property-Level ROI
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Sorted by net yield (highest first)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Property</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Units</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Purchase Price</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">YTD Revenue</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">YTD NOI</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Gross Yield</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Net Yield</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Est. Appreciation</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Total Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.properties.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                          {p.yearBuilt && (
                            <div className="text-xs text-gray-400">Built {p.yearBuilt}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{p.units}</td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-mono">
                          {p.purchasePrice > 0 ? fmt(p.purchasePrice) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-mono">
                          {fmt(p.ytdRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span className={p.ytdNOI >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                            {fmt(p.ytdNOI)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${yieldColor(p.grossYield)}`}>
                          {pct(p.grossYield)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${yieldColor(p.netYield)}`}>
                          {pct(p.netYield)}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-mono">
                          {p.appreciationEstimate > 0 ? `+${fmt(p.appreciationEstimate)}` : "—"}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-semibold ${yieldColor(p.totalReturn)}`}>
                          {pct(p.totalReturn)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No properties found.</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-xs text-amber-700 dark:text-amber-300">
            <strong>Disclaimer:</strong> {data.note} Yields and returns shown are estimates based on recorded data and should not be considered tax or investment advice. Consult a qualified financial advisor.
          </div>
        </div>
      )}
    </div>
  );
}
