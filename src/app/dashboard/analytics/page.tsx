"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Users,
  Wrench,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  AnalyticsCard,
  AnalyticsCardGrid,
} from "@/components/analytics/AnalyticsCard";
import { formatPercentage } from "@/lib/formatters";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { propertyService, PropertyResponse } from "@/lib/services/property.service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const CHART_COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

interface AnalyticsOverviewPayload {
  portfolio: {
    totalProperties: number;
    totalUnits: number;
    totalValue: number;
    averageRent: number;
  };
  occupancy: {
    rate: number;
    occupied: number;
    total: number;
    vacant: number;
  };
  financial: {
    totalRevenue: number;
    pendingRevenue: number;
    totalPayments: number;
    completedPayments: number;
    collectionRate: number;
    paymentMix?: {
      collectedPercent: number;
      pendingPercent: number;
      otherPercent: number;
    };
  };
  maintenance: Record<string, { count: number; cost: number }>;
  monthlyTrends: {
    month: string;
    revenue: number;
    occupancy: number;
    maintenance: number;
  }[];
  propertyPerformance: {
    id: string;
    name: string;
    revenue: number;
    occupancy: number;
    maintenance: number;
  }[];
  revenueBreakdown: {
    type: string;
    name: string;
    amount: number;
    percentage: number;
  }[];
  maintenanceByCategory: { category: string; count: number; cost: number }[];
  period: { startDate: string; endDate: string };
}

function periodToRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  switch (period) {
    case "1month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "3months":
      start.setMonth(start.getMonth() - 3);
      break;
    case "1year":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "custom":
    default:
      start.setMonth(start.getMonth() - 6);
  }
  return { start, end };
}

function compareLastTwoMonths(
  rows: { revenue?: number; occupancy?: number; maintenance?: number }[],
  key: "revenue" | "occupancy" | "maintenance"
) {
  if (rows.length < 2) {
    return { value: "—", isPositive: true };
  }
  const a = rows[rows.length - 2][key] ?? 0;
  const b = rows[rows.length - 1][key] ?? 0;
  if (a === 0 && b === 0) return { value: "0%", isPositive: true };
  if (a === 0) return { value: "+100%", isPositive: true };
  const pct = ((b - a) / a) * 100;
  const sign = pct >= 0 ? "+" : "";
  return {
    value: `${sign}${Math.abs(pct).toFixed(1)}%`,
    isPositive: pct >= 0,
  };
}

export default function AnalyticsPage() {
  const { t, formatCurrency } = useLocalizationContext();
  const { status } = useSession();
  const [selectedPeriod, setSelectedPeriod] = useState("6months");
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState<AnalyticsOverviewPayload | null>(null);
  const [propertyOptions, setPropertyOptions] = useState<PropertyResponse[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatAmount = (value: number) =>
    formatCurrency(value, undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const loadAnalytics = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    setError(null);
    try {
      const { start, end } = periodToRange(selectedPeriod);
      const params = new URLSearchParams({
        type: "overview",
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      if (selectedProperty !== "all") {
        params.set("propertyId", selectedProperty);
      }
      const res = await fetch(`/api/analytics?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || json?.message || "Failed to load analytics");
      }
      const payload = (json?.data ?? json) as AnalyticsOverviewPayload;
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [status, selectedPeriod, selectedProperty]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await propertyService.getProperties({
          page: 1,
          limit: 200,
          sortBy: "name",
          sortOrder: "asc",
        });
        if (!cancelled) {
          setPropertyOptions(res.data ?? []);
        }
      } catch {
        if (!cancelled) setPropertyOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const maintenanceStats = useMemo(() => {
    if (!data?.maintenance) return [];
    return Object.values(data.maintenance);
  }, [data]);

  const monthlyTrends = data?.monthlyTrends ?? [];
  const revenueBreakdown = data?.revenueBreakdown ?? [];
  const propertyPerformance = data?.propertyPerformance ?? [];
  const maintenanceByCategory = data?.maintenanceByCategory ?? [];
  const paymentMix = data?.financial?.paymentMix;

  const revenueChange = compareLastTwoMonths(monthlyTrends, "revenue");
  const occupancyChange = compareLastTwoMonths(monthlyTrends, "occupancy");
  const maintenanceChange = compareLastTwoMonths(
    monthlyTrends,
    "maintenance"
  );

  const totalMaintenanceCost = maintenanceStats.reduce(
    (sum, item) => sum + (item?.cost ?? 0),
    0
  );
  const totalMaintenanceCount = maintenanceStats.reduce(
    (sum, item) => sum + (item?.count ?? 0),
    0
  );

  const portfolioYield =
    data && data.portfolio.totalValue > 0
      ? ((data.financial.totalRevenue / data.portfolio.totalValue) * 100).toFixed(1)
      : null;

  if (status === "loading" || (loading && !data)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        {t("analytics.loading", { defaultValue: "Loading analytics…" })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("analytics.header.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("analytics.header.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">
                {t("analytics.filters.period.lastMonth")}
              </SelectItem>
              <SelectItem value="3months">
                {t("analytics.filters.period.last3Months")}
              </SelectItem>
              <SelectItem value="6months">
                {t("analytics.filters.period.last6Months")}
              </SelectItem>
              <SelectItem value="1year">
                {t("analytics.filters.period.lastYear")}
              </SelectItem>
              <SelectItem value="custom">
                {t("analytics.filters.period.custom")}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[min(100vw-2rem,280px)] sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("analytics.filters.property.all")}
              </SelectItem>
              {propertyOptions.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.name || p._id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => loadAnalytics()}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            {t("analytics.header.refresh")}
          </Button>
          <Button variant="outline" size="sm" type="button" disabled>
            <Download className="mr-2 h-4 w-4" />
            {t("analytics.header.export")}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t("analytics.error.title", { defaultValue: "Could not load analytics" })}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && (
        <AnalyticsCardGrid>
          <AnalyticsCard
            title={t("analytics.cards.totalRevenue")}
            value={formatAmount(data.financial.totalRevenue)}
            icon={DollarSign}
            iconColor="success"
            trend={{
              value: t("analytics.cards.fromLastPeriod", {
                values: { value: revenueChange.value },
                defaultValue: `${revenueChange.value} vs prior month`,
              }),
              isPositive: revenueChange.isPositive,
              icon: revenueChange.isPositive ? TrendingUp : TrendingDown,
            }}
          />

          <AnalyticsCard
            title={t("analytics.cards.occupancyRate")}
            value={formatPercentage(data.occupancy.rate)}
            description={t("analytics.cards.units", {
              values: {
                occupied: data.occupancy.occupied,
                total: data.occupancy.total,
              },
            })}
            icon={Home}
            iconColor="primary"
            trend={{
              value: `${occupancyChange.value}`,
              isPositive: occupancyChange.isPositive,
              icon: occupancyChange.isPositive ? TrendingUp : TrendingDown,
            }}
          />

          <AnalyticsCard
            title={t("analytics.cards.collectionRate")}
            value={formatPercentage(data.financial.collectionRate)}
            description={t("analytics.cards.payments", {
              values: {
                completed: data.financial.completedPayments,
                total: data.financial.totalPayments,
              },
            })}
            icon={Target}
            iconColor="info"
          />

          <AnalyticsCard
            title={t("analytics.cards.maintenanceCost")}
            value={formatAmount(totalMaintenanceCost)}
            description={t("analytics.cards.requests", {
              values: { count: totalMaintenanceCount },
            })}
            icon={Wrench}
            iconColor="warning"
            trend={{
              value: `${maintenanceChange.value}`,
              isPositive: !maintenanceChange.isPositive,
              icon: !maintenanceChange.isPositive
                ? TrendingDown
                : TrendingUp,
            }}
          />
        </AnalyticsCardGrid>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">
            {t("analytics.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="financial">
            {t("analytics.tabs.financial")}
          </TabsTrigger>
          <TabsTrigger value="occupancy">
            {t("analytics.tabs.occupancy")}
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            {t("analytics.tabs.maintenance")}
          </TabsTrigger>
          <TabsTrigger value="performance">
            {t("analytics.tabs.performance")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  {t("analytics.overview.monthlyTrends.title")}
                </CardTitle>
                <CardDescription>
                  {t("analytics.overview.monthlyTrends.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyTrends.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    {t("analytics.charts.empty", {
                      defaultValue: "No data for this period.",
                    })}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        stroke="#8884d8"
                        name={t("analytics.charts.revenue")}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="occupancy"
                        stroke="#82ca9d"
                        name={t("analytics.charts.occupancy")}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="rounded-lg bg-success/10 p-2">
                    <PieChartIcon className="h-5 w-5 text-success" />
                  </div>
                  {t("analytics.overview.revenueBreakdown.title")}
                </CardTitle>
                <CardDescription>
                  {t("analytics.overview.revenueBreakdown.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {revenueBreakdown.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    {t("analytics.charts.revenueEmpty", {
                      defaultValue:
                        "No paid payments in this period to break down by type.",
                    })}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenueBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) =>
                          `${name} ${percentage}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="name"
                      >
                        {revenueBreakdown.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatAmount(value as number)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {t("analytics.overview.propertyPerformance.title")}
              </CardTitle>
              <CardDescription>
                {t("analytics.overview.propertyPerformance.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {propertyPerformance.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {t("analytics.charts.propertiesEmpty", {
                    defaultValue:
                      "No properties in scope, or no payments in this period.",
                  })}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={propertyPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      fill="#8884d8"
                      name={t("analytics.charts.revenue")}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="occupancy"
                      fill="#82ca9d"
                      name={t("analytics.charts.occupancyRate")}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="rounded-lg bg-success/10 p-2">
                    <DollarSign className="h-5 w-5 text-success" />
                  </div>
                  {t("analytics.financial.cashFlow.title")}
                </CardTitle>
                <CardDescription>
                  {t("analytics.financial.cashFlow.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyTrends.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    {t("analytics.charts.empty", {
                      defaultValue: "No data for this period.",
                    })}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="rounded-lg bg-info/10 p-2">
                    <Target className="h-5 w-5 text-info" />
                  </div>
                  {t("analytics.financial.collection.title")}
                </CardTitle>
                <CardDescription>
                  {t("analytics.financial.collection.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {t("analytics.financial.collection.onTime")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {paymentMix
                        ? `${paymentMix.collectedPercent}%`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {t("analytics.financial.collection.late")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {paymentMix ? `${paymentMix.otherPercent}%` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {t("analytics.financial.collection.outstanding")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {paymentMix ? `${paymentMix.pendingPercent}%` : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center pt-4">
            <Link href="/dashboard/analytics/financial">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                {t("analytics.financial.viewDetailed")}
              </Button>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="occupancy" className="space-y-4">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                {t("analytics.occupancy.trends.title")}
              </CardTitle>
              <CardDescription>
                {t("analytics.occupancy.trends.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyTrends.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {t("analytics.charts.empty", {
                    defaultValue: "No data for this period.",
                  })}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="occupancy"
                      stroke="#8884d8"
                      name={t("analytics.charts.occupancyRate")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="rounded-lg bg-warning/10 p-2">
                  <Wrench className="h-5 w-5 text-warning" />
                </div>
                {t("analytics.maintenance.analysis.title")}
              </CardTitle>
              <CardDescription>
                {t("analytics.maintenance.analysis.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceByCategory.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {t("analytics.charts.maintenanceEmpty", {
                    defaultValue: "No maintenance requests in this period.",
                  })}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={maintenanceByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="cost"
                      fill="#8884d8"
                      name={t("analytics.charts.cost")}
                    />
                    <Bar
                      dataKey="count"
                      fill="#82ca9d"
                      name={t("analytics.charts.count")}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <AnalyticsCard
              title={t("analytics.performance.roi.title")}
              value={
                portfolioYield !== null ? `${portfolioYield}%` : "—"
              }
              description={t("analytics.performance.roi.description")}
              icon={TrendingUp}
              iconColor="success"
            />

            <AnalyticsCard
              title={t("analytics.performance.retention.title")}
              value={
                data ? formatPercentage(data.occupancy.rate) : "—"
              }
              description={t("analytics.performance.retention.description")}
              icon={Users}
              iconColor="info"
            />

            <AnalyticsCard
              title={t("analytics.performance.market.title")}
              value={
                data ? formatPercentage(data.financial.collectionRate) : "—"
              }
              description={t("analytics.performance.market.description")}
              icon={Target}
              iconColor="primary"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
