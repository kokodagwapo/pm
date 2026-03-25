"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Store,
  Plus,
  Star,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  Briefcase,
  Wrench,
  ChevronRight,
  RefreshCw,
  X,
  MapPin,
  Shield,
  DollarSign,
  Zap,
  Eye,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";

const CATEGORIES = [
  "All",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Appliances",
  "Flooring",
  "Roofing",
  "Painting",
  "Landscaping",
  "Pest Control",
  "Cleaning",
  "Security",
  "General",
  "Structural",
  "Windows",
  "Doors",
];

const JOB_STATUSES = [
  { value: "all", label: "All Jobs" },
  { value: "open", label: "Open" },
  { value: "dispatched", label: "Dispatched" },
  { value: "accepted", label: "Accepted" },
  { value: "en_route", label: "En Route" },
  { value: "on_site", label: "On Site" },
  { value: "work_started", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "approved", label: "Approved" },
  { value: "payment_released", label: "Paid" },
];

interface IVendor {
  _id: string;
  name: string;
  contactName: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  categories: string[];
  isApproved: boolean;
  isAvailable: boolean;
  rating: number;
  totalRatings: number;
  responseTimeHours: number;
  hourlyRate?: number;
  completedJobs: number;
  activeWorkOrders: number;
  complianceHold: boolean;
  complianceHoldReason?: string;
  licenseExpiryDate?: string;
  insuranceExpiryDate?: string;
  bio?: string;
}

interface IVendorJob {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  propertyId?: { _id: string; name: string };
  assignedVendorId?: { _id: string; name: string; rating: number };
  budget?: number;
  finalCost?: number;
  scheduledDate?: string;
  completedDate?: string;
  bids?: Array<{ vendorId: string; vendorName: string; amount: number; status: string }>;
  dispatchLog?: Array<{ vendorName: string; dispatchedAt: string; response?: string }>;
  createdAt: string;
}

interface IProperty {
  _id: string;
  name: string;
}

function StarRating({ rating, total }: { rating: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "h-3 w-3",
            s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"
          )}
        />
      ))}
      <span className="ml-1 text-xs text-slate-500">
        {rating.toFixed(1)} ({total})
      </span>
    </div>
  );
}

function ComplianceBadge({ vendor, isLight }: { vendor: IVendor; isLight: boolean }) {
  if (vendor.complianceHold) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-500">
        <AlertTriangle className="h-3 w-3" />
        On Hold
      </span>
    );
  }
  if (!vendor.isApproved) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium", isLight ? "bg-amber-100 text-amber-700" : "bg-amber-500/10 text-amber-400")}>
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-500">
      <Shield className="h-3 w-3" />
      Verified
    </span>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; class: string }> = {
    open: { label: "Open", class: "bg-blue-500/10 text-blue-500" },
    dispatched: { label: "Dispatched", class: "bg-violet-500/10 text-violet-500" },
    accepted: { label: "Accepted", class: "bg-emerald-500/10 text-emerald-500" },
    en_route: { label: "En Route", class: "bg-sky-500/10 text-sky-500" },
    on_site: { label: "On Site", class: "bg-orange-500/10 text-orange-500" },
    work_started: { label: "In Progress", class: "bg-amber-500/10 text-amber-500" },
    completed: { label: "Completed", class: "bg-emerald-500/10 text-emerald-600" },
    approved: { label: "Approved", class: "bg-green-500/10 text-green-600" },
    revision_requested: { label: "Revision", class: "bg-red-500/10 text-red-500" },
    payment_released: { label: "Paid", class: "bg-teal-500/10 text-teal-500" },
    cancelled: { label: "Cancelled", class: "bg-slate-500/10 text-slate-500" },
  };
  const cfg = configs[status] || { label: status, class: "bg-slate-500/10 text-slate-500" };
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium", cfg.class)}>
      {cfg.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    emergency: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full", colors[priority] || "bg-slate-400")} />;
}

type Tab = "marketplace" | "jobs" | "vendors";

export default function VendorsPage() {
  const { data: session } = useSession();
  const { isLight } = useDashboardAppearance();
  const [tab, setTab] = useState<Tab>("marketplace");
  const [vendors, setVendors] = useState<IVendor[]>([]);
  const [jobs, setJobs] = useState<IVendorJob[]>([]);
  const [properties, setProperties] = useState<IProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState<IVendor | null>(null);
  const [selectedJob, setSelectedJob] = useState<IVendorJob | null>(null);
  const [showPostJob, setShowPostJob] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: "",
    description: "",
    category: "Plumbing",
    priority: "medium",
    propertyId: "",
    budget: "",
    scheduledDate: "",
    isInstantDispatch: false,
    isPublicToMarketplace: true,
    managerNotes: "",
  });
  const [vendorForm, setVendorForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    categories: [] as string[],
    hourlyRate: "",
    licenseNumber: "",
    licenseExpiryDate: "",
    insuranceProvider: "",
    insuranceExpiryDate: "",
    bio: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const userRole = (session?.user as { role?: string } | undefined)?.role ?? "";
  const isManager = ["admin", "super_admin", "manager"].includes(userRole);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "All") params.set("category", categoryFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/vendors?${params}&limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      setVendors(data.vendors || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (jobStatusFilter !== "all") params.set("status", jobStatusFilter);
      const res = await fetch(`/api/vendors/jobs?${params}&limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [jobStatusFilter]);

  useEffect(() => {
    fetch("/api/properties?limit=100")
      .then((r) => r.json())
      .then((d) => setProperties(d.properties || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "marketplace" || tab === "vendors") fetchVendors();
    if (tab === "jobs") fetchJobs();
  }, [tab, fetchVendors, fetchJobs]);

  const handleRunComplianceCheck = async (vendorId: string) => {
    try {
      const res = await fetch(`/api/vendors/${vendorId}/compliance-check`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        fetchVendors();
        if (selectedVendor?._id === vendorId) {
          setSelectedVendor(data.vendor);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveVendor = async (vendorId: string, isApproved: boolean) => {
    try {
      await fetch(`/api/vendors/${vendorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved }),
      });
      fetchVendors();
      if (selectedVendor?._id === vendorId) {
        setSelectedVendor((v) => v ? { ...v, isApproved } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDispatch = async (jobId: string, vendorId?: string) => {
    try {
      const job = jobs.find((j) => j._id === jobId);
      if (!job) return;
      const res = await fetch("/api/vendors/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          category: job.category,
          preferredVendorId: vendorId,
        }),
      });
      if (res.ok) {
        fetchJobs();
        setSelectedJob(null);
      } else {
        const data = await res.json();
        alert(data.error || "Dispatch failed");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleJobAction = async (jobId: string, action: string, extra?: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/vendors/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        fetchJobs();
        const data = await res.json();
        setSelectedJob(data.job);
      } else {
        const data = await res.json();
        alert(data.error || "Action failed");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostJob = async () => {
    if (!jobForm.title || !jobForm.description || !jobForm.propertyId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendors/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...jobForm,
          budget: jobForm.budget ? Number(jobForm.budget) : undefined,
        }),
      });
      if (res.ok) {
        setShowPostJob(false);
        setJobForm({
          title: "",
          description: "",
          category: "Plumbing",
          priority: "medium",
          propertyId: "",
          budget: "",
          scheduledDate: "",
          isInstantDispatch: false,
          isPublicToMarketplace: true,
          managerNotes: "",
        });
        setTab("jobs");
        fetchJobs();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to post job");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVendor = async () => {
    if (!vendorForm.name || !vendorForm.contactName || !vendorForm.email || !vendorForm.categories.length)
      return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...vendorForm,
          hourlyRate: vendorForm.hourlyRate ? Number(vendorForm.hourlyRate) : undefined,
        }),
      });
      if (res.ok) {
        setShowAddVendor(false);
        fetchVendors();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add vendor");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = cn(
    "w-full rounded-xl border px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
    isLight
      ? "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-400 focus:ring-violet-400/20"
      : "border-white/[0.12] bg-white/[0.06] text-white placeholder-white/30 focus:border-violet-500/50 focus:ring-violet-500/20"
  );

  const cardBase = cn(
    "rounded-2xl border p-4 transition-all duration-200",
    isLight ? "border-slate-200 bg-white" : "border-white/[0.08] bg-white/[0.04]"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", isLight ? "bg-amber-100" : "bg-amber-500/20")}>
              <Store className={cn("h-5 w-5", isLight ? "text-amber-600" : "text-amber-400")} />
            </div>
            <h1 className={cn("text-2xl font-semibold tracking-tight", isLight ? "text-slate-900" : "text-white")}>
              Vendor Marketplace
            </h1>
          </div>
          <p className={cn("mt-1 text-sm", isLight ? "text-slate-500" : "text-white/50")}>
            Browse vetted vendors, post jobs, and dispatch work orders instantly
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { if (tab === "jobs") fetchJobs(); else fetchVendors(); }}
            className={cn("h-9 rounded-xl px-3", isLight ? "text-slate-600 hover:bg-slate-100" : "text-white/70 hover:bg-white/10")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isManager && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddVendor(true)}
                className={cn("h-9 rounded-xl px-3", isLight ? "border border-slate-200 text-slate-700 hover:bg-slate-50" : "border border-white/10 text-white/70 hover:bg-white/10")}
              >
                <Users className="mr-1.5 h-4 w-4" />
                Add Vendor
              </Button>
              <Button
                size="sm"
                onClick={() => setShowPostJob(true)}
                className="h-9 rounded-xl bg-amber-500 px-3 text-white hover:bg-amber-600"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Post Job
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={cn("flex gap-1 rounded-2xl p-1", isLight ? "bg-slate-100" : "bg-white/[0.05]")}>
        {(
          [
            { id: "marketplace" as Tab, label: "Marketplace", icon: Store },
            { id: "jobs" as Tab, label: "Jobs", icon: Briefcase },
            { id: "vendors" as Tab, label: "All Vendors", icon: Users },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
              tab === id
                ? isLight
                  ? "bg-white text-slate-900 shadow-sm"
                  : "bg-white/[0.1] text-white"
                : isLight
                ? "text-slate-500 hover:text-slate-700"
                : "text-white/50 hover:text-white/70"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Marketplace Tab */}
      {tab === "marketplace" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className={cn("absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", isLight ? "text-slate-400" : "text-white/40")} />
              <input
                type="text"
                placeholder="Search vendors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchVendors()}
                className={cn(inputClass, "pl-9")}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                  categoryFilter === cat
                    ? "bg-amber-500 text-white"
                    : isLight
                    ? "border border-slate-200 bg-white text-slate-600 hover:border-amber-300"
                    : "border border-white/10 bg-white/[0.04] text-white/60 hover:border-amber-500/30"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={cn("h-40 animate-pulse rounded-2xl", isLight ? "bg-slate-100" : "bg-white/[0.05]")} />
              ))}
            </div>
          ) : vendors.filter((v) => v.isApproved).length === 0 ? (
            <div className={cn("flex flex-col items-center justify-center rounded-2xl border py-16 text-center", isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.08] bg-white/[0.02]")}>
              <Store className={cn("h-12 w-12", isLight ? "text-slate-300" : "text-white/20")} />
              <p className={cn("mt-3 text-sm font-medium", isLight ? "text-slate-500" : "text-white/50")}>
                No approved vendors found
              </p>
              {isManager && (
                <Button size="sm" variant="ghost" onClick={() => setShowAddVendor(true)} className={cn("mt-3 rounded-xl text-xs", isLight ? "text-amber-600 hover:bg-amber-50" : "text-amber-400 hover:bg-amber-500/10")}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add your first vendor
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vendors
                .filter((v) => v.isApproved)
                .map((vendor) => (
                  <button
                    key={vendor._id}
                    onClick={() => setSelectedVendor(vendor)}
                    className={cn(
                      "text-left rounded-2xl border p-4 transition-all hover:scale-[1.01]",
                      isLight ? "border-slate-200 bg-white hover:shadow-md" : "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.14]",
                      vendor.complianceHold && "border-red-300/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm font-semibold", isLight ? "text-slate-900" : "text-white")}>
                          {vendor.name}
                        </p>
                        <p className={cn("truncate text-xs", isLight ? "text-slate-500" : "text-white/50")}>
                          {vendor.contactName}
                        </p>
                      </div>
                      <ComplianceBadge vendor={vendor} isLight={isLight} />
                    </div>

                    <div className="mt-3">
                      <StarRating rating={vendor.rating} total={vendor.totalRatings} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {vendor.categories.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-xs",
                            isLight ? "bg-amber-50 text-amber-700" : "bg-amber-500/10 text-amber-400"
                          )}
                        >
                          {c}
                        </span>
                      ))}
                      {vendor.categories.length > 3 && (
                        <span className={cn("rounded-md px-1.5 py-0.5 text-xs", isLight ? "bg-slate-100 text-slate-500" : "bg-white/[0.05] text-white/40")}>
                          +{vendor.categories.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs">
                        <span className={isLight ? "text-slate-500" : "text-white/50"}>
                          {vendor.completedJobs} jobs
                        </span>
                        {vendor.hourlyRate && (
                          <span className={isLight ? "text-slate-500" : "text-white/50"}>
                            ${vendor.hourlyRate}/hr
                          </span>
                        )}
                        {vendor.city && (
                          <span className={cn("flex items-center gap-0.5", isLight ? "text-slate-400" : "text-white/40")}>
                            <MapPin className="h-3 w-3" />
                            {vendor.city}
                          </span>
                        )}
                      </div>
                      <div className={cn("flex items-center gap-1 text-xs", vendor.isAvailable ? "text-emerald-500" : isLight ? "text-slate-400" : "text-white/40")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", vendor.isAvailable ? "bg-emerald-500" : "bg-slate-400")} />
                        {vendor.isAvailable ? "Available" : "Busy"}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Jobs Tab */}
      {tab === "jobs" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className={cn("h-4 w-4", isLight ? "text-slate-400" : "text-white/40")} />
            {JOB_STATUSES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setJobStatusFilter(value)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                  jobStatusFilter === value
                    ? "bg-amber-500 text-white"
                    : isLight
                    ? "border border-slate-200 bg-white text-slate-600 hover:border-amber-300"
                    : "border border-white/10 bg-white/[0.04] text-white/60"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={cn("h-20 animate-pulse rounded-xl", isLight ? "bg-slate-100" : "bg-white/[0.05]")} />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className={cn("flex flex-col items-center justify-center rounded-2xl border py-16 text-center", isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.08] bg-white/[0.02]")}>
              <Briefcase className={cn("h-12 w-12", isLight ? "text-slate-300" : "text-white/20")} />
              <p className={cn("mt-3 text-sm font-medium", isLight ? "text-slate-500" : "text-white/50")}>
                No jobs found
              </p>
              {isManager && (
                <Button size="sm" variant="ghost" onClick={() => setShowPostJob(true)} className={cn("mt-3 rounded-xl text-xs", isLight ? "text-amber-600 hover:bg-amber-50" : "text-amber-400 hover:bg-amber-500/10")}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Post first job
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <button
                  key={job._id}
                  onClick={() => setSelectedJob(job)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all hover:scale-[1.005]",
                    isLight ? "border-slate-200 bg-white hover:shadow-sm" : "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.14]"
                  )}
                >
                  <PriorityDot priority={job.priority} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("truncate text-sm font-medium", isLight ? "text-slate-900" : "text-white")}>
                        {job.title}
                      </p>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                      <span className={cn("rounded-md px-1.5 py-0.5", isLight ? "bg-amber-50 text-amber-700" : "bg-amber-500/10 text-amber-400")}>
                        {job.category}
                      </span>
                      {job.propertyId && (
                        <span className={isLight ? "text-slate-500" : "text-white/50"}>
                          {job.propertyId.name}
                        </span>
                      )}
                      {job.assignedVendorId && (
                        <span className={isLight ? "text-slate-500" : "text-white/50"}>
                          → {job.assignedVendorId.name}
                        </span>
                      )}
                      {job.budget && (
                        <span className={isLight ? "text-slate-500" : "text-white/50"}>
                          Budget: ${job.budget.toLocaleString()}
                        </span>
                      )}
                      <span className={isLight ? "text-slate-400" : "text-white/40"}>
                        {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 shrink-0", isLight ? "text-slate-400" : "text-white/40")} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Vendors Tab */}
      {tab === "vendors" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className={cn("absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", isLight ? "text-slate-400" : "text-white/40")} />
              <input
                type="text"
                placeholder="Search all vendors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchVendors()}
                className={cn(inputClass, "pl-9")}
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={cn("h-16 animate-pulse rounded-xl", isLight ? "bg-slate-100" : "bg-white/[0.05]")} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {vendors.map((vendor) => (
                <div
                  key={vendor._id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 transition-all",
                    isLight ? "border-slate-200 bg-white" : "border-white/[0.08] bg-white/[0.04]",
                    vendor.complianceHold && "border-red-300/40"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("text-sm font-medium", isLight ? "text-slate-900" : "text-white")}>
                        {vendor.name}
                      </p>
                      <ComplianceBadge vendor={vendor} isLight={isLight} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                      <span className={isLight ? "text-slate-500" : "text-white/50"}>
                        {vendor.email}
                      </span>
                      <StarRating rating={vendor.rating} total={vendor.totalRatings} />
                      <span className={isLight ? "text-slate-400" : "text-white/40"}>
                        {vendor.completedJobs} completed
                      </span>
                    </div>
                  </div>
                  {isManager && (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRunComplianceCheck(vendor._id)}
                        className={cn("h-7 rounded-lg px-2 text-xs", isLight ? "text-slate-600 hover:bg-slate-100" : "text-white/60 hover:bg-white/10")}
                      >
                        <Shield className="mr-1 h-3 w-3" />
                        Check
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApproveVendor(vendor._id, !vendor.isApproved)}
                        className={cn(
                          "h-7 rounded-lg px-2 text-xs",
                          vendor.isApproved
                            ? "text-red-500 hover:bg-red-50"
                            : "text-emerald-600 hover:bg-emerald-50"
                        )}
                      >
                        {vendor.isApproved ? "Revoke" : "Approve"}
                      </Button>
                      <button
                        onClick={() => setSelectedVendor(vendor)}
                        className={cn("rounded-lg p-1.5", isLight ? "text-slate-400 hover:bg-slate-100" : "text-white/40 hover:bg-white/10")}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={cn("absolute inset-0 backdrop-blur-sm", isLight ? "bg-slate-900/30" : "bg-black/60")} onClick={() => setSelectedVendor(null)} />
          <div className={cn("relative w-full max-w-lg overflow-y-auto rounded-2xl border shadow-2xl max-h-[85vh]", isLight ? "border-slate-200 bg-white" : "border-white/[0.12] bg-slate-900")}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: isLight ? "rgb(226 232 240)" : "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <Wrench className={cn("h-5 w-5", isLight ? "text-amber-600" : "text-amber-400")} />
                <h2 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>{selectedVendor.name}</h2>
              </div>
              <button onClick={() => setSelectedVendor(null)} className={cn("rounded-lg p-1.5", isLight ? "text-slate-400 hover:bg-slate-100" : "text-white/50 hover:bg-white/10")}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn("text-sm font-medium", isLight ? "text-slate-700" : "text-white/80")}>{selectedVendor.contactName}</p>
                  <p className={cn("text-xs", isLight ? "text-slate-500" : "text-white/50")}>{selectedVendor.email}</p>
                  {selectedVendor.phone && <p className={cn("text-xs", isLight ? "text-slate-500" : "text-white/50")}>{selectedVendor.phone}</p>}
                </div>
                <ComplianceBadge vendor={selectedVendor} isLight={isLight} />
              </div>

              {selectedVendor.bio && (
                <p className={cn("text-xs leading-relaxed", isLight ? "text-slate-600" : "text-white/60")}>{selectedVendor.bio}</p>
              )}

              <StarRating rating={selectedVendor.rating} total={selectedVendor.totalRatings} />

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className={cn("rounded-xl p-3", isLight ? "bg-slate-50" : "bg-white/[0.04]")}>
                  <p className={isLight ? "text-slate-400" : "text-white/40"}>Completed Jobs</p>
                  <p className={cn("mt-0.5 text-lg font-semibold", isLight ? "text-slate-800" : "text-white")}>{selectedVendor.completedJobs}</p>
                </div>
                <div className={cn("rounded-xl p-3", isLight ? "bg-slate-50" : "bg-white/[0.04]")}>
                  <p className={isLight ? "text-slate-400" : "text-white/40"}>Response Time</p>
                  <p className={cn("mt-0.5 text-lg font-semibold", isLight ? "text-slate-800" : "text-white")}>{selectedVendor.responseTimeHours}h</p>
                </div>
              </div>

              <div>
                <p className={cn("mb-2 text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-400" : "text-white/40")}>Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedVendor.categories.map((c) => (
                    <span key={c} className={cn("rounded-md px-2 py-0.5 text-xs", isLight ? "bg-amber-50 text-amber-700" : "bg-amber-500/10 text-amber-400")}>{c}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className={cn("mb-2 text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-400" : "text-white/40")}>Credentials</p>
                <div className="space-y-1.5 text-xs">
                  {selectedVendor.licenseExpiryDate && (
                    <div className="flex items-center justify-between">
                      <span className={isLight ? "text-slate-500" : "text-white/50"}>License Expiry</span>
                      <span className={cn(
                        new Date(selectedVendor.licenseExpiryDate) < new Date()
                          ? "text-red-500 font-medium"
                          : isLight ? "text-slate-700" : "text-white/70"
                      )}>
                        {new Date(selectedVendor.licenseExpiryDate).toLocaleDateString()}
                        {new Date(selectedVendor.licenseExpiryDate) < new Date() && " (Expired)"}
                      </span>
                    </div>
                  )}
                  {selectedVendor.insuranceExpiryDate && (
                    <div className="flex items-center justify-between">
                      <span className={isLight ? "text-slate-500" : "text-white/50"}>Insurance Expiry</span>
                      <span className={cn(
                        new Date(selectedVendor.insuranceExpiryDate) < new Date()
                          ? "text-red-500 font-medium"
                          : isLight ? "text-slate-700" : "text-white/70"
                      )}>
                        {new Date(selectedVendor.insuranceExpiryDate).toLocaleDateString()}
                        {new Date(selectedVendor.insuranceExpiryDate) < new Date() && " (Expired)"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedVendor.complianceHold && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Compliance Hold Active
                  </div>
                  {selectedVendor.complianceHoldReason && (
                    <p className="mt-1 opacity-80">{selectedVendor.complianceHoldReason}</p>
                  )}
                </div>
              )}

              {isManager && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRunComplianceCheck(selectedVendor._id)}
                    className={cn("flex-1 rounded-xl text-xs", isLight ? "border border-slate-200 hover:bg-slate-50" : "border border-white/10 hover:bg-white/10")}
                  >
                    <Shield className="mr-1.5 h-3.5 w-3.5" />
                    Run Compliance Check
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApproveVendor(selectedVendor._id, !selectedVendor.isApproved)}
                    className={cn("flex-1 rounded-xl text-xs text-white", selectedVendor.isApproved ? "bg-red-500 hover:bg-red-600" : "bg-emerald-600 hover:bg-emerald-700")}
                  >
                    {selectedVendor.isApproved ? "Revoke Approval" : "Approve Vendor"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={cn("absolute inset-0 backdrop-blur-sm", isLight ? "bg-slate-900/30" : "bg-black/60")} onClick={() => setSelectedJob(null)} />
          <div className={cn("relative w-full max-w-lg overflow-y-auto rounded-2xl border shadow-2xl max-h-[85vh]", isLight ? "border-slate-200 bg-white" : "border-white/[0.12] bg-slate-900")}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: isLight ? "rgb(226 232 240)" : "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <PriorityDot priority={selectedJob.priority} />
                <h2 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>{selectedJob.title}</h2>
                <JobStatusBadge status={selectedJob.status} />
              </div>
              <button onClick={() => setSelectedJob(null)} className={cn("rounded-lg p-1.5", isLight ? "text-slate-400 hover:bg-slate-100" : "text-white/50 hover:bg-white/10")}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <p className={cn("text-sm leading-relaxed", isLight ? "text-slate-600" : "text-white/60")}>{selectedJob.description}</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={cn("rounded-lg p-2.5", isLight ? "bg-slate-50" : "bg-white/[0.04]")}>
                  <p className={isLight ? "text-slate-400" : "text-white/40"}>Category</p>
                  <p className={cn("font-medium", isLight ? "text-slate-700" : "text-white/80")}>{selectedJob.category}</p>
                </div>
                {selectedJob.budget && (
                  <div className={cn("rounded-lg p-2.5", isLight ? "bg-slate-50" : "bg-white/[0.04]")}>
                    <p className={isLight ? "text-slate-400" : "text-white/40"}>Budget</p>
                    <p className={cn("font-medium", isLight ? "text-slate-700" : "text-white/80")}>${selectedJob.budget.toLocaleString()}</p>
                  </div>
                )}
                {selectedJob.finalCost && (
                  <div className={cn("rounded-lg p-2.5", isLight ? "bg-slate-50" : "bg-white/[0.04]")}>
                    <p className={isLight ? "text-slate-400" : "text-white/40"}>Final Cost</p>
                    <p className={cn("font-medium", isLight ? "text-slate-700" : "text-white/80")}>${selectedJob.finalCost.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {selectedJob.assignedVendorId && (
                <div className={cn("rounded-xl border p-3 text-xs", isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.08] bg-white/[0.03]")}>
                  <p className={cn("font-medium", isLight ? "text-slate-700" : "text-white/80")}>Assigned Vendor</p>
                  <p className={isLight ? "text-slate-500" : "text-white/50"}>{selectedJob.assignedVendorId.name}</p>
                  <StarRating rating={selectedJob.assignedVendorId.rating || 0} total={0} />
                </div>
              )}

              {selectedJob.dispatchLog && selectedJob.dispatchLog.length > 0 && (
                <div>
                  <p className={cn("mb-2 text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-400" : "text-white/40")}>Dispatch Log</p>
                  <div className="space-y-1.5">
                    {selectedJob.dispatchLog.map((log, i) => (
                      <div key={i} className={cn("flex items-center justify-between rounded-lg p-2 text-xs", isLight ? "bg-slate-50" : "bg-white/[0.03]")}>
                        <span className={isLight ? "text-slate-600" : "text-white/60"}>{log.vendorName}</span>
                        <span className={cn(
                          "font-medium",
                          log.response === "accepted" ? "text-emerald-500" :
                          log.response === "declined" ? "text-red-400" :
                          isLight ? "text-slate-400" : "text-white/40"
                        )}>
                          {log.response || "Pending response"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.bids && selectedJob.bids.length > 0 && (
                <div>
                  <p className={cn("mb-2 text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-400" : "text-white/40")}>Bids ({selectedJob.bids.length})</p>
                  <div className="space-y-2">
                    {selectedJob.bids.map((bid, i) => (
                      <div key={i} className={cn("flex items-center justify-between rounded-xl border p-3 text-xs", isLight ? "border-slate-200 bg-white" : "border-white/[0.08] bg-white/[0.03]")}>
                        <div>
                          <p className={cn("font-medium", isLight ? "text-slate-700" : "text-white/80")}>{bid.vendorName}</p>
                          <p className={cn("text-emerald-600 font-semibold")}>${bid.amount.toLocaleString()}</p>
                        </div>
                        <span className={cn("rounded-md px-1.5 py-0.5 font-medium", bid.status === "accepted" ? "bg-emerald-500/10 text-emerald-500" : bid.status === "rejected" ? "bg-red-500/10 text-red-400" : isLight ? "bg-slate-100 text-slate-500" : "bg-white/[0.05] text-white/40")}>
                          {bid.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isManager && (
                <div className="flex flex-wrap gap-2">
                  {selectedJob.status === "open" && (
                    <Button size="sm" onClick={() => handleDispatch(selectedJob._id)} className="flex-1 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-xs">
                      <Zap className="mr-1.5 h-3.5 w-3.5" />
                      Auto-Dispatch
                    </Button>
                  )}
                  {selectedJob.status === "completed" && (
                    <>
                      <Button size="sm" onClick={() => handleJobAction(selectedJob._id, "approve")} className="flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleJobAction(selectedJob._id, "request_revision")} className={cn("flex-1 rounded-xl border text-xs", isLight ? "border-slate-200" : "border-white/10")}>
                        Request Revision
                      </Button>
                    </>
                  )}
                  {selectedJob.status === "approved" && (
                    <Button size="sm" onClick={() => handleJobAction(selectedJob._id, "release_payment")} className="flex-1 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-xs">
                      <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                      Release Payment
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Job Modal */}
      {showPostJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={cn("absolute inset-0 backdrop-blur-sm", isLight ? "bg-slate-900/30" : "bg-black/60")} onClick={() => setShowPostJob(false)} />
          <div className={cn("relative w-full max-w-lg overflow-y-auto rounded-2xl border shadow-2xl max-h-[90vh]", isLight ? "border-slate-200 bg-white" : "border-white/[0.12] bg-slate-900")}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: isLight ? "rgb(226 232 240)" : "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <Briefcase className={cn("h-5 w-5", isLight ? "text-amber-600" : "text-amber-400")} />
                <h2 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>Post a Job</h2>
              </div>
              <button onClick={() => setShowPostJob(false)} className={cn("rounded-lg p-1.5", isLight ? "text-slate-400 hover:bg-slate-100" : "text-white/50 hover:bg-white/10")}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Job Title *</label>
                <input type="text" className={inputClass} placeholder="e.g. Fix kitchen faucet leak" value={jobForm.title} onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Description *</label>
                <textarea className={cn(inputClass, "min-h-[80px] resize-none")} placeholder="Describe the work needed..." value={jobForm.description} onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Category *</label>
                  <select className={cn(inputClass, "appearance-none")} value={jobForm.category} onChange={(e) => setJobForm((f) => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Priority</label>
                  <select className={cn(inputClass, "appearance-none")} value={jobForm.priority} onChange={(e) => setJobForm((f) => ({ ...f, priority: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Property *</label>
                  <select className={cn(inputClass, "appearance-none")} value={jobForm.propertyId} onChange={(e) => setJobForm((f) => ({ ...f, propertyId: e.target.value }))}>
                    <option value="">Select property...</option>
                    {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Budget ($)</label>
                  <input type="number" className={inputClass} placeholder="e.g. 500" value={jobForm.budget} onChange={(e) => setJobForm((f) => ({ ...f, budget: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Scheduled Date</label>
                <input type="date" className={inputClass} value={jobForm.scheduledDate} onChange={(e) => setJobForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded" checked={jobForm.isInstantDispatch} onChange={(e) => setJobForm((f) => ({ ...f, isInstantDispatch: e.target.checked }))} />
                  <span className={cn("text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>
                    <Zap className="mr-1 inline h-3 w-3 text-amber-500" />
                    Auto-dispatch to top vendor
                  </span>
                </label>
              </div>
              <Button
                onClick={handlePostJob}
                disabled={submitting || !jobForm.title || !jobForm.description || !jobForm.propertyId}
                className="w-full rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? "Posting..." : "Post Job"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={cn("absolute inset-0 backdrop-blur-sm", isLight ? "bg-slate-900/30" : "bg-black/60")} onClick={() => setShowAddVendor(false)} />
          <div className={cn("relative w-full max-w-lg overflow-y-auto rounded-2xl border shadow-2xl max-h-[90vh]", isLight ? "border-slate-200 bg-white" : "border-white/[0.12] bg-slate-900")}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: isLight ? "rgb(226 232 240)" : "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2">
                <Users className={cn("h-5 w-5", isLight ? "text-amber-600" : "text-amber-400")} />
                <h2 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>Register Vendor</h2>
              </div>
              <button onClick={() => setShowAddVendor(false)} className={cn("rounded-lg p-1.5", isLight ? "text-slate-400 hover:bg-slate-100" : "text-white/50 hover:bg-white/10")}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Company Name *</label>
                  <input type="text" className={inputClass} placeholder="ABC Plumbing LLC" value={vendorForm.name} onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Contact Name *</label>
                  <input type="text" className={inputClass} placeholder="John Smith" value={vendorForm.contactName} onChange={(e) => setVendorForm((f) => ({ ...f, contactName: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Email *</label>
                  <input type="email" className={inputClass} placeholder="vendor@email.com" value={vendorForm.email} onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Phone</label>
                  <input type="tel" className={inputClass} placeholder="+1 (555) 000-0000" value={vendorForm.phone} onChange={(e) => setVendorForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>City</label>
                  <input type="text" className={inputClass} placeholder="Miami" value={vendorForm.city} onChange={(e) => setVendorForm((f) => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>State</label>
                  <input type="text" className={inputClass} placeholder="FL" value={vendorForm.state} onChange={(e) => setVendorForm((f) => ({ ...f, state: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Trade Categories * (select all that apply)</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setVendorForm((f) => ({
                        ...f,
                        categories: f.categories.includes(c)
                          ? f.categories.filter((x) => x !== c)
                          : [...f.categories, c],
                      }))}
                      className={cn(
                        "rounded-lg px-2 py-0.5 text-xs font-medium transition-all",
                        vendorForm.categories.includes(c)
                          ? "bg-amber-500 text-white"
                          : isLight
                          ? "border border-slate-200 text-slate-600 hover:border-amber-300"
                          : "border border-white/10 text-white/50 hover:border-amber-500/30"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>License Number</label>
                  <input type="text" className={inputClass} placeholder="LIC-12345" value={vendorForm.licenseNumber} onChange={(e) => setVendorForm((f) => ({ ...f, licenseNumber: e.target.value }))} />
                </div>
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>License Expiry</label>
                  <input type="date" className={inputClass} value={vendorForm.licenseExpiryDate} onChange={(e) => setVendorForm((f) => ({ ...f, licenseExpiryDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Insurance Provider</label>
                  <input type="text" className={inputClass} placeholder="State Farm" value={vendorForm.insuranceProvider} onChange={(e) => setVendorForm((f) => ({ ...f, insuranceProvider: e.target.value }))} />
                </div>
                <div>
                  <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Insurance Expiry</label>
                  <input type="date" className={inputClass} value={vendorForm.insuranceExpiryDate} onChange={(e) => setVendorForm((f) => ({ ...f, insuranceExpiryDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Bio / Notes</label>
                <textarea className={cn(inputClass, "min-h-[60px] resize-none")} placeholder="Brief description of services..." value={vendorForm.bio} onChange={(e) => setVendorForm((f) => ({ ...f, bio: e.target.value }))} />
              </div>
              <Button
                onClick={handleAddVendor}
                disabled={submitting || !vendorForm.name || !vendorForm.contactName || !vendorForm.email || !vendorForm.categories.length}
                className="w-full rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? "Registering..." : "Register Vendor"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
