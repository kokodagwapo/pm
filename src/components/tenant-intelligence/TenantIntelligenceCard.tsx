"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  DollarSign,
  Heart,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface TenantIntelligenceData {
  churnRiskScore: number;
  churnRiskLevel: "low" | "medium" | "high";
  renewalLikelihoodPct: number;
  delinquencyProbabilityPct: number;
  lifetimeValueEstimate: number;
  sentimentSignal: "positive" | "neutral" | "negative";
  signals: {
    paymentsLast12: number;
    latePaymentsLast12: number;
    avgDaysLate: number;
    maintenanceRequestsLast6Months: number;
    daysUntilLeaseExpiry: number | null;
    leaseRenewals: number;
    tenancyMonths: number;
    monthlyRent: number;
  };
  explanation: string[];
  interventionSent: boolean;
  interventionSentAt: string | null;
  lastCalculatedAt: string;
  paymentSparkline?: number[];
}

function PaymentSparkline({ data }: { data: number[] }) {
  const w = 80;
  const h = 20;
  const barW = w / data.length - 1;

  return (
    <svg width={w} height={h} className="overflow-visible">
      {data.map((v, i) => (
        <rect
          key={i}
          x={i * (w / data.length)}
          y={v === 1 ? 5 : v === -1 ? 0 : 8}
          width={Math.max(2, barW)}
          height={v === 1 ? 15 : v === -1 ? 20 : 10}
          rx={1}
          fill={v === 1 ? "#10b981" : v === -1 ? "#ef4444" : "#e5e7eb"}
          className="dark:fill-opacity-80"
        />
      ))}
    </svg>
  );
}

interface OfferTemplate {
  id: string;
  label: string;
  message: string;
}

interface TenantIntelligenceCardProps {
  tenantId: string;
  tenantName?: string;
  userRole?: string;
}

const RISK_COLORS = {
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const SENTIMENT_ICONS = {
  positive: <Heart className="h-4 w-4 text-emerald-500" />,
  neutral: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
  negative: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

function GaugeBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function TenantIntelligenceCard({
  tenantId,
  tenantName = "Tenant",
  userRole = "",
}: TenantIntelligenceCardProps) {
  const [data, setData] = useState<TenantIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [offers, setOffers] = useState<OfferTemplate[]>([]);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const [sendingOffer, setSendingOffer] = useState(false);

  const isManager = ["admin", "manager"].includes(userRole.toLowerCase());

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      const url = `/api/tenant-intelligence/${tenantId}${forceRefresh ? "?refresh=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const json = await res.json();
      setData(json.data);
    } catch {
      // silently fail — non-critical widget
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId]);

  const loadOffers = useCallback(async () => {
    try {
      const res = await fetch("/api/tenant-intelligence/intervention");
      if (!res.ok) return;
      const json = await res.json();
      setOffers(json.data ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (isManager) loadOffers();
  }, [fetchData, loadOffers, isManager]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(true);
  };

  const handleSendOffer = async () => {
    if (!selectedOffer) return;
    setSendingOffer(true);
    try {
      const res = await fetch("/api/tenant-intelligence/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, offerId: selectedOffer }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Retention offer sent.");
        setOfferDialogOpen(false);
        setSelectedOffer(null);
        await fetchData(true);
      } else {
        toast.error(json.error || "Failed to send offer.");
      }
    } finally {
      setSendingOffer(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm animate-pulse">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-muted/60" />
            <div className="h-4 w-40 rounded bg-muted/60" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 rounded bg-muted/50" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const churnLabel =
    data.churnRiskLevel === "high" ? "High Risk" : data.churnRiskLevel === "medium" ? "Medium Risk" : "Low Risk";

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Brain className="h-5 w-5 text-violet-500" />
            Tenant Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={RISK_COLORS[data.churnRiskLevel]}>{churnLabel}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Churn Risk</span>
              <span className="font-medium tabular-nums">{data.churnRiskScore}/100</span>
            </div>
            <GaugeBar
              value={data.churnRiskScore}
              color={
                data.churnRiskLevel === "high"
                  ? "bg-red-500"
                  : data.churnRiskLevel === "medium"
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Renewal Likelihood</span>
              <span className="font-medium tabular-nums">{data.renewalLikelihoodPct}%</span>
            </div>
            <GaugeBar
              value={data.renewalLikelihoodPct}
              color="bg-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Payment Risk</span>
              <span className="font-medium tabular-nums">{data.delinquencyProbabilityPct}%</span>
            </div>
            <GaugeBar
              value={data.delinquencyProbabilityPct}
              color={data.delinquencyProbabilityPct >= 50 ? "bg-red-500" : data.delinquencyProbabilityPct >= 30 ? "bg-amber-500" : "bg-emerald-500"}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Est. Lifetime Value</p>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-sm font-semibold">{formatCurrency(data.lifetimeValueEstimate)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
          {SENTIMENT_ICONS[data.sentimentSignal]}
          <span className="text-xs text-muted-foreground capitalize">
            Sentiment:{" "}
            <span className="font-medium text-foreground">{data.sentimentSignal}</span>
          </span>
          <span className="mx-2 text-border">·</span>
          <span className="text-xs text-muted-foreground">
            Tenancy:{" "}
            <span className="font-medium text-foreground">
              {data.signals.tenancyMonths} mo.
            </span>
          </span>
          {data.signals.leaseRenewals > 0 && (
            <>
              <span className="mx-2 text-border">·</span>
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{data.signals.leaseRenewals}</span> renewal{data.signals.leaseRenewals > 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>

        <button
          className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setExpanded((e) => !e)}
        >
          <span>Insights & Signals</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded && (
          <div className="space-y-3 border-t border-border/40 pt-3">
            {data.paymentSparkline && data.paymentSparkline.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Payment History (12 months)</p>
                <div className="flex items-end gap-1">
                  <PaymentSparkline data={data.paymentSparkline} />
                  <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground ml-2">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-sm bg-emerald-500" />
                      On time
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-sm bg-red-500" />
                      Late
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-sm bg-gray-200" />
                      None
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md bg-muted/20 px-2 py-1.5">
                <p className="text-muted-foreground">Payments (12 mo)</p>
                <p className="font-semibold">
                  {data.signals.paymentsLast12 - data.signals.latePaymentsLast12}/{data.signals.paymentsLast12} on time
                </p>
              </div>
              <div className="rounded-md bg-muted/20 px-2 py-1.5">
                <p className="text-muted-foreground">Avg Days Late</p>
                <p className="font-semibold">{data.signals.avgDaysLate} days</p>
              </div>
              <div className="rounded-md bg-muted/20 px-2 py-1.5">
                <p className="text-muted-foreground">Maint. (6 mo)</p>
                <p className="font-semibold">{data.signals.maintenanceRequestsLast6Months} requests</p>
              </div>
              <div className="rounded-md bg-muted/20 px-2 py-1.5">
                <p className="text-muted-foreground">Lease Expiry</p>
                <p className="font-semibold">
                  {data.signals.daysUntilLeaseExpiry !== null
                    ? `${data.signals.daysUntilLeaseExpiry > 0 ? data.signals.daysUntilLeaseExpiry + "d" : "Expired"}`
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              {data.explanation.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400" />
                  {e}
                </div>
              ))}
            </div>
          </div>
        )}

        {isManager && (
          <div className="flex items-center gap-2 border-t border-border/40 pt-3">
            {data.interventionSent && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Offer sent
                {data.interventionSentAt
                  ? ` · ${new Date(data.interventionSentAt).toLocaleDateString()}`
                  : ""}
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              className="ml-auto flex items-center gap-1.5 text-xs"
              onClick={() => setOfferDialogOpen(true)}
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Send Retention Offer
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60 text-right">
          Updated {new Date(data.lastCalculatedAt).toLocaleString()}
        </p>
      </CardContent>

      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Retention Offer</DialogTitle>
            <DialogDescription>
              Select a retention offer to send to {tenantName}. This will notify them via in-app message and email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {offers.map((offer) => (
              <button
                key={offer.id}
                onClick={() => setSelectedOffer(offer.id)}
                className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                  selectedOffer === offer.id
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20"
                    : "border-border/60 hover:border-border"
                }`}
              >
                <div className="font-medium">{offer.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {offer.message}
                </div>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedOffer || sendingOffer}
              onClick={handleSendOffer}
            >
              {sendingOffer ? "Sending…" : "Send Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
