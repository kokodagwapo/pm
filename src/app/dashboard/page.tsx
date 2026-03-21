"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AnalyticsCard,
  AnalyticsCardGrid,
} from "@/components/analytics/AnalyticsCard";
import { ResponsiveLayout } from "@/components/layout/responsive-layout";
import { DashboardSkeleton } from "@/components/ui/skeleton-layouts";
import { cn } from "@/lib/utils";
import { DashboardAlert, DashboardOverviewResponse } from "@/types/dashboard";
import {
  Building2,
  Home,
  Users,
  DollarSign,
  Wrench,
  AlertTriangle,
  Calendar,
  CreditCard,
  FileText,
  Activity,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  ChevronRight,
  UserCheck,
  ClipboardList,
} from "lucide-react";
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
import { UserRole } from "@/types";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";

/** Must be module-level — calling `dynamic()` inside render breaks React (blank / remount loop). */
const TenantDashboard = dynamic(
  () => import("@/components/tenant/TenantDashboard"),
  {
    ssr: false,
    loading: () => (
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between" data-slot="page-header">
            <div>
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ResponsiveLayout>
    ),
  }
);

const getActivityIcon = (type: string) => {
  switch (type) {
    case "payment":
      return DollarSign;
    case "maintenance":
      return Wrench;
    case "lease":
      return FileText;
    case "event":
      return Calendar;
    case "application":
      return UserCheck;
    default:
      return Activity;
  }
};

const getActivityColor = (type: string, status?: string) => {
  if (status === "completed") return "text-emerald-200";
  if (status === "pending") return "text-amber-200";
  if (status === "sent") return "text-sky-200";
  if (status === "overdue" || status === "late") return "text-rose-200";

  switch (type) {
    case "payment":
      return "text-emerald-200";
    case "maintenance":
      return "text-amber-200";
    case "lease":
      return "text-cyan-200";
    case "event":
      return "text-violet-200";
    case "application":
      return "text-sky-200";
    default:
      return "text-white";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "text-rose-200";
    case "urgent":
      return "text-rose-200";
    case "medium":
      return "text-amber-200";
    case "low":
      return "text-emerald-200";
    default:
      return "text-white";
  }
};

/** Alert row — high contrast on video (immersive) or white shell (light) */
const getAlertStyles = (type: string, isLight: boolean) => {
  switch (type) {
    case "payment":
      return {
        iconColor: isLight ? "text-amber-600" : "text-amber-200",
        titleColor: isLight ? "text-slate-900" : "text-white",
        bodyColor: isLight ? "text-slate-600" : "text-white",
      };
    case "maintenance":
      return {
        iconColor: isLight ? "text-rose-600" : "text-rose-200",
        titleColor: isLight ? "text-slate-900" : "text-white",
        bodyColor: isLight ? "text-slate-600" : "text-white",
      };
    case "lease":
      return {
        iconColor: isLight ? "text-sky-600" : "text-cyan-200",
        titleColor: isLight ? "text-slate-900" : "text-white",
        bodyColor: isLight ? "text-slate-600" : "text-white",
      };
    default:
      return {
        iconColor: isLight ? "text-sky-600" : "text-sky-200",
        titleColor: isLight ? "text-slate-900" : "text-white",
        bodyColor: isLight ? "text-slate-600" : "text-white",
      };
  }
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] =
    useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = session?.user;
  const userRole = user?.role;
  const isTenant = userRole === UserRole.TENANT;
  const isDashboardAuthorized =
    userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;
  const dashAppearance = useOptionalDashboardAppearance();
  const isLight = dashAppearance?.isLight ?? false;

  const loadDashboardData = useCallback(
    async ({ isRefresh = false }: { isRefresh?: boolean } = {}) => {
      if (!isDashboardAuthorized) {
        setError(null);
        setDashboardData(null);
        if (isRefresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
        return;
      }

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch("/api/dashboard/overview", {
          signal: controller.signal,
          headers: {
            "Cache-Control": isRefresh ? "no-cache" : "max-age=300",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          throw new Error(
            `Dashboard load failed: ${response.status} ${errorText}`
          );
        }

        const payload = await response.json();
        const data = (payload?.data ?? payload) as DashboardOverviewResponse;

        if (!data?.overview) {
          throw new Error("Invalid dashboard response format");
        }

        setDashboardData(data);
      } catch (err) {
        // Ignore errors from aborted requests
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard overview"
        );
      } finally {
        if (isRefresh) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [isDashboardAuthorized]
  );

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    if (!isDashboardAuthorized) {
      setIsLoading(false);
      return;
    }

    loadDashboardData();
  }, [status, isDashboardAuthorized, loadDashboardData]);

  const { t, formatCurrency, formatPercentage, formatDate } =
    useLocalizationContext();

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greeting.morning");
    if (hour < 17) return t("dashboard.greeting.afternoon");
    return t("dashboard.greeting.evening");
  };

  const formatTimeAgo = (input?: Date | string | null) => {
    if (!input) {
      return t("dashboard.time.justNow");
    }

    const date = typeof input === "string" ? new Date(input) : input;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return t("dashboard.time.justNow");
    }

    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return t("dashboard.time.minutesAgo", {
        values: { count: diffInMinutes },
      });
    }

    if (diffInMinutes < 1440) {
      return t("dashboard.time.hoursAgo", {
        values: { count: Math.floor(diffInMinutes / 60) },
      });
    }

    return t("dashboard.time.daysAgo", {
      values: { count: Math.floor(diffInMinutes / 1440) },
    });
  };

  const getPriorityLabel = (priority: string) => {
    if (!priority) return "";
    return t(`dashboard.priority.${priority}`, {
      defaultValue: priority,
    });
  };

  const handleRefresh = useCallback(() => {
    loadDashboardData({ isRefresh: true });
  }, [loadDashboardData]);

  const handleExport = useCallback(async () => {
    try {
      setIsRefreshing(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for export

      const response = await fetch("/api/dashboard/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          format: "json",
          includeDetails: false,
          dateRange: {
            start: new Date(new Date().getFullYear(), 0, 1).toISOString(),
            end: new Date().toISOString(),
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Export failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      if (!result.data) {
        throw new Error("Invalid export data received");
      }

      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dashboard-export-${
        new Date().toISOString().split("T")[0]
      }.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      // Ignore errors from aborted requests
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Navigation handlers for alert cards
  const handleAlertClick = useCallback(
    (alertType: string) => {
      switch (alertType) {
        case "payment":
          router.push("/dashboard/payments?filter=overdue");
          break;
        case "maintenance":
          router.push("/dashboard/maintenance?filter=urgent");
          break;
        case "lease":
          router.push("/dashboard/leases/expiring");
          break;
        case "tenant":
          router.push("/dashboard/tenants/applications");
          break;
        default:
          break;
      }
    },
    [router]
  );

  // Navigation handler for upcoming tasks
  const handleTaskClick = useCallback(
    (task: any) => {
      const taskId = task.id;

      if (taskId.startsWith("lease-")) {
        router.push("/dashboard/leases/expiring");
      } else if (taskId.startsWith("maintenance-")) {
        const maintenanceId = taskId.replace("maintenance-", "");
        router.push(`/dashboard/maintenance/${maintenanceId}`);
      } else if (task.type === "lease_renewal") {
        router.push("/dashboard/leases/expiring");
      } else if (task.type === "maintenance") {
        router.push("/dashboard/maintenance");
      } else {
        router.push("/dashboard/calendar");
      }
    },
    [router]
  );

  if (isTenant) {
    return (
      <ResponsiveLayout>
        <TenantDashboard />
      </ResponsiveLayout>
    );
  }

  if (!dashboardData && isLoading) {
    return (
      <ResponsiveLayout>
        <DashboardSkeleton />
      </ResponsiveLayout>
    );
  }

  if (!dashboardData && error) {
    return (
      <ResponsiveLayout className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("dashboard.error.unavailable.title")}</AlertTitle>
          <AlertDescription>
            {t("dashboard.error.unavailable.description", {
              values: { error },
            })}
          </AlertDescription>
        </Alert>
        <Button onClick={() => loadDashboardData()} className="w-min">
          {t("dashboard.actions.retry")}
        </Button>
      </ResponsiveLayout>
    );
  }

  /* Owner & other roles: no overview API — avoid rendering admin charts with null data */
  if (!isDashboardAuthorized) {
    return (
      <ResponsiveLayout className="space-y-4">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">
              {t("dashboard.ownerFallback.title")}
            </CardTitle>
            <CardDescription>
              {t("dashboard.ownerFallback.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/properties">
                {t("dashboard.ownerFallback.linkProperties")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/leases">
                {t("dashboard.ownerFallback.linkLeases")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/payments">
                {t("dashboard.ownerFallback.linkPayments")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </ResponsiveLayout>
    );
  }

  /* Aborted fetch / race: authorized but no payload yet */
  if (!dashboardData && !isLoading && !error) {
    return (
      <ResponsiveLayout>
        <DashboardSkeleton />
      </ResponsiveLayout>
    );
  }

  if (!dashboardData) {
    return (
      <ResponsiveLayout>
        <DashboardSkeleton />
      </ResponsiveLayout>
    );
  }

  const overview = dashboardData.overview;
  const maintenance = overview?.maintenanceRequests;
  const payments = overview?.payments;
  const revenueTrend = dashboardData?.trends?.revenue ?? [];
  const propertyDistribution = dashboardData?.propertyTypes ?? [];
  const alerts = dashboardData?.alerts ?? [];
  const recentActivities = dashboardData?.recentActivities ?? [];
  const upcomingTasks = dashboardData?.upcomingTasks ?? [];

  const vacantUnits =
    (overview?.totalUnits ?? 0) - (overview?.occupiedUnits ?? 0);
  const vacancyRate = overview?.totalUnits
    ? (vacantUnits / overview.totalUnits) * 100
    : 0;

  const latestTrendPoint =
    revenueTrend.length > 0 ? revenueTrend[revenueTrend.length - 1] : null;
  const currentRevenueValue =
    latestTrendPoint?.totalRevenue ?? overview?.monthlyRevenue ?? 0;
  const currentExpenseValue = latestTrendPoint?.totalExpenses ?? 0;

  const urgentActivityCount = recentActivities.filter(
    (activity) => activity.priority === "high" || activity.priority === "urgent"
  ).length;

  const getAlertTitleText = (alert: DashboardAlert) => {
    switch (alert.id) {
      case "overdue-payments":
        return t("dashboard.alerts.overduePayments.title", {
          defaultValue: alert.title,
        });
      case "urgent-maintenance":
        return t("dashboard.alerts.urgentMaintenance.title", {
          defaultValue: alert.title,
        });
      case "expiring-leases":
        return t("dashboard.alerts.expiringLeases.title", {
          defaultValue: alert.title,
        });
      case "pending-applications":
        return t("dashboard.alerts.pendingApplications.title", {
          defaultValue: alert.title,
        });
      default:
        return alert.title;
    }
  };

  const getAlertMessageText = (alert: DashboardAlert) => {
    const count = alert.count;
    switch (alert.id) {
      case "overdue-payments":
        return t(
          count > 0
            ? "dashboard.alerts.overduePayments.message.withCount"
            : "dashboard.alerts.overduePayments.message.zero",
          {
            defaultValue: alert.message,
            values: { count },
          }
        );
      case "urgent-maintenance":
        return t(
          count > 0
            ? "dashboard.alerts.urgentMaintenance.message.withCount"
            : "dashboard.alerts.urgentMaintenance.message.zero",
          {
            defaultValue: alert.message,
            values: { count },
          }
        );
      case "expiring-leases":
        return t(
          count > 0
            ? "dashboard.alerts.expiringLeases.message.withCount"
            : "dashboard.alerts.expiringLeases.message.zero",
          {
            defaultValue: alert.message,
            values: { count },
          }
        );
      case "pending-applications":
        return t("dashboard.alerts.pendingApplications.message.withCount", {
          defaultValue: alert.message,
          values: { count },
        });
      default:
        return alert.message;
    }
  };

  const pageHeading = isLight ? "text-slate-900" : "text-white";
  const pageBody = isLight ? "text-slate-600" : "text-white";
  const pageMuted = isLight ? "text-slate-500" : "text-white";
  const chartTickFill = isLight ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.72)";
  const chartGridStroke = isLight ? "rgba(15,23,42,0.09)" : "rgba(255,255,255,0.1)";
  const headerActionClass = isLight
    ? "h-auto shrink-0 gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
    : cn(
        "dashboard-outline-control h-auto shrink-0 gap-1.5 font-medium text-white shadow-none",
        "hover:bg-white/10 hover:text-white",
        "focus-visible:ring-0 focus-visible:ring-offset-0"
      );

  // Manager/Admin Dashboard
  return (
    <ResponsiveLayout className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className={cn("text-lg font-medium", pageHeading)}>
            {getGreeting()}, {user?.firstName}
          </h1>
          <span className={cn("text-base", pageBody)}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={headerActionClass}
          >
            <RefreshCw
              className={`h-4 w-4 shrink-0 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {t("dashboard.actions.refresh")}
          </Button>
          <Link href="/dashboard/analytics">
            <Button variant="ghost" className={headerActionClass}>
              <BarChart3 className="h-4 w-4 shrink-0" />
              {t("dashboard.actions.analytics")}
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("dashboard.error.staleData.title")}</AlertTitle>
          <AlertDescription>
            {t("dashboard.error.staleData.description", { values: { error } })}
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards — above action alerts so portfolio pulse comes first */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1 px-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <h2 className={cn("shrink-0 text-base font-medium tracking-[-0.01em]", pageHeading)}>
            {t("dashboard.sections.keyMetrics.title")}
          </h2>
          <p className={cn("max-w-prose text-sm", pageBody)}>
            {t("dashboard.sections.keyMetrics.subtitle")}
          </p>
        </div>
        <AnalyticsCardGrid>
        <AnalyticsCard
          title={t("dashboard.cards.totalProperties.title")}
          value={overview?.totalProperties ?? 0}
          description={t("dashboard.cards.totalProperties.description")}
          icon={Building2}
          iconColor="primary"
        />
        <AnalyticsCard
          title={t("dashboard.cards.occupancyRate.title")}
          value={formatPercentage(overview?.occupancyRate ?? 0)}
          description={t("dashboard.cards.occupancyRate.description", {
            values: {
              occupied: overview?.occupiedUnits ?? 0,
              total: overview?.totalUnits ?? 0,
            },
          })}
          icon={Home}
          iconColor="success"
        />
        <AnalyticsCard
          title={t("dashboard.cards.monthlyRevenue.title")}
          value={formatCurrency(overview?.monthlyRevenue ?? 0)}
          description={t("dashboard.cards.monthlyRevenue.description")}
          icon={DollarSign}
          iconColor="success"
        />
        <AnalyticsCard
          title={t("dashboard.cards.collectionRate.title")}
          value={formatPercentage(overview?.collectionRate ?? 0)}
          description={t("dashboard.cards.collectionRate.description")}
          icon={Target}
          iconColor="info"
        />
        <AnalyticsCard
          title={t("dashboard.cards.activeTenants.title")}
          value={overview?.activeTenants ?? 0}
          description={t("dashboard.cards.activeTenants.description", {
            values: { count: overview?.pendingApplications ?? 0 },
          })}
          icon={Users}
          iconColor="primary"
        />
        <AnalyticsCard
          title={t("dashboard.cards.maintenanceRequests.title")}
          value={maintenance?.open ?? 0}
          description={t("dashboard.cards.maintenanceRequests.description", {
            values: { count: maintenance?.urgent ?? 0 },
          })}
          icon={Wrench}
          iconColor="warning"
        />
        <AnalyticsCard
          title={t("dashboard.cards.vacantUnits.title")}
          value={vacantUnits}
          description={t("dashboard.cards.vacantUnits.description", {
            values: { rate: formatPercentage(vacancyRate) },
          })}
          icon={Home}
          iconColor="error"
        />
        <AnalyticsCard
          title={t("dashboard.cards.averageRent.title")}
          value={formatCurrency(overview?.averageRent ?? 0)}
          description={t("dashboard.cards.averageRent.description")}
          icon={DollarSign}
          iconColor="success"
        />
        <AnalyticsCard
          title={t("dashboard.cards.leaseRenewals.title")}
          value={overview?.expiringLeases ?? 0}
          description={t("dashboard.cards.leaseRenewals.description")}
          icon={FileText}
          iconColor="warning"
        />
        <AnalyticsCard
          title={t("dashboard.cards.recentEvents.title")}
          value={recentActivities.length}
          description={t("dashboard.cards.recentEvents.description", {
            values: { count: urgentActivityCount },
          })}
          icon={Activity}
          iconColor="info"
        />
      </AnalyticsCardGrid>
      </div>

      {/* Action Items — after key metrics */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1 px-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <h2 className={cn("shrink-0 text-base font-medium tracking-[-0.01em]", pageHeading)}>
            {t("dashboard.sections.actionCenter.title")}
          </h2>
          <p className={cn("max-w-prose text-sm", pageBody)}>
            {t("dashboard.sections.actionCenter.subtitle")}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {alerts?.slice(0, 3).map((alert) => {
            const styles = getAlertStyles(alert.type, isLight);
            return (
              <div
                key={alert.id}
                className="group dashboard-ui-surface rounded-2xl px-4 py-3.5 cursor-pointer transition-all duration-300 active:scale-[0.99]"
                onClick={() => handleAlertClick(alert.type)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${styles.iconColor}`} />
                      <h4 className={`font-medium text-base ${styles.titleColor}`}>
                        {getAlertTitleText(alert)}
                      </h4>
                    </div>
                    <p className={`text-sm leading-relaxed ${styles.bodyColor}`}>
                      {getAlertMessageText(alert)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn("text-3xl font-semibold leading-none", pageHeading)}>
                      {alert.count}
                    </span>
                    <ChevronRight className={`h-4 w-4 ${styles.iconColor} opacity-70`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Charts and Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue & Expenses Trends */}
          <div className="space-y-3">
            <h2 className={cn("px-0.5 text-base font-medium tracking-[-0.01em]", pageHeading)}>
              {t("dashboard.sections.financial.title")}
            </h2>
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
              {/* Legend */}
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
                    <linearGradient
                      id="incomeGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#6ee7b7" stopOpacity={0.45} />
                      <stop
                        offset="95%"
                        stopColor="#6ee7b7"
                        stopOpacity={0.06}
                      />
                    </linearGradient>
                    <linearGradient
                      id="expenseGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#fcd34d" stopOpacity={0.45} />
                      <stop
                        offset="95%"
                        stopColor="#fcd34d"
                        stopOpacity={0.06}
                      />
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
                              <div
                                key={index}
                                className="flex items-center gap-2 text-base"
                              >
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
            {/* Property Distribution */}
            <div className="space-y-3">
              <h3 className={cn("px-0.5 text-base font-medium tracking-[-0.01em]", pageHeading)}>
                {t("dashboard.sections.propertyMix.title")}
              </h3>
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
                        data={propertyDistribution as any}
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
                            const data = payload[0].payload;
                            const percentage = overview?.totalProperties
                              ? Math.round(
                                  (data.value / overview.totalProperties) * 100
                                )
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

                  {/* Center Total */}
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

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                  {propertyDistribution.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      ></div>
                      <span className={cn("whitespace-nowrap text-sm", pageBody)}>
                        {entry.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Payment Status */}
            <div className="space-y-3">
              <h3 className={cn("px-0.5 text-base font-medium tracking-[-0.01em]", pageHeading)}>
                {t("dashboard.sections.rentRadar.title")}
              </h3>
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

        {/* Right Column - Activities and Tasks */}
        <div className="space-y-6">
          {/* Recent Activities */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
                  <Activity
                    className={cn("h-5 w-5", isLight ? "text-cyan-600" : "text-cyan-200")}
                  />
                  {t("dashboard.recentActivity.title")}
                </CardTitle>
              </div>
              <CardDescription className="text-sm">
                {t("dashboard.recentActivity.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <div className="space-y-4">
                  {recentActivities.length === 0 && (
                    <p className={cn("text-base", pageBody)}>{t("dashboard.recentActivity.empty")}</p>
                  )}
                  {recentActivities.map((activity) => {
                    const IconComponent = getActivityIcon(activity.type);
                    const actColor = getActivityColor(activity.type, activity.status);
                    const actColorLt =
                      actColor === "text-emerald-200"
                        ? "text-emerald-600"
                        : actColor === "text-amber-200"
                          ? "text-amber-600"
                          : actColor === "text-sky-200"
                            ? "text-sky-600"
                            : actColor === "text-rose-200"
                              ? "text-rose-600"
                              : actColor === "text-cyan-200"
                                ? "text-cyan-600"
                                : actColor === "text-violet-200"
                                  ? "text-violet-600"
                                  : "text-slate-700";
                    return (
                      <div
                        key={activity.id}
                        className={cn(
                          "flex items-start gap-3 rounded-lg p-3 transition-colors",
                          isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.06]"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-lg p-2 ring-1",
                            isLight
                              ? "bg-slate-100 ring-slate-200/80"
                              : "bg-white/[0.08] ring-white/10",
                            isLight ? actColorLt : actColor
                          )}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-base font-medium leading-tight", pageHeading)}>
                            {activity.description}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={cn("text-sm", pageMuted)}>
                              {formatTimeAgo(activity.timestamp)}
                            </span>
                            {activity.amount && (
                              <Badge variant="outline" className="text-sm">
                                {formatCurrency(activity.amount)}
                              </Badge>
                            )}
                            {activity.priority && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-sm",
                                  isLight
                                    ? activity.priority === "high" || activity.priority === "urgent"
                                      ? "text-rose-600"
                                      : activity.priority === "medium"
                                        ? "text-amber-600"
                                        : activity.priority === "low"
                                          ? "text-emerald-600"
                                          : "text-slate-600"
                                    : getPriorityColor(activity.priority)
                                )}
                              >
                                {getPriorityLabel(activity.priority)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card className="rounded-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
                  <ClipboardList
                    className={cn("h-5 w-5", isLight ? "text-amber-600" : "text-amber-200")}
                  />
                  {t("dashboard.tasks.title")}
                </CardTitle>
              </div>
              <CardDescription className="text-sm">
                {t("dashboard.tasks.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingTasks.length === 0 && (
                  <p className={cn("text-base", pageBody)}>{t("dashboard.tasks.empty")}</p>
                )}
                {upcomingTasks.slice(0, 4).map((task) => {
                  const dueDate = new Date(task.dueDate);
                  const dueDateLabel = Number.isNaN(dueDate.getTime())
                    ? t("dashboard.tasks.datePending")
                    : formatDate(dueDate, { format: "medium" });

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                        isLight
                          ? "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          : "border-white/15 hover:border-white/25 hover:bg-white/[0.04]"
                      )}
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-base font-medium leading-tight", pageHeading)}>
                          {task.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Calendar
                            className={cn("h-4 w-4", isLight ? "text-slate-500" : "text-white")}
                          />
                          <span className={cn("text-sm", pageMuted)}>{dueDateLabel}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-sm",
                              isLight
                                ? String(task.priority).includes("high") ||
                                  String(task.priority).includes("urgent")
                                  ? "text-rose-600"
                                  : "text-slate-600"
                                : getPriorityColor(String(task.priority))
                            )}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 w-8 p-0",
                          isLight
                            ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
