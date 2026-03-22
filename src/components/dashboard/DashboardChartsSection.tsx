"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, PieChart, CreditCard } from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import type { DashboardTrendPoint, DashboardPropertyTypeSlice } from "@/types/dashboard";
import type { DashboardPaymentsSummary } from "@/types/dashboard";

export interface DashboardChartsSectionProps {
  revenueTrend: DashboardTrendPoint[];
  propertyDistribution: DashboardPropertyTypeSlice[];
  overview: { totalProperties?: number } | null;
  payments: DashboardPaymentsSummary | null;
  currentRevenueValue: number;
  currentExpenseValue: number;
  isLight: boolean;
  pageHeading: string;
  pageBody: string;
  pageMuted: string;
  headerActionClass: string;
  chartGridStroke: string;
  chartTickFill: string;
  t: (key: string, opts?: { defaultValue?: string; values?: Record<string, unknown> }) => string;
  formatCurrency: (value: number) => string;
}

export function DashboardChartsSection({
  revenueTrend,
  propertyDistribution,
  overview,
  payments,
  currentRevenueValue,
  currentExpenseValue,
  isLight,
  pageHeading,
  pageBody,
  pageMuted,
  headerActionClass,
  chartGridStroke,
  chartTickFill,
  t,
  formatCurrency,
}: DashboardChartsSectionProps) {
  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Revenue & Expenses Trends */}
      <div className="space-y-3">
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
                  <LineChart
                    className={cn("h-5 w-5", isLight ? "text-sky-600" : "text-sky-200")}
                  />
                  {t("dashboard.charts.revenueExpenses.title")}
                </CardTitle>
                <CardDescription className="mt-0.5 text-sm">
                  {t("dashboard.charts.revenueExpenses.description")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className={cn(
                    "shrink-0 rounded-xl text-base focus-visible:outline-none",
                    headerActionClass
                  )}
                  aria-label={t("dashboard.charts.revenueExpenses.title")}
                >
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-300/90 shadow-[0_0_12px_rgba(110,231,183,0.35)]" />
                <span className={cn("text-base", pageBody)}>
                  {t("dashboard.charts.revenueExpenses.legend.revenue")}
                </span>
                <span className={cn("text-xl font-semibold", pageHeading)}>
                  {formatCurrency(currentRevenueValue)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-300/90 shadow-[0_0_12px_rgba(252,211,77,0.35)]" />
                <span className={cn("text-base", pageBody)}>
                  {t("dashboard.charts.revenueExpenses.legend.expenses")}
                </span>
                <span className={cn("text-xl font-semibold", pageHeading)}>
                  {formatCurrency(currentExpenseValue)}
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6ee7b7" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#6ee7b7" stopOpacity={0.06} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fcd34d" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#fcd34d" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 14, fill: chartTickFill }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 14, fill: chartTickFill }}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div
                          className={cn(
                            "rounded-xl border p-3 text-base shadow-lg",
                            isLight
                              ? "border-slate-200 bg-white text-slate-900"
                              : "border-white/20 bg-white/10 text-white backdrop-blur-xl [-webkit-backdrop-filter:blur(16px)]"
                          )}
                        >
                          <p className={cn("mb-2 text-base font-medium", pageHeading)}>{label}</p>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2 text-base">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className={pageBody}>{entry.name}:</span>
                              <span className={cn("font-semibold", pageHeading)}>
                                {formatCurrency(entry.value as number)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="totalRevenue"
                  stroke="#6ee7b7"
                  strokeWidth={2}
                  fill="url(#incomeGradient)"
                  name={t("dashboard.charts.revenueExpenses.legend.revenue")}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="totalExpenses"
                  stroke="#fcd34d"
                  strokeWidth={2}
                  fill="url(#expenseGradient)"
                  name={t("dashboard.charts.revenueExpenses.legend.expenses")}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Property Type Distribution and Payment Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
                <PieChart
                  className={cn("h-5 w-5", isLight ? "text-violet-600" : "text-violet-200")}
                />
                {t("dashboard.charts.propertyDistribution.title")}
              </CardTitle>
              <CardDescription className="text-sm">
                {t("dashboard.charts.propertyDistribution.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={propertyDistribution as Record<string, unknown>[]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {propertyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as DashboardPropertyTypeSlice;
                          const percentage = overview?.totalProperties
                            ? Math.round((data.value / overview.totalProperties) * 100)
                            : 0;
                          return (
                            <div
                              className={cn(
                                "rounded-xl border p-2 text-base font-medium shadow-lg",
                                isLight
                                  ? "border-slate-200 bg-white text-slate-900"
                                  : "border-white/20 bg-white/10 text-white backdrop-blur-xl [-webkit-backdrop-filter:blur(14px)]"
                              )}
                            >
                              <p>
                                {data.name}: {data.value} ({percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={cn("text-sm", pageMuted)}>
                      {t("dashboard.charts.propertyDistribution.total")}
                    </div>
                    <div className={cn("text-3xl font-bold", pageHeading)}>
                      {overview?.totalProperties ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                {propertyDistribution.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className={cn("whitespace-nowrap text-sm", pageBody)}>
                      {entry.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
                <CreditCard
                  className={cn("h-5 w-5", isLight ? "text-emerald-600" : "text-emerald-200")}
                />
                {t("dashboard.paymentStatus.title")}
              </CardTitle>
              <CardDescription className="text-sm">
                {t("dashboard.paymentStatus.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm", pageBody)}>
                    {t("dashboard.paymentStatus.collected")}
                  </span>
                  <span className={cn("text-base font-semibold", pageHeading)}>
                    {formatCurrency(payments?.collected ?? 0)}
                  </span>
                </div>
                <Progress
                  value={
                    payments?.totalDue
                      ? (payments.collected / payments.totalDue) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div
                  className={cn(
                    "rounded-xl border p-3 text-center",
                    isLight
                      ? "border-amber-200 bg-amber-50"
                      : "border-amber-200/30 bg-amber-300/12 backdrop-blur-sm"
                  )}
                >
                  <div className={cn("text-base font-semibold tracking-tight", pageHeading)}>
                    {formatCurrency(payments?.pending ?? 0)}
                  </div>
                  <div className={cn("mt-0.5 text-xs", pageMuted)}>
                    {t("dashboard.paymentStatus.pending")}
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-xl border p-3 text-center",
                    isLight
                      ? "border-rose-200 bg-rose-50"
                      : "border-rose-200/30 bg-rose-300/12 backdrop-blur-sm"
                  )}
                >
                  <div className={cn("text-base font-semibold tracking-tight", pageHeading)}>
                    {formatCurrency(payments?.overdue ?? 0)}
                  </div>
                  <div className={cn("mt-0.5 text-xs", pageMuted)}>
                    {t("dashboard.paymentStatus.overdue")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
