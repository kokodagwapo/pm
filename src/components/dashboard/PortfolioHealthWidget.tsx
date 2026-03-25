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

interface HealthComponent {
  label: string;
  score: number;
  maxScore: number;
  value: string;
  status: "good" | "fair" | "poor";
}

interface PortfolioHealthData {
  score: number;
  grade: string;
  components: HealthComponent[];
  insights: string[];
  meta: {
    totalProperties: number;
    totalUnits: number;
    activeLeases: number;
    expiringIn60Days: number;
    marketRent: number;
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

const GRADE_COLOR: Record<string, string> = {
  A: "text-green-600",
  B: "text-blue-600",
  C: "text-yellow-600",
  D: "text-orange-600",
  F: "text-red-600",
  "N/A": "text-muted-foreground",
};

function ScoreRing({ score, grade }: { score: number; grade: string }) {
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
          className="text-muted-foreground/20"
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
        <span className="text-3xl font-bold">{score}</span>
        <span className={`text-lg font-semibold ${GRADE_COLOR[grade] ?? "text-foreground"}`}>
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
          <ScoreRing score={data.score} grade={data.grade} />
          <p className="text-xs text-muted-foreground">
            {data.score >= 80
              ? "Excellent portfolio performance"
              : data.score >= 65
              ? "Good — some areas need attention"
              : data.score >= 50
              ? "Fair — action recommended"
              : "Poor — immediate action needed"}
          </p>
        </div>

        {/* Component breakdown */}
        <div className="space-y-3">
          {data.components.map((c) => (
            <div key={c.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{c.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${STATUS_TEXT[c.status]}`}>
                    {c.value}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.score}/{c.maxScore} pts
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${STATUS_COLOR[c.status]}`}
                  style={{ width: `${(c.score / c.maxScore) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Top insight */}
        {!compact && data.insights.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium mb-1">Top Insight</p>
            <p className="text-xs text-muted-foreground">{data.insights[0]}</p>
          </div>
        )}

        {/* Alerts */}
        {data.meta.expiringIn60Days > 0 && (
          <div className="flex items-center gap-2 p-2 rounded bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
            <Badge variant="outline" className="text-orange-700 border-orange-300 text-xs">
              Expiring
            </Badge>
            <span className="text-xs text-orange-700 dark:text-orange-400">
              {data.meta.expiringIn60Days} lease
              {data.meta.expiringIn60Days === 1 ? "" : "s"} expire within 60
              days
            </span>
          </div>
        )}

        <Link href="/dashboard/analytics/financial">
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Financial Dashboard
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
