"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Activity,
  ExternalLink,
} from "lucide-react";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { cn } from "@/lib/utils";

interface HealthComponent {
  label: string;
  score: number;
  maxScore: number;
  value: string;
  status: "good" | "fair" | "poor";
}

interface HistoryPoint {
  date: string;
  score: number;
  grade: string;
}

interface PortfolioHealthData {
  score: number;
  grade: string;
  trend: number;
  components: HealthComponent[];
  insights: string[];
  history: HistoryPoint[];
  meta: {
    totalProperties: number;
    totalUnits: number;
    activeLeases: number;
    expiringIn60Days: number;
    marketRent: number;
    occupancyRate?: number;
    collectionRate?: number;
  };
  calculatedAt: string;
}

const STATUS_COLOR: Record<HealthComponent["status"], string> = {
  good: "bg-green-500",
  fair: "bg-yellow-500",
  poor: "bg-red-500",
};

const STATUS_TEXT: Record<HealthComponent["status"], string> = {
  good: "text-green-700",
  fair: "text-yellow-700",
  poor: "text-red-700",
};

const STATUS_TEXT_GLASS: Record<HealthComponent["status"], string> = {
  good: "text-emerald-200",
  fair: "text-amber-200",
  poor: "text-red-200",
};

const GRADE_COLOR: Record<string, string> = {
  A: "text-green-600",
  B: "text-blue-600",
  C: "text-yellow-600",
  D: "text-orange-600",
  F: "text-red-600",
  "N/A": "text-muted-foreground",
};

const GRADE_COLOR_GLASS: Record<string, string> = {
  A: "text-emerald-200",
  B: "text-sky-200",
  C: "text-amber-200",
  D: "text-orange-200",
  F: "text-red-200",
  "N/A": "text-white/50",
};

function ScoreRing({
  score,
  grade,
  isLight,
}: {
  score: number;
  grade: string;
  isLight: boolean;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const ringColor =
    score >= 80
      ? "#22c55e"
      : score >= 65
      ? "#eab308"
      : score >= 50
      ? "#f97316"
      : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" className="-rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="currentColor"
          strokeWidth="10"
          fill="none"
          className={isLight ? "text-muted-foreground/25" : "text-white/12"}
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke={ringColor}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-3xl font-bold", !isLight && "text-white")}>{score}</span>
        <span
          className={cn(
            "text-lg font-semibold",
            isLight
              ? GRADE_COLOR[grade] ?? "text-foreground"
              : GRADE_COLOR_GLASS[grade] ?? "text-white/80"
          )}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}

interface Props {
  compact?: boolean;
  propertyId?: string;
}

export function PortfolioHealthWidget({ compact = false, propertyId }: Props) {
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;
  const [data, setData] = useState<PortfolioHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (propertyId) params.set("propertyId", propertyId);
      const res = await fetch(
        `/api/analytics/portfolio-health?${params.toString()}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load");
      setData(json.data as PortfolioHealthData);
    } catch (err) {
      setError("Unable to load portfolio health");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Portfolio Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Portfolio Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">{error || "No data"}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchHealth}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Portfolio Health Score
            </CardTitle>
            <CardDescription>
              {data.meta.totalProperties} propert
              {data.meta.totalProperties === 1 ? "y" : "ies"} ·{" "}
              {data.meta.totalUnits} unit
              {data.meta.totalUnits === 1 ? "" : "s"} ·{" "}
              {data.meta.activeLeases} active lease
              {data.meta.activeLeases === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={fetchHealth}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Score ring */}
        <div className="flex flex-col items-center gap-2">
          <ScoreRing score={data.score} grade={data.grade} isLight={isLight} />
          <p
            className={cn(
              "text-xs",
              isLight ? "text-muted-foreground" : "text-white/60"
            )}
          >
            {data.score >= 80
              ? "Excellent portfolio performance"
              : data.score >= 65
              ? "Good — some areas need attention"
              : data.score >= 50
              ? "Fair — action recommended"
              : "Poor — immediate action needed"}
          </p>
        </div>

        {/* Trend indicator */}
        {data.trend !== undefined && data.trend !== 0 && (
          <div
            className={cn(
              "flex items-center justify-center gap-1 text-xs font-medium",
              data.trend > 0
                ? isLight
                  ? "text-green-600"
                  : "text-emerald-300"
                : isLight
                  ? "text-red-600"
                  : "text-red-300"
            )}
          >
            {data.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {data.trend > 0 ? "+" : ""}{data.trend} pts vs. yesterday
          </div>
        )}

        {/* 30-day history sparkline */}
        {data.history && data.history.length > 1 && !compact && (
          <div>
            <p
              className={cn(
                "mb-1 text-xs",
                isLight ? "text-muted-foreground" : "text-white/55"
              )}
            >
              30-Day Score History
            </p>
            <div className="flex items-end gap-0.5 h-10">
              {data.history.map((h, i) => {
                const maxScore = Math.max(...data.history.map((x) => x.score));
                const minScore = Math.min(...data.history.map((x) => x.score));
                const range = maxScore - minScore || 1;
                const heightPct = ((h.score - minScore) / range) * 80 + 20;
                return (
                  <div
                    key={i}
                    title={`${new Date(h.date).toLocaleDateString()}: ${h.score} (${h.grade})`}
                    className={cn(
                      "min-w-[2px] flex-1 cursor-default rounded-sm transition-colors",
                      h.score >= 80
                        ? isLight
                          ? "bg-green-400"
                          : "bg-emerald-400/70"
                        : h.score >= 65
                          ? isLight
                            ? "bg-yellow-400"
                            : "bg-amber-400/70"
                          : isLight
                            ? "bg-red-400"
                            : "bg-red-400/70"
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Component breakdown */}
        <div className="space-y-3">
          {data.components.map((c) => (
            <div key={c.label}>
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isLight ? "text-slate-900" : "text-white/90"
                  )}
                >
                  {c.label}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xs",
                      isLight ? STATUS_TEXT[c.status] : STATUS_TEXT_GLASS[c.status]
                    )}
                  >
                    {c.value}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      isLight ? "text-muted-foreground" : "text-white/50"
                    )}
                  >
                    {c.score}/{c.maxScore} pts
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "h-2 overflow-hidden rounded-full border backdrop-blur-sm",
                  isLight
                    ? "border-slate-200/80 bg-slate-100/90"
                    : "border-white/14 bg-white/[0.08]"
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    STATUS_COLOR[c.status],
                    !isLight && "opacity-90 shadow-[0_0_10px_rgba(255,255,255,0.12)]"
                  )}
                  style={{ width: `${(c.score / c.maxScore) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Top insight */}
        {!compact && data.insights.length > 0 && (
          <div
            className={cn(
              "rounded-xl border p-3 backdrop-blur-md",
              isLight
                ? "border-slate-200/80 bg-white/65"
                : "border-white/12 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            )}
          >
            <p
              className={cn(
                "mb-1 text-xs font-medium",
                isLight ? "text-slate-800" : "text-white/90"
              )}
            >
              Top Insight
            </p>
            <p
              className={cn(
                "text-xs leading-relaxed",
                isLight ? "text-slate-600" : "text-white/65"
              )}
            >
              {data.insights[0]}
            </p>
          </div>
        )}

        {/* Alerts */}
        {data.meta.expiringIn60Days > 0 && (
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border p-2 backdrop-blur-sm",
              isLight
                ? "border-orange-200 bg-orange-50/90"
                : "border-amber-400/25 bg-amber-500/[0.12]"
            )}
          >
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isLight
                  ? "border-orange-300 text-orange-700"
                  : "border-amber-400/40 bg-white/[0.06] text-amber-100"
              )}
            >
              Expiring
            </Badge>
            <span
              className={cn(
                "text-xs",
                isLight ? "text-orange-700" : "text-amber-100/90"
              )}
            >
              {data.meta.expiringIn60Days} lease
              {data.meta.expiringIn60Days === 1 ? "" : "s"} expire within 60
              days
            </span>
          </div>
        )}

        <Link href="/dashboard/analytics/financial">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full",
              isLight
                ? "border-slate-200/80 bg-white/75 backdrop-blur-sm hover:bg-white/90"
                : "border-white/18 bg-white/[0.08] backdrop-blur-sm hover:bg-white/[0.12]"
            )}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Financial Dashboard
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
