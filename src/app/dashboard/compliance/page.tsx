"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Calculator,
  Gavel,
  Eye,
  Plus,
  RefreshCw,
  ChevronRight,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import RentCalculatorModal from "@/components/compliance/RentCalculatorModal";
import EvictionWorkflowModal from "@/components/compliance/EvictionWorkflowModal";
import FairHousingModal from "@/components/compliance/FairHousingModal";
import AddObligationModal from "@/components/compliance/AddObligationModal";

interface ComplianceStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  critical: number;
  high: number;
}

interface ComplianceObligation {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  severity: string;
  dueDate?: string;
  propertyId?: { name: string; address?: { city: string; state: string } };
  assignedTo?: { firstName: string; lastName: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  pending: { label: "Pending", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Clock },
  in_progress: { label: "In Progress", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: TrendingUp },
  completed: { label: "Completed", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: AlertTriangle },
  waived: { label: "Waived", color: "text-slate-400 bg-slate-400/10 border-slate-400/20", icon: CheckCircle2 },
  not_applicable: { label: "N/A", color: "text-slate-400 bg-slate-400/10 border-slate-400/20", icon: CheckCircle2 },
};

const SEVERITY_CONFIG: Record<string, { label: string; dot: string }> = {
  critical: { label: "Critical", dot: "bg-red-500" },
  high: { label: "High", dot: "bg-orange-500" },
  medium: { label: "Medium", dot: "bg-amber-500" },
  low: { label: "Low", dot: "bg-emerald-500" },
};

const CATEGORY_LABELS: Record<string, string> = {
  rent_control: "Rent Control",
  eviction: "Eviction",
  fair_housing: "Fair Housing",
  habitability: "Habitability",
  security_deposit: "Security Deposit",
  notice_requirements: "Notice Requirements",
  inspection: "Inspection",
  discrimination: "Discrimination",
  accessibility: "Accessibility",
  lead_disclosure: "Lead Disclosure",
  mold: "Mold",
  general: "General",
  vendor_compliance: "Vendor Compliance",
  license_renewal: "License Renewal",
  insurance: "Insurance",
};

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  isLight,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<any>;
  colorClass: string;
  isLight: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all duration-200",
        isLight
          ? "border-slate-200 bg-white shadow-sm"
          : "border-white/[0.1] bg-white/[0.05]"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={cn("text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-500" : "text-white/50")}>
            {label}
          </p>
          <p className={cn("mt-1 text-3xl font-semibold tracking-tight", colorClass)}>{value}</p>
        </div>
        <div className={cn("rounded-xl p-2.5", colorClass.replace("text-", "bg-").replace("400", "400/10").replace("500", "500/10"))}>
          <Icon className={cn("h-5 w-5", colorClass)} />
        </div>
      </div>
    </div>
  );
}

function ObligationRow({
  obligation,
  isLight,
  onStatusChange,
}: {
  obligation: ComplianceObligation;
  isLight: boolean;
  onStatusChange: (id: string, status: string) => void;
}) {
  const statusCfg = STATUS_CONFIG[obligation.status] || STATUS_CONFIG.pending;
  const severityCfg = SEVERITY_CONFIG[obligation.severity] || SEVERITY_CONFIG.low;
  const StatusIcon = statusCfg.icon;

  const isOverdue =
    obligation.dueDate &&
    new Date(obligation.dueDate) < new Date() &&
    !["completed", "waived", "not_applicable"].includes(obligation.status);

  const daysUntilDue = obligation.dueDate
    ? Math.ceil((new Date(obligation.dueDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-all duration-200",
        isLight
          ? "border-slate-200 bg-white hover:border-slate-300"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.06]",
        isOverdue && "border-red-500/30"
      )}
    >
      <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", severityCfg.dot)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm font-medium truncate", isLight ? "text-slate-900" : "text-white")}>
            {obligation.title}
          </p>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
              statusCfg.color
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {statusCfg.label}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {obligation.propertyId && (
            <span className={cn("flex items-center gap-1 text-xs", isLight ? "text-slate-500" : "text-white/50")}>
              <Building2 className="h-3 w-3" />
              {obligation.propertyId.name}
            </span>
          )}
          <span className={cn("text-xs", isLight ? "text-slate-400" : "text-white/40")}>
            {CATEGORY_LABELS[obligation.category] || obligation.category}
          </span>
          {obligation.dueDate && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue ? "text-red-400" : isLight ? "text-slate-500" : "text-white/50"
              )}
            >
              <Calendar className="h-3 w-3" />
              {isOverdue
                ? `${Math.abs(daysUntilDue!)} days overdue`
                : daysUntilDue !== null && daysUntilDue <= 14
                ? `Due in ${daysUntilDue} days`
                : new Date(obligation.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {obligation.status !== "completed" && (
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 rounded-lg px-2 text-xs",
              isLight ? "text-slate-600 hover:bg-slate-100" : "text-white/70 hover:bg-white/10"
            )}
            onClick={() => onStatusChange(obligation._id, obligation.status === "pending" ? "in_progress" : "completed")}
          >
            {obligation.status === "pending" ? "Start" : "Complete"}
          </Button>
        )}
      </div>
    </div>
  );
}

interface PropertyOption {
  _id: string;
  name: string;
}

export default function CompliancePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLight } = useDashboardAppearance();
  const [obligations, setObligations] = useState<ComplianceObligation[]>([]);
  const [stats, setStats] = useState<ComplianceStats>({ total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0, critical: 0, high: 0 });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterProperty, setFilterProperty] = useState("all");
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [activeModal, setActiveModal] = useState<"rent" | "eviction" | "fairHousing" | "addObligation" | null>(null);

  useEffect(() => {
    fetch("/api/properties?limit=100")
      .then((r) => r.json())
      .then((d) => setProperties(d.properties || []))
      .catch(() => {});
  }, []);

  const fetchObligations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterSeverity !== "all") params.set("severity", filterSeverity);
      if (filterProperty !== "all") params.set("propertyId", filterProperty);
      const res = await fetch(`/api/compliance/obligations?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setObligations(data.obligations || []);
      setStats(data.stats || {});
    } catch (e) {
      console.error("Error fetching obligations:", e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity, filterProperty]);

  const seedJurisdictions = async () => {
    setSeeding(true);
    try {
      const checkRes = await fetch("/api/compliance/seed");
      if (!checkRes.ok) return;
      const checkData = await checkRes.json();
      if (!checkData.seeded) {
        await fetch("/api/compliance/seed", { method: "POST" });
      }
    } catch (e) {
      console.error("Seed error:", e);
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    seedJurisdictions();
  }, []);

  useEffect(() => {
    fetchObligations();
  }, [fetchObligations]);

  // Handle modal opening from URL hash
  useEffect(() => {
    const checkAndOpenModal = () => {
      const hash = window.location.hash.substring(1);
      if (hash === "rent" || hash === "eviction" || hash === "fairHousing") {
        setActiveModal(hash as "rent" | "eviction" | "fairHousing");
        // Smooth scroll to tools section if modal opens
        setTimeout(() => {
          document.querySelector('[data-tools-section]')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        // Clear modal if no hash
        setActiveModal(null);
      }
    };

    // Check on initial render
    checkAndOpenModal();

    // Use popstate event which fires for hash changes in Next.js
    window.addEventListener("popstate", checkAndOpenModal);
    
    // Also check periodically for hash changes (fallback)
    const interval = setInterval(checkAndOpenModal, 100);
    
    return () => {
      window.removeEventListener("popstate", checkAndOpenModal);
      clearInterval(interval);
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/compliance/obligations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchObligations();
    } catch (e) {
      console.error("Error updating status:", e);
    }
  };

  const userRole = (session?.user as { id?: string; role?: string } | undefined)?.role ?? "";
  const isManager = ["admin", "super_admin", "manager"].includes(userRole);

  const filteredObligations = obligations.filter((o) => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (filterSeverity !== "all" && o.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                isLight ? "bg-violet-100" : "bg-violet-500/20"
              )}
            >
              <Shield className={cn("h-5 w-5", isLight ? "text-violet-600" : "text-violet-400")} />
            </div>
            <h1 className={cn("text-2xl font-semibold tracking-tight", isLight ? "text-slate-900" : "text-white")}>
              Compliance Hub
            </h1>
          </div>
          <p className={cn("mt-1 text-sm", isLight ? "text-slate-500" : "text-white/50")}>
            Track regulatory obligations, calculate rent increases, and ensure fair housing compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchObligations}
            className={cn(
              "h-9 rounded-xl px-3",
              isLight ? "text-slate-600 hover:bg-slate-100" : "text-white/70 hover:bg-white/10"
            )}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isManager && (
            <Button
              size="sm"
              onClick={() => setActiveModal("addObligation")}
              className="h-9 rounded-xl bg-violet-600 px-3 text-white hover:bg-violet-700"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Obligation
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Total" value={stats.total} icon={FileText} colorClass={isLight ? "text-slate-700" : "text-white"} isLight={isLight} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} colorClass="text-amber-500" isLight={isLight} />
        <StatCard label="In Progress" value={stats.in_progress} icon={TrendingUp} colorClass="text-blue-500" isLight={isLight} />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} colorClass="text-emerald-500" isLight={isLight} />
        <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} colorClass="text-red-500" isLight={isLight} />
        <StatCard label="Critical" value={stats.critical} icon={AlertTriangle} colorClass="text-red-500" isLight={isLight} />
        <StatCard label="High" value={stats.high} icon={AlertTriangle} colorClass="text-orange-500" isLight={isLight} />
      </div>

      {/* Tools Grid */}
      <div data-tools-section>
        <h2 className={cn("mb-3 text-sm font-semibold uppercase tracking-wider", isLight ? "text-slate-500" : "text-white/50")}>
          Compliance Tools
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            [
              {
                id: "rent" as const,
                icon: Calculator,
                title: "Rent Increase Calculator",
                description: "Verify proposed rent increases comply with state regulations and calculate proper notice periods",
                color: isLight ? "from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-700" : "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
              },
              {
                id: "eviction" as const,
                icon: Gavel,
                title: "Eviction Workflow Builder",
                description: "Step-by-step eviction procedures with state-specific legal requirements and required documents",
                color: isLight ? "from-orange-50 to-orange-100/50 border-orange-200 text-orange-700" : "from-orange-500/10 to-orange-600/5 border-orange-500/20 text-orange-400",
              },
              {
                id: "fairHousing" as const,
                icon: Eye,
                title: "Fair Housing Guardrails",
                description: "Scan listings and communications for discriminatory language before publishing",
                color: isLight ? "from-violet-50 to-violet-100/50 border-violet-200 text-violet-700" : "from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-400",
              },
            ] as const
          ).map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveModal(tool.id)}
                className={cn(
                  "group rounded-2xl border bg-gradient-to-br p-4 text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-md",
                  tool.color
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <ChevronRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-0.5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold">{tool.title}</h3>
                <p className={cn("mt-1 text-xs leading-relaxed", isLight ? "text-current opacity-70" : "opacity-60")}>
                  {tool.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Obligations List */}
      <div>
        <div className="mb-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={cn("text-sm font-semibold uppercase tracking-wider", isLight ? "text-slate-500" : "text-white/50")}>
              Compliance Obligations
            </h2>
            <div className="flex items-center gap-1.5">
              <Filter className={cn("h-3.5 w-3.5", isLight ? "text-slate-400" : "text-white/40")} />
              {["all", "pending", "in_progress", "overdue", "completed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                    filterStatus === s
                      ? isLight
                        ? "bg-slate-800 text-white"
                        : "bg-white/15 text-white"
                      : isLight
                      ? "text-slate-500 hover:bg-slate-100"
                      : "text-white/50 hover:bg-white/10"
                  )}
                >
                  {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-xs font-medium", isLight ? "text-slate-400" : "text-white/40")}>Urgency:</span>
            {["all", "critical", "high", "medium", "low"].map((sv) => (
              <button
                key={sv}
                onClick={() => setFilterSeverity(sv)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                  filterSeverity === sv
                    ? isLight
                      ? "bg-slate-800 text-white"
                      : "bg-white/15 text-white"
                    : isLight
                    ? "text-slate-500 hover:bg-slate-100"
                    : "text-white/50 hover:bg-white/10"
                )}
              >
                {sv === "all" ? "All Urgency" : sv.charAt(0).toUpperCase() + sv.slice(1)}
              </button>
            ))}
            {properties.length > 0 && (
              <>
                <span className={cn("ml-2 text-xs font-medium", isLight ? "text-slate-400" : "text-white/40")}>Property:</span>
                <select
                  value={filterProperty}
                  onChange={(e) => setFilterProperty(e.target.value)}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-xs font-medium transition-all",
                    isLight
                      ? "border-slate-200 bg-white text-slate-700"
                      : "border-white/10 bg-white/5 text-white/70"
                  )}
                >
                  <option value="all">All Properties</option>
                  {properties.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={cn("h-16 animate-pulse rounded-xl", isLight ? "bg-slate-100" : "bg-white/[0.05]")}
              />
            ))}
          </div>
        ) : filteredObligations.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border py-12 text-center",
              isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.08] bg-white/[0.02]"
            )}
          >
            <Shield className={cn("h-10 w-10", isLight ? "text-slate-300" : "text-white/20")} />
            <p className={cn("mt-3 text-sm font-medium", isLight ? "text-slate-500" : "text-white/50")}>
              {filterStatus === "all" ? "No compliance obligations yet" : `No ${filterStatus.replace("_", " ")} obligations`}
            </p>
            {isManager && filterStatus === "all" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveModal("addObligation")}
                className={cn("mt-3 rounded-xl text-xs", isLight ? "text-violet-600 hover:bg-violet-50" : "text-violet-400 hover:bg-violet-500/10")}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add your first obligation
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredObligations.map((o) => (
              <ObligationRow
                key={o._id}
                obligation={o}
                isLight={isLight}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal === "rent" && (
        <RentCalculatorModal isLight={isLight} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "eviction" && (
        <EvictionWorkflowModal isLight={isLight} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "fairHousing" && (
        <FairHousingModal isLight={isLight} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "addObligation" && (
        <AddObligationModal
          isLight={isLight}
          onClose={() => setActiveModal(null)}
          onCreated={fetchObligations}
        />
      )}
    </div>
  );
}
