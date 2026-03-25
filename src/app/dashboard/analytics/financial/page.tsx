"use client";

import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  BarChart3,
  RefreshCw,
  Calendar,
  Target,
  AlertCircle,
  Building2,
  Wrench,
  Store,
  FileText,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  RevenueTrendsChart,
  ExpenseBreakdownChart,
  CashFlowChart,
  PropertyPerformanceChart,
  ProfitLossChart,
} from "@/components/analytics/financial-charts";
import { CheckCircle, AlertTriangle } from "lucide-react";
import {
  AnalyticsReportResponse,
  ProfitLossReportResponse,
  CashFlowReportResponse,
  PropertyPerformanceReportResponse,
  ExpenseAnalysisReportResponse,
  FinancialAction,
  FinancialActionInput,
  FinancialActionStatus,
  FinancialActionReportType,
} from "@/types/financial-analytics";
import {
  formatCurrency as formatCurrencyValue,
  formatPercentage as formatPercentageValue,
} from "@/lib/formatters";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useRealTimePayments } from "@/hooks/useRealTimePayments";

// Helpers

const getStartDate = (range: string): Date => {
  const now = new Date();
  switch (range) {
    case "last-30-days":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "last-90-days":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "last-6-months":
      return new Date(now.getFullYear(), now.getMonth() - 6, 1);
    case "last-12-months":
      return new Date(now.getFullYear() - 1, now.getMonth(), 1);
    case "year-to-date":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getFullYear() - 1, now.getMonth(), 1);
  }
};

const formatCurrency = (amount?: number | null) =>
  formatCurrencyValue(amount ?? 0);

const formatPercentage = (value?: number | null) =>
  formatPercentageValue(value ?? 0);

const REPORT_TYPE_MAP: Record<string, FinancialActionReportType> = {
  overview: "analytics",
  "profit-loss": "profit-loss",
  "cash-flow": "cash-flow",
  properties: "property-performance",
  expenses: "expense-analysis",
};

// Component

export default function FinancialAnalyticsPage() {
  const { data: session } = useSession();
  const { t } = useLocalizationContext();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("last-12-months");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [propertyOptions, setPropertyOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const dataLoadedRef = useRef(false);
  const [financialActions, setFinancialActions] = useState<FinancialAction[]>(
    []
  );
  const [actionsLoading, setActionsLoading] = useState(true);
  const [actionsError, setActionsError] = useState<string | null>(null);

  // Data states
  const [analyticsData, setAnalyticsData] =
    useState<AnalyticsReportResponse | null>(null);
  const [profitLossData, setProfitLossData] =
    useState<ProfitLossReportResponse | null>(null);
  const [cashFlowData, setCashFlowData] =
    useState<CashFlowReportResponse | null>(null);
  const [propertyPerformanceData, setPropertyPerformanceData] =
    useState<PropertyPerformanceReportResponse | null>(null);
  const [expenseAnalysisData, setExpenseAnalysisData] =
    useState<ExpenseAnalysisReportResponse | null>(null);

  // Intelligence tabs
  const [vendorSpendData, setVendorSpendData] = useState<{
    totalSpend: number;
    jobCount: number;
    byCategory: { category: string; totalSpend: number; jobCount: number; avgCost: number }[];
    byVendor: { vendorId?: string; vendorName: string; totalSpend: number; jobCount: number; avgRating: number | null }[];
    byMonth: { month: string; year: number; totalSpend: number; jobCount: number }[];
  } | null>(null);
  const [vendorSpendLoading, setVendorSpendLoading] = useState(false);

  const [marketRentData, setMarketRentData] = useState<{
    alerts: { leaseId: string; propertyName: string; tenantName: string; currentRent: number; marketRent: number; gapPercent: number; endDate: string; daysUntilExpiry: number }[];
    marketRent: number;
    alertCount: number;
    expiringCount: number;
  } | null>(null);
  const [marketRentLoading, setMarketRentLoading] = useState(false);

  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const [taxExportData, setTaxExportData] = useState<{
    year: number;
    income: { monthName: string; propertyName: string; category: string; amount: number; count: number }[];
    expenses: { monthName: string; propertyName: string; category: string; amount: number; count: number }[];
    summary: { totalIncome: number; totalExpenses: number; netIncome: number };
  } | null>(null);
  const [taxExportLoading, setTaxExportLoading] = useState(false);

  const [utilityAnomalies, setUtilityAnomalies] = useState<{
    anomalies: { propertyId: string; propertyName: string; category: string; currentMonthCost: number; priorMonthCost: number; spikePercent: number; severity: "warning" | "critical" }[];
    summary: { total: number; critical: number; warning: number; byCategoryCount: Record<string, number> };
    comparisonPeriod?: { current: string; prior: string; thresholdPct: number };
    detectedAt: string;
  } | null>(null);
  const [utilityAnomaliesLoading, setUtilityAnomaliesLoading] = useState(false);

  const currentDateRange = useMemo(() => {
    return {
      start: getStartDate(dateRange),
      end: new Date(),
    };
  }, [dateRange]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastLoadedAt) return null;
    return lastLoadedAt.toLocaleString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    });
  }, [lastLoadedAt]);

  const selectedPropertyLabel = useMemo(() => {
    if (selectedProperty === "all") {
      return t("analytics.financial.property.all");
    }

    const match = propertyOptions.find(
      (option) => option.id === selectedProperty
    );
    return match?.name || t("analytics.financial.property.unavailable");
  }, [propertyOptions, selectedProperty, t]);

  const currentReportType = useMemo(
    () => REPORT_TYPE_MAP[activeTab] ?? "analytics",
    [activeTab]
  );

  const fetchFinancialReport = useCallback(
    async <T,>(reportType: string, start: Date, end: Date): Promise<T> => {
      const params = new URLSearchParams({
        type: reportType,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      if (selectedProperty !== "all") {
        params.set("propertyId", selectedProperty);
      }

      const response = await fetch(
        `/api/reports/financial?${params.toString()}`,
        {
          cache: "no-store",
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || `Failed to fetch ${reportType} report`
        );
      }

      return result.data as T;
    },
    [selectedProperty]
  );

  const loadAllReports = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const start = getStartDate(dateRange);
    const end = new Date();

    const [
      analyticsResult,
      profitLossResult,
      cashFlowResult,
      propertyPerformanceResult,
      expenseAnalysisResult,
    ] = await Promise.allSettled([
      fetchFinancialReport<AnalyticsReportResponse>("analytics", start, end),
      fetchFinancialReport<ProfitLossReportResponse>("profit-loss", start, end),
      fetchFinancialReport<CashFlowReportResponse>("cash-flow", start, end),
      fetchFinancialReport<PropertyPerformanceReportResponse>(
        "property-performance",
        start,
        end
      ),
      fetchFinancialReport<ExpenseAnalysisReportResponse>(
        "expense-analysis",
        start,
        end
      ),
    ]);

    let failedReports = 0;

    if (analyticsResult.status === "fulfilled") {
      setAnalyticsData(analyticsResult.value);
    } else {
      failedReports += 1;
      if (!dataLoadedRef.current) {
        setAnalyticsData(null);
      }
    }

    if (profitLossResult.status === "fulfilled") {
      setProfitLossData(profitLossResult.value);
    } else {
      failedReports += 1;
      if (!dataLoadedRef.current) {
        setProfitLossData(null);
      }
    }

    if (cashFlowResult.status === "fulfilled") {
      setCashFlowData(cashFlowResult.value);
    } else {
      failedReports += 1;
      if (!dataLoadedRef.current) {
        setCashFlowData(null);
      }
    }

    if (propertyPerformanceResult.status === "fulfilled") {
      setPropertyPerformanceData(propertyPerformanceResult.value);
    } else {
      failedReports += 1;
      if (!dataLoadedRef.current) {
        setPropertyPerformanceData(null);
      }
    }

    if (expenseAnalysisResult.status === "fulfilled") {
      setExpenseAnalysisData(expenseAnalysisResult.value);
    } else {
      failedReports += 1;
      if (!dataLoadedRef.current) {
        setExpenseAnalysisData(null);
      }
    }

    if (failedReports === 5) {
      setLoadError(t("analytics.toasts.loadError"));
      toast.error(t("analytics.toasts.loadError"));
    } else if (failedReports > 0) {
      setLoadError(t("analytics.toasts.partialLoad"));
      toast.warning(t("analytics.toasts.partialLoad"));
    } else {
      setLoadError(null);
    }

    dataLoadedRef.current = true;
    setLastLoadedAt(new Date());
    setIsLoading(false);
  }, [dateRange, fetchFinancialReport]);

  const fetchPropertyOptions = useCallback(async () => {
    try {
      setPropertiesLoading(true);
      const response = await fetch(
        "/api/properties?limit=100&sortBy=name&sortOrder=asc",
        { cache: "no-store" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to load properties");
      }

      type ApiProperty = {
        _id?: string;
        id?: string;
        name?: string;
      };

      const rawProperties: ApiProperty[] = Array.isArray(result.data)
        ? (result.data as ApiProperty[])
        : [];

      const options = rawProperties
        .map((property) => ({
          id: property._id ?? property.id ?? "",
          name: property.name || "Untitled Property",
        }))
        .filter((property) => property.id !== "");

      setPropertyOptions(options);

      setSelectedProperty((current) => {
        if (
          current !== "all" &&
          !options.some((option) => option.id === current)
        ) {
          return "all";
        }
        return current;
      });
    } catch (error) {
      toast.warning(t("analytics.toasts.propertiesError"));
    } finally {
      setPropertiesLoading(false);
    }
  }, [t]);

  const loadFinancialActions = useCallback(async () => {
    if (!session) return;

    try {
      setActionsLoading(true);
      setActionsError(null);

      const params = new URLSearchParams({
        limit: "50",
        reportType: currentReportType,
      });

      if (selectedProperty !== "all") {
        params.set("propertyId", selectedProperty);
      }

      const response = await fetch(
        `/api/analytics/financial/actions?${params.toString()}`,
        { cache: "no-store" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to load financial actions");
      }

      const actionData = Array.isArray(result.data)
        ? (result.data as FinancialAction[])
        : [];

      setFinancialActions(actionData);
    } catch (error) {
      setActionsError("Unable to load financial action items");
    } finally {
      setActionsLoading(false);
    }
  }, [currentReportType, selectedProperty, session]);

  const createFinancialAction = useCallback(
    async (payload: FinancialActionInput): Promise<boolean> => {
      try {
        const body = { ...payload };

        if (!body.reportType) {
          body.reportType = currentReportType;
        }

        const derivedPropertyId =
          body.propertyId && body.propertyId !== "all"
            ? body.propertyId
            : selectedProperty !== "all"
            ? selectedProperty
            : undefined;

        const response = await fetch("/api/analytics/financial/actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...body,
            propertyId: derivedPropertyId,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to create action");
        }

        const created = result.data as FinancialAction;
        setFinancialActions((prev) => [created, ...prev]);
        toast.success(t("analytics.toasts.actionCreated"));
        return true;
      } catch (error) {
        toast.error(t("analytics.toasts.actionCreateError"));
        return false;
      }
    },
    [currentReportType, selectedProperty, t]
  );

  const updateFinancialAction = useCallback(
    async (
      id: string,
      updates: Partial<FinancialActionInput> & {
        status?: FinancialActionStatus;
      }
    ): Promise<boolean> => {
      try {
        const response = await fetch(`/api/analytics/financial/actions/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Failed to update action");
        }

        const updated = result.data as FinancialAction;
        setFinancialActions((prev) =>
          prev.map((action) => (action._id === id ? updated : action))
        );
        toast.success(t("analytics.toasts.actionUpdated"));
        return true;
      } catch (error) {
        toast.error(t("analytics.toasts.actionUpdateError"));
        return false;
      }
    },
    [t]
  );

  // const deleteFinancialAction = useCallback(
  //   async (id: string): Promise<boolean> => {
  //     try {
  //       const response = await fetch(`/api/analytics/financial/actions/${id}`, {
  //         method: "DELETE",
  //       });
  //       const result = await response.json();
  //       if (!response.ok) {
  //         throw new Error(result.message || "Failed to delete action");
  //       }

  //       setFinancialActions((prev) =>
  //         prev.filter((action) => action._id !== id)
  //       );
  //       toast.success("Action item removed");
  //       return true;
  //     } catch (error) {
  //       toast.error("Unable to remove action item");
  //       return false;
  //     }
  //   },
  //   []
  // );

  const fetchVendorSpend = useCallback(async () => {
    try {
      setVendorSpendLoading(true);
      const params = new URLSearchParams({
        startDate: getStartDate(dateRange).toISOString(),
        endDate: new Date().toISOString(),
      });
      if (selectedProperty !== "all") params.set("propertyId", selectedProperty);
      const res = await fetch(`/api/analytics/vendor-spend?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setVendorSpendData(json.data);
    } catch { /* silent */ } finally { setVendorSpendLoading(false); }
  }, [dateRange, selectedProperty]);

  const fetchMarketRent = useCallback(async () => {
    try {
      setMarketRentLoading(true);
      const params = new URLSearchParams();
      if (selectedProperty !== "all") params.set("propertyId", selectedProperty);
      const res = await fetch(`/api/analytics/market-rent-gap?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setMarketRentData(json.data);
    } catch { /* silent */ } finally { setMarketRentLoading(false); }
  }, [selectedProperty]);

  const fetchTaxExport = useCallback(async () => {
    try {
      setTaxExportLoading(true);
      const params = new URLSearchParams({ year: String(taxYear), format: "json" });
      if (selectedProperty !== "all") params.set("propertyId", selectedProperty);
      const res = await fetch(`/api/analytics/tax-export?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setTaxExportData(json.data);
    } catch { /* silent */ } finally { setTaxExportLoading(false); }
  }, [taxYear, selectedProperty]);

  const downloadTaxCsv = useCallback(async () => {
    const params = new URLSearchParams({ year: String(taxYear), format: "csv" });
    if (selectedProperty !== "all") params.set("propertyId", selectedProperty);
    window.open(`/api/analytics/tax-export?${params.toString()}`, "_blank");
  }, [taxYear, selectedProperty]);

  const downloadTaxPdf = useCallback(async () => {
    const params = new URLSearchParams({ year: String(taxYear), format: "pdf" });
    if (selectedProperty !== "all") params.set("propertyId", selectedProperty);
    window.open(`/api/analytics/tax-export?${params.toString()}`, "_blank");
  }, [taxYear, selectedProperty]);

  const fetchUtilityAnomalies = useCallback(async () => {
    try {
      setUtilityAnomaliesLoading(true);
      const params = new URLSearchParams();
      if (selectedProperty !== "all") params.set("propertyId", selectedProperty);
      const res = await fetch(`/api/analytics/utility-anomalies?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setUtilityAnomalies(json.data);
    } catch { /* silent */ } finally { setUtilityAnomaliesLoading(false); }
  }, [selectedProperty]);

  const { lastUpdate } = useRealTimePayments({
    propertyId: selectedProperty !== "all" ? selectedProperty : undefined,
    enabled: true,
  });
  const lastUpdateProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchPropertyOptions();
  }, [session, fetchPropertyOptions]);

  useEffect(() => {
    if (!session) return;
    loadAllReports();
  }, [session, loadAllReports]);

  useEffect(() => {
    if (!session) return;
    loadFinancialActions();
  }, [session, loadFinancialActions]);

  useEffect(() => {
    if (!session) return;
    if (!lastUpdate) return;
    if (!lastUpdate.type.startsWith("payment_")) return;
    if (isLoading) return;

    const id = `${lastUpdate.type}-${lastUpdate.timestamp}`;
    if (lastUpdateProcessedRef.current === id) return;
    lastUpdateProcessedRef.current = id;

    loadAllReports();
    loadFinancialActions();
  }, [session, lastUpdate, loadAllReports, loadFinancialActions]);

  useEffect(() => {
    if (!session) return;
    if (activeTab === "vendor-spend") fetchVendorSpend();
    if (activeTab === "market-rent") fetchMarketRent();
    if (activeTab === "tax-export") fetchTaxExport();
    if (activeTab === "utility-anomalies") fetchUtilityAnomalies();
  }, [session, activeTab, fetchVendorSpend, fetchMarketRent, fetchTaxExport, fetchUtilityAnomalies]);

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              {t("analytics.financial.page.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("analytics.financial.page.subtitle", {
                values: { property: selectedPropertyLabel },
              })}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="relative w-[180px] pl-9">
                <Calendar className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={t("analytics.filters.selectRange")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-30-days">
                  {t("analytics.financial.dateRange.last30Days")}
                </SelectItem>
                <SelectItem value="last-90-days">
                  {t("analytics.financial.dateRange.last90Days")}
                </SelectItem>
                <SelectItem value="last-6-months">
                  {t("analytics.financial.dateRange.last6Months")}
                </SelectItem>
                <SelectItem value="last-12-months">
                  {t("analytics.financial.dateRange.last12Months")}
                </SelectItem>
                <SelectItem value="year-to-date">
                  {t("analytics.financial.dateRange.yearToDate")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedProperty}
              onValueChange={setSelectedProperty}
              disabled={propertiesLoading}
            >
              <SelectTrigger className="relative w-[220px] pl-9">
                <Building2 className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <SelectValue
                  placeholder={
                    propertiesLoading
                      ? t("analytics.financial.property.loading")
                      : t("analytics.financial.property.all")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("analytics.financial.property.all")}
                </SelectItem>
                {propertyOptions.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              {lastUpdatedLabel && (
                <span className="hidden text-xs text-muted-foreground xl:inline-flex">
                  {t("analytics.financial.lastUpdated", {
                    values: { time: lastUpdatedLabel },
                  })}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!isLoading) {
                    loadAllReports();
                  }
                }}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </div>

        {loadError && (
          <Alert
            variant={
              loadError.toLowerCase().includes("unable")
                ? "destructive"
                : undefined
            }
          >
            <AlertTitle>{t("analytics.financial.notice.title")}</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : analyticsData ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("analytics.financial.kpi.totalRevenue")}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analyticsData.kpis.totalRevenue || 0)}
                </div>
                <p className="text-xs text-muted-foreground flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                  {formatPercentage(
                    analyticsData.kpis.collectionRate || 0
                  )}{" "}
                  {t("analytics.financial.kpi.collectionRate")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("analytics.financial.kpi.totalPayments")}
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.kpis.totalPayments || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("analytics.financial.kpi.completed", {
                    values: {
                      count: analyticsData.kpis.completedPayments || 0,
                    },
                  })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("analytics.financial.kpi.expectedRevenue")}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analyticsData.kpis.totalExpected || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("analytics.financial.kpi.totalExpected")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("analytics.financial.kpi.overdueAmount")}
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(analyticsData.kpis.overdueAmount || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("analytics.financial.kpi.requiresAttention")}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {t("analytics.financial.noData.title")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("analytics.financial.noData.hint")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">
              {t("analytics.financial.tabs.overview")}
            </TabsTrigger>
            <TabsTrigger value="profit-loss">
              {t("analytics.financial.tabs.profitLoss")}
            </TabsTrigger>
            <TabsTrigger value="cash-flow">
              {t("analytics.financial.tabs.cashFlow")}
            </TabsTrigger>
            <TabsTrigger value="properties">
              {t("analytics.financial.tabs.properties")}
            </TabsTrigger>
            <TabsTrigger value="expenses">
              {t("analytics.financial.tabs.expenses")}
            </TabsTrigger>
            <TabsTrigger value="vendor-spend" className="flex items-center gap-1">
              <Store className="h-3 w-3" />
              Vendor Spend
            </TabsTrigger>
            <TabsTrigger value="market-rent" className="flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              Rent Gaps
            </TabsTrigger>
            <TabsTrigger value="tax-export" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Tax Export
            </TabsTrigger>
            <TabsTrigger value="utility-anomalies" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Utility Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {analyticsData?.revenueTrends ? (
                  <RevenueTrendsChart
                    data={analyticsData.revenueTrends}
                    height={300}
                  />
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("analytics.financial.revenueTrends.title")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="text-center">
                          <p className="text-muted-foreground">
                            {t("analytics.financial.revenueTrends.noData")}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {t("analytics.financial.revenueTrends.noDataHint")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {analyticsData?.paymentMethodBreakdown ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("analytics.financial.paymentMethods.title")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analyticsData.paymentMethodBreakdown.map(
                          (method, index) => (
                            <div
                              key={method._id || index}
                              className="flex items-center justify-between"
                            >
                              <div>
                                <p className="font-medium">
                                  {method._id ||
                                    t(
                                      "analytics.financial.paymentMethods.unknownMethod"
                                    )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {t(
                                    "analytics.financial.paymentMethods.transactions",
                                    { values: { count: method.count || 0 } }
                                  )}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {formatCurrency(method.totalAmount || 0)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {t("analytics.financial.paymentMethods.avg", {
                                    values: {
                                      amount: formatCurrency(
                                        method.averageAmount || 0
                                      ),
                                    },
                                  })}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {t("analytics.financial.paymentMethods.title")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="text-center">
                          <p className="text-muted-foreground">
                            {t("analytics.financial.paymentMethods.noData")}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            {t("analytics.financial.paymentMethods.noDataHint")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profit-loss" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : profitLossData ? (
              <ProfitLossChart data={profitLossData.monthlyPL} height={400} />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground py-8">
                    {t("analytics.financial.profitLoss.noData")}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="cash-flow" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : cashFlowData ? (
              <CashFlowChart
                inflows={cashFlowData.cashInflows}
                outflows={cashFlowData.cashOutflows}
                height={400}
              />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground py-8">
                    {t("analytics.financial.cashFlow.noData")}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : propertyPerformanceData ? (
              <PropertyPerformanceChart
                data={propertyPerformanceData.propertyPerformance}
                height={400}
              />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground py-8">
                    {t("analytics.financial.properties.noData")}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : expenseAnalysisData ? (
              <ExpenseBreakdownChart
                data={expenseAnalysisData.expenseCategories}
                height={400}
              />
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground py-8">
                    {t("analytics.financial.expenses.noData")}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Vendor Spend Tab ─────────────────────────────────────────── */}
          <TabsContent value="vendor-spend" className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={fetchVendorSpend} disabled={vendorSpendLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${vendorSpendLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {vendorSpendLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                  <Card key={i}><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
                ))}
              </div>
            ) : vendorSpendData ? (
              <>
                {/* KPI row */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Vendor Spend</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(vendorSpendData.totalSpend)}</div>
                      <p className="text-xs text-muted-foreground">{vendorSpendData.jobCount} completed job{vendorSpendData.jobCount !== 1 ? "s" : ""}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Spend Per Unit</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency((vendorSpendData as { spendPerUnit?: number }).spendPerUnit ?? (vendorSpendData.jobCount > 0 ? vendorSpendData.totalSpend / vendorSpendData.jobCount : 0))}
                      </div>
                      <p className="text-xs text-muted-foreground">YTD per unit</p>
                    </CardContent>
                  </Card>
                  {(vendorSpendData as { benchmark?: { proRatedPerUnit?: number; vsIndustryPct?: number | null; status?: string } }).benchmark && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Industry Benchmark</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency((vendorSpendData as { benchmark?: { proRatedPerUnit?: number } }).benchmark!.proRatedPerUnit ?? 0)}</div>
                        <p className={`text-xs font-medium ${
                          (vendorSpendData as { benchmark?: { status?: string } }).benchmark!.status === "above-benchmark" ? "text-red-600"
                          : (vendorSpendData as { benchmark?: { status?: string } }).benchmark!.status === "below-benchmark" ? "text-green-600"
                          : "text-muted-foreground"
                        }`}>
                          {(() => {
                            const b = (vendorSpendData as { benchmark?: { vsIndustryPct?: number | null; status?: string } }).benchmark!;
                            if (b.status === "above-benchmark") return `${b.vsIndustryPct}% above BOMA avg`;
                            if (b.status === "below-benchmark") return `${Math.abs(b.vsIndustryPct ?? 0)}% below BOMA avg`;
                            return "On track with BOMA avg";
                          })()}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Categories</CardTitle>
                      <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{vendorSpendData.byCategory.length}</div>
                      <p className="text-xs text-muted-foreground">distinct spend categories</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly trend chart */}
                {vendorSpendData.byMonth.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Vendor Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={vendorSpendData.byMonth}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
                          <Tooltip formatter={(v: number) => [formatCurrency(v), "Spend"]} />
                          <Bar dataKey="totalSpend" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  {/* By Category */}
                  <Card>
                    <CardHeader><CardTitle>Spend by Category</CardTitle></CardHeader>
                    <CardContent>
                      {vendorSpendData.byCategory.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">No vendor spend data yet</p>
                      ) : (
                        <div className="space-y-3">
                          {vendorSpendData.byCategory.map((cat) => {
                            const max = vendorSpendData.byCategory[0].totalSpend;
                            const pct = max > 0 ? (cat.totalSpend / max) * 100 : 0;
                            return (
                              <div key={cat.category}>
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm">{cat.category}</span>
                                  <div className="flex gap-3 text-xs text-muted-foreground">
                                    <span>{cat.jobCount} jobs</span>
                                    <span className="font-medium text-foreground">{formatCurrency(cat.totalSpend)}</span>
                                  </div>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top Vendors */}
                  <Card>
                    <CardHeader><CardTitle>Top Vendors by Spend</CardTitle></CardHeader>
                    <CardContent>
                      {vendorSpendData.byVendor.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">No vendor data yet</p>
                      ) : (
                        <div className="space-y-3">
                          {vendorSpendData.byVendor.map((v, i) => (
                            <div key={v.vendorId ?? i} className="flex items-center justify-between py-2 border-b last:border-0">
                              <div>
                                <p className="text-sm font-medium">{v.vendorName}</p>
                                <p className="text-xs text-muted-foreground">{v.jobCount} job{v.jobCount !== 1 ? "s" : ""}{v.avgRating ? ` · ★${v.avgRating}` : ""}</p>
                              </div>
                              <span className="text-sm font-semibold">{formatCurrency(v.totalSpend)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card><CardContent className="p-6"><p className="text-center text-muted-foreground py-8">No vendor spend data for the selected period</p></CardContent></Card>
            )}
          </TabsContent>

          {/* ── Market Rent Gap Tab ──────────────────────────────────────── */}
          <TabsContent value="market-rent" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Market Rent Gap Alerts</h3>
                <p className="text-sm text-muted-foreground">Active leases expiring in 60 days priced 10%+ below market rate. Falls back to portfolio average if no per-property override is set.</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchMarketRent} disabled={marketRentLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${marketRentLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3 flex items-start gap-2 text-sm">
              <span className="text-blue-600 mt-0.5">ℹ</span>
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Configure per-property market rent:</strong> Go to <a href="/dashboard/analytics/capex" className="underline">CapEx Planner</a> → Building System Ages panel → enter a market rent override for each property. This is used to compare actual lease rents against a known market benchmark.
              </p>
            </div>

            {marketRentLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : marketRentData ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Market Rate</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(marketRentData.marketRent)}</div>
                      <p className="text-xs text-muted-foreground">Portfolio average rent/unit</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Leases Expiring</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{marketRentData.expiringCount}</div>
                      <p className="text-xs text-muted-foreground">within 60 days</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Below-Market Alerts</CardTitle>
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${marketRentData.alertCount > 0 ? "text-orange-600" : "text-green-600"}`}>
                        {marketRentData.alertCount}
                      </div>
                      <p className="text-xs text-muted-foreground">priced 10%+ below market</p>
                    </CardContent>
                  </Card>
                </div>

                {marketRentData.alerts.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="py-8">
                        <p className="text-green-600 font-medium">No rent gap alerts</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {marketRentData.expiringCount === 0
                            ? "No leases expire within 60 days."
                            : "All expiring leases are priced within 10% of market rate."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader><CardTitle>Leases Requiring Attention</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {marketRentData.alerts.map((alert) => (
                          <div key={alert.leaseId} className="flex items-center justify-between p-3 border rounded-lg border-orange-200 bg-orange-50 dark:bg-orange-950/10 dark:border-orange-800">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">{alert.tenantName}</p>
                                <Badge variant="outline" className="text-xs text-orange-700 border-orange-300">
                                  {alert.gapPercent.toFixed(1)}% below market
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{alert.propertyName} · Expires in {alert.daysUntilExpiry} day{alert.daysUntilExpiry !== 1 ? "s" : ""}</p>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-sm font-semibold">{formatCurrency(alert.currentRent)}</p>
                              <p className="text-xs text-muted-foreground">vs {formatCurrency(alert.marketRent)} market</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card><CardContent className="p-6"><p className="text-center text-muted-foreground py-8">Click Refresh to load rent gap analysis</p></CardContent></Card>
            )}
          </TabsContent>

          {/* ── Tax Export Tab ───────────────────────────────────────────── */}
          <TabsContent value="tax-export" className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-semibold">Tax Preparation Export</h3>
                <p className="text-sm text-muted-foreground">Year-end income and expense summary for tax filing</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(taxYear)} onValueChange={(v) => setTaxYear(parseInt(v, 10))}>
                  <SelectTrigger className="w-[120px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((yr) => (
                      <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={fetchTaxExport} disabled={taxExportLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${taxExportLoading ? "animate-spin" : ""}`} />
                  Load
                </Button>
                <Button variant="default" size="sm" onClick={downloadTaxCsv}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
                <Button variant="outline" size="sm" onClick={downloadTaxPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF Report
                </Button>
              </div>
            </div>

            {taxExportLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : taxExportData ? (
              <>
                {/* Summary cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(taxExportData.summary.totalIncome)}</div>
                      <p className="text-xs text-muted-foreground">FY {taxExportData.year}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                      <Wrench className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(taxExportData.summary.totalExpenses)}</div>
                      <p className="text-xs text-muted-foreground">Maintenance &amp; vendor costs</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${taxExportData.summary.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(taxExportData.summary.netIncome)}
                      </div>
                      <p className="text-xs text-muted-foreground">Income minus expenses</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Income breakdown */}
                  <Card>
                    <CardHeader><CardTitle>Income by Category</CardTitle></CardHeader>
                    <CardContent>
                      {taxExportData.income.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">No income recorded for {taxExportData.year}</p>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {Object.entries(
                            taxExportData.income.reduce<Record<string, number>>((acc, r) => {
                              acc[r.category] = (acc[r.category] ?? 0) + r.amount;
                              return acc;
                            }, {})
                          ).sort(([, a], [, b]) => b - a).map(([cat, amt]) => (
                            <div key={cat} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span className="capitalize">{cat}</span>
                              <span className="font-medium text-green-600">{formatCurrency(amt)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Expense breakdown */}
                  <Card>
                    <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
                    <CardContent>
                      {taxExportData.expenses.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">No expenses recorded for {taxExportData.year}</p>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {Object.entries(
                            taxExportData.expenses.reduce<Record<string, number>>((acc, r) => {
                              acc[r.category] = (acc[r.category] ?? 0) + r.amount;
                              return acc;
                            }, {})
                          ).sort(([, a], [, b]) => b - a).map(([cat, amt]) => (
                            <div key={cat} className="flex justify-between text-sm py-1 border-b last:border-0">
                              <span>{cat}</span>
                              <span className="font-medium text-red-600">{formatCurrency(amt)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* IRS Schedule E Summary */}
                {Array.isArray((taxExportData as { scheduleE?: unknown[] }).scheduleE) && (taxExportData as { scheduleE?: unknown[] }).scheduleE!.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>IRS Schedule E Summary</CardTitle>
                      <p className="text-sm text-muted-foreground">Form 1040 — Supplemental Income and Loss (Part I)</p>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="text-left py-2 pr-4 font-medium">Line</th>
                              <th className="text-left py-2 pr-4 font-medium">Description</th>
                              <th className="text-right py-2 pr-4 font-medium text-green-700">Income</th>
                              <th className="text-right py-2 font-medium text-red-700">Expenses</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {((taxExportData as { scheduleE?: Array<{line:string;description:string;income:number;expenses:number}> }).scheduleE ?? []).map((s) => (
                              <tr key={s.line} className="hover:bg-muted/30">
                                <td className="py-2 pr-4 font-mono font-semibold text-muted-foreground">Line {s.line}</td>
                                <td className="py-2 pr-4">{s.description}</td>
                                <td className="py-2 pr-4 text-right font-mono">
                                  {s.income > 0 ? <span className="text-green-600">{formatCurrency(s.income)}</span> : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="py-2 text-right font-mono">
                                  {s.expenses > 0 ? <span className="text-red-600">{formatCurrency(s.expenses)}</span> : <span className="text-muted-foreground">—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        * Consult a licensed CPA to verify these classifications. Categories are mapped automatically based on type.
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <FileText className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground mb-1">CSV Export (with Schedule E)</p>
                        <p>Click <strong>Download CSV</strong> above to export all income and expense line items with IRS Schedule E classifications as a spreadsheet for your accountant or tax software.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card><CardContent className="p-6"><p className="text-center text-muted-foreground py-8">Select a year and click Load to generate your tax summary</p></CardContent></Card>
            )}
          </TabsContent>

          {/* ── Utility Anomalies Tab ───────────────────────────────────── */}
          <TabsContent value="utility-anomalies" className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-semibold">Utility Cost Anomaly Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Flags utility-related categories (Electrical, Plumbing, HVAC, Pest Control) with &gt;20% month-over-month spend increase vs. the prior month
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchUtilityAnomalies} disabled={utilityAnomaliesLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${utilityAnomaliesLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {utilityAnomaliesLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : utilityAnomalies ? (
              <>
                {/* Summary bar */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${utilityAnomalies.summary.total > 0 ? "text-orange-600" : "text-green-600"}`}>
                        {utilityAnomalies.summary.total}
                      </div>
                      <p className="text-xs text-muted-foreground">Across all properties this month</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Critical Spikes</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${utilityAnomalies.summary.critical > 0 ? "text-red-600" : "text-green-600"}`}>
                        {utilityAnomalies.summary.critical}
                      </div>
                      <p className="text-xs text-muted-foreground">≥60% above baseline</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Warnings</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${utilityAnomalies.summary.warning > 0 ? "text-yellow-600" : "text-green-600"}`}>
                        {utilityAnomalies.summary.warning}
                      </div>
                      <p className="text-xs text-muted-foreground">30–59% above baseline</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Anomaly list */}
                {utilityAnomalies.anomalies.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="text-green-600 font-semibold text-lg mb-1">All Clear</div>
                      <p className="text-sm text-muted-foreground">
                        No utility cost anomalies detected this month. All categories are within normal range.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader><CardTitle>Detected Anomalies</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {utilityAnomalies.anomalies.map((a, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              a.severity === "critical"
                                ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800"
                                : "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{a.propertyName}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 border">
                                  {a.category}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  a.severity === "critical"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                }`}>
                                  {a.severity}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Prior month: {formatCurrency(a.priorMonthCost)} → Current: {formatCurrency(a.currentMonthCost)}
                              </p>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <div className={`text-lg font-bold ${a.severity === "critical" ? "text-red-600" : "text-yellow-600"}`}>
                                +{a.spikePercent}%
                              </div>
                              <p className="text-xs text-muted-foreground">above avg</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground text-sm">Click Refresh to scan for utility cost anomalies</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>

        {/* Financial Action Items */}
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.financial.actions.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("analytics.financial.actions.subtitle", {
                values: { property: selectedPropertyLabel },
              })}
            </p>
          </CardHeader>
          <CardContent>
            {actionsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-4 animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : actionsError ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">
                  {t("analytics.financial.actions.failedTitle")}
                </h3>
                <p className="text-muted-foreground mb-4">{actionsError}</p>
                <Button onClick={loadFinancialActions} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("analytics.financial.actions.tryAgain")}
                </Button>
              </div>
            ) : financialActions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold">
                  {t("analytics.financial.actions.noItems.title")}
                </h3>
                <p className="text-muted-foreground">
                  {t("analytics.financial.actions.noItems.description")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {financialActions.slice(0, 5).map((action) => (
                  <div
                    key={action._id}
                    className="flex items-start space-x-4 p-4 border rounded"
                  >
                    <div
                      className={`h-3 w-3 rounded-full mt-2 ${
                        action.status === "completed"
                          ? "bg-green-500"
                          : action.status === "in-progress"
                          ? "bg-yellow-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{action.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            action.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : action.priority === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {action.priority === "high"
                            ? t("analytics.financial.actions.priority.high")
                            : action.priority === "medium"
                            ? t("analytics.financial.actions.priority.medium")
                            : t("analytics.financial.actions.priority.low")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {action.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {financialActions.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={loadFinancialActions}
                  >
                    {t("analytics.financial.actions.viewAll", {
                      values: { count: financialActions.length },
                    })}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
