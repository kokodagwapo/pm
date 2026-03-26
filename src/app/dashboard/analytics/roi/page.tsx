"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { Button } from "@/components/ui/button";

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
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? true;
  const [data, setData] = useState<ROIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>("");

  const surfaceCard = cn(
    "dashboard-ui-surface text-card-foreground rounded-xl border p-4 transition-[box-shadow,border-color,background-color] duration-200"
  );
  const surfaceCardLg = cn(
    "dashboard-ui-surface text-card-foreground rounded-xl border p-5 transition-[box-shadow,border-color,background-color] duration-200"
  );
  const tableShell = cn(
    "dashboard-ui-surface text-card-foreground rounded-xl border overflow-hidden transition-[box-shadow,border-color,background-color] duration-200"
  );

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div
            className={cn(
              "mb-1 flex items-center gap-2 text-sm",
              isLight ? "text-muted-foreground" : "text-white/60"
            )}
          >
            <Link
              href="/dashboard/analytics"
              className={cn(
                "transition-colors",
                isLight ? "hover:text-primary" : "hover:text-cyan-300"
              )}
            >
              Analytics
            </Link>
            <span>/</span>
            <span>Owner ROI Report</span>
          </div>
          <h1
            className={cn(
              "text-2xl font-bold tracking-tight",
              isLight ? "text-foreground" : "text-white"
            )}
          >
            Owner ROI Report
          </h1>
          <p
            className={cn(
              "mt-1 text-sm",
              isLight ? "text-muted-foreground" : "text-white/65"
            )}
          >
            Return on investment metrics across your portfolio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => void fetchData()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex h-64 items-center justify-center">
          <div
            className={cn(
              "h-10 w-10 animate-spin rounded-full border-2 border-transparent border-t-current",
              isLight ? "text-primary" : "text-cyan-400"
            )}
          />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          className={cn(
            "rounded-lg border p-4 text-sm backdrop-blur-md",
            isLight
              ? "border-red-200 bg-red-50/90 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
              : "border-red-400/35 bg-red-500/10 text-red-100"
          )}
        >
          {error}
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && (
        <div className="space-y-6">
          {/* YTD period note */}
          {data.ytdPeriod && (
            <div
              className={cn(
                "text-xs",
                isLight ? "text-muted-foreground" : "text-white/55"
              )}
            >
              YTD period: {new Date(data.ytdPeriod.start).toLocaleDateString()} –{" "}
              {new Date(data.ytdPeriod.end).toLocaleDateString()}
            </div>
          )}

          {/* Portfolio summary cards */}
          {portfolio && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className={surfaceCard}>
                <p className={cn("text-xs", isLight ? "text-muted-foreground" : "text-white/60")}>
                  YTD Revenue
                </p>
                <p
                  className={cn(
                    "mt-1 text-xl font-bold",
                    isLight ? "text-foreground" : "text-white"
                  )}
                >
                  {fmt(portfolio.totalYtdRevenue)}
                </p>
              </div>
              <div className={surfaceCard}>
                <p className={cn("text-xs", isLight ? "text-muted-foreground" : "text-white/60")}>
                  YTD Expenses
                </p>
                <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                  {fmt(portfolio.totalYtdExpenses)}
                </p>
              </div>
              <div className={surfaceCard}>
                <p className={cn("text-xs", isLight ? "text-muted-foreground" : "text-white/60")}>
                  YTD NOI
                </p>
                <p
                  className={cn(
                    "mt-1 text-xl font-bold",
                    portfolio.totalYtdNOI >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {fmt(portfolio.totalYtdNOI)}
                </p>
              </div>
              <div className={surfaceCard}>
                <p className={cn("text-xs", isLight ? "text-muted-foreground" : "text-white/60")}>
                  Est. Appreciation
                </p>
                <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                  {fmt(portfolio.totalAppreciationEstimate)}
                </p>
              </div>
            </div>
          )}

          {/* Yield summary */}
          {portfolio && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className={surfaceCardLg}>
                <p
                  className={cn(
                    "mb-1 text-sm",
                    isLight ? "text-muted-foreground" : "text-white/60"
                  )}
                >
                  Avg Gross Yield
                </p>
                <p className={`text-3xl font-bold ${yieldColor(portfolio.avgGrossYield)}`}>
                  {pct(portfolio.avgGrossYield)}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    isLight ? "text-muted-foreground" : "text-white/50"
                  )}
                >
                  Annual rent ÷ purchase price
                </p>
              </div>
              <div className={surfaceCardLg}>
                <p
                  className={cn(
                    "mb-1 text-sm",
                    isLight ? "text-muted-foreground" : "text-white/60"
                  )}
                >
                  Avg Net Yield
                </p>
                <p className={`text-3xl font-bold ${yieldColor(portfolio.avgNetYield)}`}>
                  {pct(portfolio.avgNetYield)}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    isLight ? "text-muted-foreground" : "text-white/50"
                  )}
                >
                  NOI ÷ purchase price (annualised)
                </p>
              </div>
              <div className={surfaceCardLg}>
                <p
                  className={cn(
                    "mb-1 text-sm",
                    isLight ? "text-muted-foreground" : "text-white/60"
                  )}
                >
                  Expense Ratio
                </p>
                <p
                  className={`text-3xl font-bold ${
                    portfolio.portfolioExpenseRatio !== null && portfolio.portfolioExpenseRatio <= 40
                      ? "text-green-600 dark:text-green-400"
                      : portfolio.portfolioExpenseRatio !== null && portfolio.portfolioExpenseRatio <= 60
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {pct(portfolio.portfolioExpenseRatio)}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    isLight ? "text-muted-foreground" : "text-white/50"
                  )}
                >
                  YTD expenses ÷ revenue
                </p>
              </div>
            </div>
          )}

          {/* Per-property table */}
          {data.properties.length > 0 ? (
            <div className={tableShell}>
              <div
                className={cn(
                  "border-b p-4",
                  isLight ? "border-border" : "border-white/10"
                )}
              >
                <h2
                  className={cn(
                    "text-base font-semibold",
                    isLight ? "text-foreground" : "text-white"
                  )}
                >
                  Property-Level ROI
                </h2>
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    isLight ? "text-muted-foreground" : "text-white/55"
                  )}
                >
                  Sorted by net yield (highest first)
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className={cn(
                        "border-b",
                        isLight
                          ? "border-border bg-muted/40"
                          : "border-white/10 bg-white/[0.06]"
                      )}
                    >
                      <th
                        className={cn(
                          "px-4 py-3 text-left font-medium",
                          isLight ? "text-foreground" : "text-white/85"
                        )}
                      >
                        Property
                      </th>
                      <th
                        className={cn(
                          "px-4 py-3 text-right font-medium",
                          isLight ? "text-foreground" : "text-white/85"
                        )}
                      >
                        Units
                      </th>
                      <th
                        className={cn(
                          "px-4 py-3 text-right font-medium",
                          isLight ? "text-foreground" : "text-white/85"
                        )}
                      >
                        Purchase Price
                      </th>
                      <th
                        className={cn(
                          "px-4 py-3 text-right font-medium",
                          isLight ? "text-foreground" : "text-white/85"
                        )}
                      >
                        YTD Revenue
                      </th>
                      <th
                        className={cn(
                          "px-4 py-3 text-right font-medium",
                          isLight ? "text-foreground" : "text-white/85"
                        )}
                      >
                        YTD NOI
                      </th>
                      <th
                        className={cn(
                          "px-4 py-3 text-right font-medium",
                          isLight ? "text-foreground" : "text-white/85"
                        )}
                      >
                        Gross Yield
                      </th>
                      <th
                        className={cn(
                          "px-4 py-3 text-right font-medium",
                          isLight ? "text-foreground" : "text-white/85"
                        )}
                      >
                        Net Yield
                      </th>
                      <th
                        className={cn(
                          "px-4 py-3 text-right font-medium",
                          isLight ? "text-foreground" : "text-white/85"
                        )}
                      >
                        Est. Appreciation
                      </th>
                      <th
                        className={cn(
                          "px-4 py-3 text-right font-medium",
                          isLight ? "text-foreground" : "text-white/85"
                        )}
                      >
                        Total Return
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className={cn(
                      "divide-y",
                      isLight ? "divide-border" : "divide-white/10"
                    )}
                  >
                    {data.properties.map((p) => (
                      <tr
                        key={p.id}
                        className={cn(
                          "transition-colors",
                          isLight
                            ? "hover:bg-muted/30"
                            : "hover:bg-white/[0.07]"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div
                            className={cn(
                              "font-medium",
                              isLight ? "text-foreground" : "text-white"
                            )}
                          >
                            {p.name}
                          </div>
                          {p.yearBuilt && (
                            <div
                              className={cn(
                                "text-xs",
                                isLight ? "text-muted-foreground" : "text-white/50"
                              )}
                            >
                              Built {p.yearBuilt}
                            </div>
                          )}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right",
                            isLight ? "text-muted-foreground" : "text-white/70"
                          )}
                        >
                          {p.units}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-mono",
                            isLight ? "text-foreground" : "text-white"
                          )}
                        >
                          {p.purchasePrice > 0 ? fmt(p.purchasePrice) : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-mono",
                            isLight ? "text-foreground" : "text-white"
                          )}
                        >
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
            <div className={cn(surfaceCard, "p-12 text-center")}>
              <p className={isLight ? "text-muted-foreground" : "text-white/60"}>
                No properties found.
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <div
            className={cn(
              "rounded-lg border p-4 text-xs backdrop-blur-md",
              isLight
                ? "border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-200"
                : "border-amber-400/35 bg-amber-500/10 text-amber-100"
            )}
          >
            <strong>Disclaimer:</strong> {data.note} Yields and returns shown are estimates based on
            recorded data and should not be considered tax or investment advice. Consult a qualified
            financial advisor.
          </div>
        </div>
      )}
    </div>
  );
}
