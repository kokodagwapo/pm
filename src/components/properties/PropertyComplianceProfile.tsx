"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, AlertTriangle, CheckCircle2, Clock, TrendingUp, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ComplianceObligation {
  _id: string;
  title: string;
  category: string;
  status: string;
  severity: string;
  dueDate?: string;
}

interface ComplianceStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  critical: number;
  high: number;
}

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-emerald-500",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "text-amber-600 bg-amber-50 border-amber-200",
  in_progress: "text-blue-600 bg-blue-50 border-blue-200",
  completed: "text-emerald-600 bg-emerald-50 border-emerald-200",
  overdue: "text-red-600 bg-red-50 border-red-200",
  waived: "text-slate-500 bg-slate-50 border-slate-200",
  not_applicable: "text-slate-400 bg-slate-50 border-slate-200",
};

interface Props {
  propertyId: string;
  isLight: boolean;
}

export default function PropertyComplianceProfile({ propertyId, isLight }: Props) {
  const router = useRouter();
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchObligations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/compliance/obligations?propertyId=${propertyId}`);
      if (!res.ok) return;
      const data = await res.json();
      setObligations(data.obligations || []);
      setStats(data.stats || null);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchObligations();
  }, [fetchObligations]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/compliance/obligations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchObligations();
    } catch {}
  };

  const cardBase = cn(
    "rounded-2xl border p-4",
    isLight ? "border-slate-200 bg-white shadow-sm" : "border-white/[0.1] bg-white/[0.05]"
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={cn("h-16 animate-pulse rounded-xl", isLight ? "bg-slate-100" : "bg-white/[0.05]")} />
        ))}
      </div>
    );
  }

  const activeObligations = obligations.filter((o) =>
    !["completed", "waived", "not_applicable"].includes(o.status)
  );
  const overdueObligations = obligations.filter((o) => o.status === "overdue");
  const criticalObligations = obligations.filter((o) => o.severity === "critical" && o.status !== "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", isLight ? "bg-violet-100" : "bg-violet-500/20")}>
            <Shield className={cn("h-5 w-5", isLight ? "text-violet-600" : "text-violet-400")} />
          </div>
          <div>
            <h3 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>
              Compliance Profile
            </h3>
            <p className={cn("text-xs", isLight ? "text-slate-500" : "text-white/50")}>
              Regulatory obligations for this property
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => router.push("/dashboard/compliance")}
          className={cn("h-8 rounded-xl px-3 text-xs", isLight ? "text-violet-600 hover:bg-violet-50" : "text-violet-400 hover:bg-violet-500/10")}
        >
          Full Hub
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: isLight ? "text-slate-700" : "text-white" },
            { label: "Active", value: activeObligations.length, color: "text-blue-500" },
            { label: "Overdue", value: stats.overdue, color: "text-red-500" },
            { label: "Critical", value: stats.critical, color: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className={cn(cardBase, "text-center")}>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className={cn("text-xs font-medium mt-0.5", isLight ? "text-slate-500" : "text-white/50")}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Critical / Overdue alerts */}
      {(criticalObligations.length > 0 || overdueObligations.length > 0) && (
        <div className={cn("rounded-xl border p-3", isLight ? "border-red-200 bg-red-50" : "border-red-500/20 bg-red-500/5")}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className={cn("text-sm font-semibold", isLight ? "text-red-700" : "text-red-400")}>
              Attention Required
            </span>
          </div>
          <div className="space-y-1">
            {overdueObligations.slice(0, 2).map((o) => (
              <p key={o._id} className={cn("text-xs", isLight ? "text-red-600" : "text-red-400")}>
                · {o.title} — overdue
              </p>
            ))}
            {criticalObligations.filter((o) => o.status !== "overdue").slice(0, 2).map((o) => (
              <p key={o._id} className={cn("text-xs", isLight ? "text-red-600" : "text-red-400")}>
                · {o.title} — critical priority
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Obligations list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className={cn("text-xs font-semibold uppercase tracking-wider", isLight ? "text-slate-500" : "text-white/50")}>
            Active Obligations
          </h4>
          <span className={cn("text-xs", isLight ? "text-slate-400" : "text-white/40")}>
            {activeObligations.length} active
          </span>
        </div>

        {activeObligations.length === 0 ? (
          <div className={cn("flex flex-col items-center justify-center rounded-xl border py-8 text-center", isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.08] bg-white/[0.02]")}>
            <CheckCircle2 className={cn("h-8 w-8", isLight ? "text-emerald-400" : "text-emerald-500/50")} />
            <p className={cn("mt-2 text-sm font-medium", isLight ? "text-slate-500" : "text-white/50")}>
              {obligations.length === 0 ? "No obligations yet" : "All obligations completed"}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push("/dashboard/compliance")}
              className={cn("mt-2 rounded-xl text-xs", isLight ? "text-violet-600 hover:bg-violet-50" : "text-violet-400 hover:bg-violet-500/10")}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add from Compliance Hub
            </Button>
          </div>
        ) : (
          activeObligations.map((o) => {
            const daysUntilDue = o.dueDate
              ? Math.ceil((new Date(o.dueDate).getTime() - Date.now()) / 86400000)
              : null;
            const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

            return (
              <div
                key={o._id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3",
                  isLight ? "border-slate-200 bg-white" : "border-white/[0.08] bg-white/[0.03]",
                  isOverdue && "border-red-300/50"
                )}
              >
                <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", SEVERITY_DOT[o.severity] || "bg-slate-400")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium truncate", isLight ? "text-slate-900" : "text-white")}>{o.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className={cn("text-xs", isLight ? "text-slate-400" : "text-white/40")}>
                      {o.category.replace(/_/g, " ")}
                    </span>
                    {o.dueDate && (
                      <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-red-500" : isLight ? "text-slate-500" : "text-white/50")}>
                        <Clock className="h-3 w-3" />
                        {isOverdue
                          ? `${Math.abs(daysUntilDue!)} days overdue`
                          : daysUntilDue !== null && daysUntilDue <= 14
                          ? `Due in ${daysUntilDue}d`
                          : new Date(o.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs", STATUS_BADGE[o.status] || "")}>
                    {o.status === "in_progress" ? "In Progress" : o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn("h-7 rounded-lg px-2 text-xs", isLight ? "text-slate-600 hover:bg-slate-100" : "text-white/70 hover:bg-white/10")}
                    onClick={() => handleStatusChange(o._id, o.status === "pending" ? "in_progress" : "completed")}
                  >
                    {o.status === "pending" ? "Start" : "Complete"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Completed obligations summary */}
      {stats && stats.completed > 0 && (
        <div className={cn("flex items-center gap-3 rounded-xl border p-3", isLight ? "border-emerald-200 bg-emerald-50" : "border-emerald-500/20 bg-emerald-500/5")}>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <p className={cn("text-sm", isLight ? "text-emerald-700" : "text-emerald-400")}>
            <span className="font-semibold">{stats.completed}</span> obligation{stats.completed !== 1 ? "s" : ""} completed
          </p>
          {stats.total > stats.completed && (
            <TrendingUp className="ml-auto h-4 w-4 text-emerald-500 opacity-60" />
          )}
        </div>
      )}
    </div>
  );
}
