"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  RefreshCw,
  Filter,
  ArrowLeft,
  ChevronRight,
  Zap,
  Heart,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TenantScore {
  _id: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  churnRiskScore: number;
  churnRiskLevel: "low" | "medium" | "high";
  renewalLikelihoodPct: number;
  delinquencyProbabilityPct: number;
  lifetimeValueEstimate: number;
  sentimentSignal: "positive" | "neutral" | "negative";
  signals: {
    paymentsLast12: number;
    latePaymentsLast12: number;
    daysUntilLeaseExpiry: number | null;
    tenancyMonths: number;
    monthlyRent: number;
    leaseRenewals: number;
  };
  interventionSent: boolean;
  interventionSentAt: string | null;
  lastCalculatedAt: string;
}

interface PortfolioStats {
  total: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  avgRenewalLikelihood: number;
  avgLifetimeValue: number;
  needsIntervention: number;
}

const RISK_COLORS = {
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
};

const SENTIMENT_MAP = {
  positive: { icon: <Heart className="h-3.5 w-3.5 text-emerald-500" />, label: "Positive" },
  neutral: { icon: <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />, label: "Neutral" },
  negative: { icon: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />, label: "Negative" },
};

const FILTERS = [
  { value: "all", label: "All Tenants" },
  { value: "high_churn", label: "High Churn Risk" },
  { value: "medium_churn", label: "Medium Churn Risk" },
  { value: "payment_risk", label: "Payment Risk ≥50%" },
  { value: "renewal_soon", label: "Lease Expiring Soon" },
  { value: "high_ltv", label: "High Lifetime Value" },
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function TenantIntelligenceDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = (session?.user as { role?: string })?.role || "";
  const [scores, setScores] = useState<TenantScore[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [sendingOffer, setSendingOffer] = useState<string | null>(null);

  const isManager = ["admin", "manager"].includes(userRole.toLowerCase());

  useEffect(() => {
    if (!isManager && userRole) {
      router.replace("/dashboard/analytics");
    }
  }, [isManager, userRole, router]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      const params = new URLSearchParams({ filter, limit: "50" });
      if (forceRefresh) params.set("refresh", "true");
      const res = await fetch(`/api/tenant-intelligence/portfolio?${params}`);
      if (!res.ok) return;
      const json = await res.json();
      const list: TenantScore[] = json.data ?? [];
      setScores(list);
      setTotal(json.total ?? list.length);

      const computed: PortfolioStats = {
        total: list.length,
        highRisk: list.filter((s) => s.churnRiskLevel === "high").length,
        mediumRisk: list.filter((s) => s.churnRiskLevel === "medium").length,
        lowRisk: list.filter((s) => s.churnRiskLevel === "low").length,
        avgRenewalLikelihood:
          list.length > 0
            ? Math.round(list.reduce((a, s) => a + s.renewalLikelihoodPct, 0) / list.length)
            : 0,
        avgLifetimeValue:
          list.length > 0
            ? Math.round(list.reduce((a, s) => a + s.lifetimeValueEstimate, 0) / list.length)
            : 0,
        needsIntervention: list.filter(
          (s) => s.churnRiskLevel === "high" && !s.interventionSent
        ).length,
      };
      setStats(computed);
    } catch {
      toast.error("Failed to load tenant intelligence data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleQuickOffer = async (tenantId: string, tenantName: string) => {
    setSendingOffer(tenantId);
    try {
      const res = await fetch("/api/tenant-intelligence/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, offerId: "checkin" }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Check-in sent to ${tenantName}.`);
        await fetchData();
      } else {
        toast.error(json.error || "Failed.");
      }
    } finally {
      setSendingOffer(null);
    }
  };

  if (!isManager && userRole) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => router.push("/dashboard/analytics")}
          >
            <ArrowLeft className="h-4 w-4" />
            Analytics
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Brain className="h-5 w-5 text-violet-500" />
              Tenant Intelligence
            </h1>
            <p className="text-sm text-muted-foreground">
              Predictive scoring and retention insights for your portfolio
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Total Tenants</p>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-1 text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">High Risk</p>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <p className="mt-1 text-2xl font-bold text-red-600">{stats.highRisk}</p>
              {stats.needsIntervention > 0 && (
                <p className="text-xs text-amber-600 mt-0.5">
                  {stats.needsIntervention} need intervention
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Avg Renewal Rate</p>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-1 text-2xl font-bold">{stats.avgRenewalLikelihood}%</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Avg LTV</p>
                <DollarSign className="h-4 w-4 text-violet-500" />
              </div>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.avgLifetimeValue)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-52 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {total > 0 && (
          <span className="text-sm text-muted-foreground">{total} tenant{total !== 1 ? "s" : ""}</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/60 animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted/60" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded bg-muted/60" />
                    <div className="h-3 w-24 rounded bg-muted/40" />
                  </div>
                  <div className="h-6 w-20 rounded bg-muted/60" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : scores.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Brain className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No tenant intelligence data available yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Scores are generated automatically for active tenants.
            </p>
            <Button size="sm" variant="outline" className="mt-4" onClick={handleRefresh}>
              Generate Scores
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {scores.map((score) => {
            const sentiment = SENTIMENT_MAP[score.sentimentSignal];
            return (
              <Card key={score._id} className="border-border/60 hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{score.tenantName || "Unknown Tenant"}</span>
                        <Badge className={`text-xs border ${RISK_COLORS[score.churnRiskLevel]}`}>
                          {score.churnRiskLevel === "high" ? "High Risk" : score.churnRiskLevel === "medium" ? "Medium Risk" : "Low Risk"}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {sentiment.icon}
                          {sentiment.label}
                        </div>
                        {score.interventionSent && (
                          <Badge variant="outline" className="text-xs">
                            Offer Sent
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[11px] text-muted-foreground mb-1">
                            Churn Risk {score.churnRiskScore}/100
                          </p>
                          <ScoreBar
                            value={score.churnRiskScore}
                            color={
                              score.churnRiskLevel === "high"
                                ? "bg-red-500"
                                : score.churnRiskLevel === "medium"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }
                          />
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground mb-1">
                            Renewal {score.renewalLikelihoodPct}%
                          </p>
                          <ScoreBar value={score.renewalLikelihoodPct} color="bg-blue-500" />
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground mb-1">
                            LTV {formatCurrency(score.lifetimeValueEstimate)}
                          </p>
                          <ScoreBar
                            value={(score.lifetimeValueEstimate / 60000) * 100}
                            color="bg-violet-500"
                          />
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                        {score.signals.latePaymentsLast12 > 0 && (
                          <span className="text-amber-600">
                            {score.signals.latePaymentsLast12} late payment{score.signals.latePaymentsLast12 > 1 ? "s" : ""}
                          </span>
                        )}
                        {score.signals.daysUntilLeaseExpiry !== null && score.signals.daysUntilLeaseExpiry <= 90 && score.signals.daysUntilLeaseExpiry > 0 && (
                          <span className="text-amber-600">
                            Lease expires in {score.signals.daysUntilLeaseExpiry}d
                          </span>
                        )}
                        <span>{score.signals.tenancyMonths} mo tenancy</span>
                        {score.signals.monthlyRent > 0 && (
                          <span>{formatCurrency(score.signals.monthlyRent)}/mo</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Link href={`/dashboard/tenants/${score.tenantId}`}>
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                          View
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {isManager && score.churnRiskLevel === "high" && !score.interventionSent && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          disabled={sendingOffer === score.tenantId}
                          onClick={() => handleQuickOffer(score.tenantId, score.tenantName)}
                        >
                          <Zap className="h-3 w-3 text-amber-500" />
                          {sendingOffer === score.tenantId ? "Sending…" : "Intervene"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
