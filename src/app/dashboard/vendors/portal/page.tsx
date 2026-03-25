"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Wrench,
  Star,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Shield,
  TrendingUp,
  FileText,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";

interface IVendorJob {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  propertyId?: { name: string };
  propertyAddress?: string;
  budget?: number;
  finalCost?: number;
  scheduledDate?: string;
  bids?: Array<{ vendorId: string; amount: number; status: string }>;
  approvedDate?: string;
  createdAt: string;
}

interface IVendor {
  _id: string;
  name: string;
  contactName: string;
  email: string;
  rating: number;
  totalRatings: number;
  completedJobs: number;
  activeWorkOrders: number;
  walletBalance: number;
  totalEarnings: number;
  pendingPayout: number;
  bankAccountVerified: boolean;
  bankAccountLast4?: string;
  complianceHold: boolean;
  licenseExpiryDate?: string;
  insuranceExpiryDate?: string;
  isAvailable: boolean;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn("h-3.5 w-3.5", s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
      ))}
      <span className="ml-1 text-xs text-slate-400">{rating.toFixed(1)}</span>
    </div>
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
    payment_released: { label: "Paid", class: "bg-teal-500/10 text-teal-500" },
    cancelled: { label: "Cancelled", class: "bg-slate-500/10 text-slate-500" },
  };
  const cfg = configs[status] || { label: status, class: "bg-slate-500/10 text-slate-500" };
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium", cfg.class)}>{cfg.label}</span>
  );
}

type Tab = "active" | "marketplace" | "payments" | "profile";

export default function VendorPortalPage() {
  const { data: session } = useSession();
  const { isLight } = useDashboardAppearance();
  const [tab, setTab] = useState<Tab>("active");
  const [activeJobs, setActiveJobs] = useState<IVendorJob[]>([]);
  const [marketplaceJobs, setMarketplaceJobs] = useState<IVendorJob[]>([]);
  const [vendor, setVendor] = useState<IVendor | null>(null);
  const [wallet, setWallet] = useState<{ balance: number; totalEarnings: number; pendingPayout: number; transactions: IVendorJob[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<IVendorJob | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [completionForm, setCompletionForm] = useState({ beforePhotos: "", afterPhotos: "", vendorNotes: "", finalCost: "" });
  const [docUploadForm, setDocUploadForm] = useState({ type: "license", url: "", notes: "" });
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadMsg, setDocUploadMsg] = useState("");

  const fetchVendorData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vendors?limit=1&email=" + encodeURIComponent((session?.user as { email?: string })?.email || ""));
      if (!res.ok) return;
      const data = await res.json();
      if (data.vendors?.length > 0) {
        setVendor(data.vendors[0]);

        const walletRes = await fetch(`/api/vendors/wallet?vendorId=${data.vendors[0]._id}`);
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWallet(walletData);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  const fetchActiveJobs = useCallback(async () => {
    if (!vendor) return;
    try {
      const res = await fetch(`/api/vendors/jobs?vendorId=${vendor._id}&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      setActiveJobs(data.jobs || []);
    } catch (e) {
      console.error(e);
    }
  }, [vendor]);

  const fetchMarketplace = useCallback(async () => {
    try {
      const res = await fetch("/api/vendors/jobs?marketplace=true&limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setMarketplaceJobs(data.jobs || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchVendorData();
  }, [fetchVendorData]);

  useEffect(() => {
    if (tab === "active") fetchActiveJobs();
    if (tab === "marketplace") fetchMarketplace();
  }, [tab, fetchActiveJobs, fetchMarketplace]);

  const handleStatusUpdate = async (jobId: string, action: string, extra?: Record<string, unknown>) => {
    setStatusUpdateLoading(true);
    try {
      const res = await fetch(`/api/vendors/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        fetchActiveJobs();
        setSelectedJob(null);
        setCompletionForm({ beforePhotos: "", afterPhotos: "", vendorNotes: "", finalCost: "" });
      } else {
        const data = await res.json();
        alert(data.error || "Action failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleDocUpload = async () => {
    if (!vendor || !docUploadForm.url) return;
    setDocUploading(true);
    setDocUploadMsg("");
    try {
      const res = await fetch(`/api/vendors/${vendor._id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: docUploadForm.type,
          url: docUploadForm.url,
          notes: docUploadForm.notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDocUploadMsg(data.complianceHold ? "Uploaded — compliance review pending" : "Document uploaded successfully");
        setDocUploadForm({ type: "license", url: "", notes: "" });
        fetchVendorData();
      } else {
        setDocUploadMsg(data.error || "Upload failed");
      }
    } catch {
      setDocUploadMsg("Upload failed");
    } finally {
      setDocUploading(false);
    }
  };

  const handleSubmitBid = async (jobId: string) => {
    if (!vendor || !bidAmount) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/vendors/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_bid",
          vendorId: vendor._id,
          amount: Number(bidAmount),
          notes: bidNotes,
        }),
      });
      if (res.ok) {
        setBidAmount("");
        setBidNotes("");
        setSelectedJob(null);
        fetchMarketplace();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit bid");
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

  if (!vendor && !loading) {
    return (
      <div className={cn("flex flex-col items-center justify-center rounded-2xl border py-24 text-center", isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.08] bg-white/[0.02]")}>
        <Wrench className={cn("h-16 w-16", isLight ? "text-slate-300" : "text-white/20")} />
        <p className={cn("mt-4 text-base font-semibold", isLight ? "text-slate-500" : "text-white/50")}>
          No Vendor Profile Found
        </p>
        <p className={cn("mt-2 max-w-sm text-sm", isLight ? "text-slate-400" : "text-white/40")}>
          Contact your property manager to register you as a vendor in the system.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", isLight ? "bg-amber-100" : "bg-amber-500/20")}>
              <Wrench className={cn("h-5 w-5", isLight ? "text-amber-600" : "text-amber-400")} />
            </div>
            <h1 className={cn("text-2xl font-semibold tracking-tight", isLight ? "text-slate-900" : "text-white")}>
              Vendor Portal
            </h1>
          </div>
          {vendor && (
            <p className={cn("mt-1 text-sm", isLight ? "text-slate-500" : "text-white/50")}>
              {vendor.name} · {vendor.isAvailable ? "Available" : "Busy"}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchVendorData}
          className={cn("h-9 rounded-xl px-3", isLight ? "text-slate-600 hover:bg-slate-100" : "text-white/70 hover:bg-white/10")}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      {vendor && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Rating", value: vendor.rating.toFixed(1), icon: Star, color: "text-amber-500" },
            { label: "Completed", value: vendor.completedJobs, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Active Jobs", value: vendor.activeWorkOrders, icon: Clock, color: "text-blue-500" },
            { label: "Wallet", value: `$${(wallet?.balance || 0).toLocaleString()}`, icon: DollarSign, color: "text-teal-500" },
          ].map((stat) => (
            <div key={stat.label} className={cn("rounded-2xl border p-4", isLight ? "border-slate-200 bg-white" : "border-white/[0.08] bg-white/[0.04]")}>
              <div className="flex items-center justify-between">
                <p className={cn("text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-400" : "text-white/40")}>{stat.label}</p>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <p className={cn("mt-2 text-2xl font-semibold", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Compliance status */}
      {vendor?.complianceHold && (
        <div className={cn("flex items-start gap-3 rounded-2xl border p-4", isLight ? "border-red-200 bg-red-50" : "border-red-500/20 bg-red-500/10")}>
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-500">Compliance Hold — Cannot Accept Jobs</p>
            <p className="mt-1 text-xs text-red-400">Contact your property manager to resolve credential issues before accepting new work.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={cn("flex gap-1 rounded-2xl p-1", isLight ? "bg-slate-100" : "bg-white/[0.05]")}>
        {(
          [
            { id: "active" as Tab, label: "My Jobs", icon: Wrench },
            { id: "marketplace" as Tab, label: "Marketplace", icon: TrendingUp },
            { id: "payments" as Tab, label: "Payments", icon: DollarSign },
            { id: "profile" as Tab, label: "Profile", icon: Shield },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-all",
              tab === id
                ? isLight ? "bg-white text-slate-900 shadow-sm" : "bg-white/[0.1] text-white"
                : isLight ? "text-slate-500 hover:text-slate-700" : "text-white/50 hover:text-white/70"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Active Jobs Tab */}
      {tab === "active" && (
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={cn("h-20 animate-pulse rounded-xl", isLight ? "bg-slate-100" : "bg-white/[0.05]")} />
              ))}
            </div>
          ) : activeJobs.length === 0 ? (
            <div className={cn("flex flex-col items-center justify-center rounded-2xl border py-12 text-center", isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.08] bg-white/[0.02]")}>
              <Wrench className={cn("h-10 w-10", isLight ? "text-slate-300" : "text-white/20")} />
              <p className={cn("mt-3 text-sm font-medium", isLight ? "text-slate-500" : "text-white/50")}>No active jobs</p>
              <p className={cn("mt-1 text-xs", isLight ? "text-slate-400" : "text-white/40")}>Browse the marketplace to find work</p>
            </div>
          ) : (
            activeJobs.map((job) => (
              <button
                key={job._id}
                onClick={() => setSelectedJob(job)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all",
                  isLight ? "border-slate-200 bg-white hover:shadow-sm" : "border-white/[0.08] bg-white/[0.04] hover:border-white/[0.14]"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("truncate text-sm font-medium", isLight ? "text-slate-900" : "text-white")}>{job.title}</p>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                    <span className={cn("rounded-md px-1.5 py-0.5", isLight ? "bg-amber-50 text-amber-700" : "bg-amber-500/10 text-amber-400")}>{job.category}</span>
                    {job.propertyId && <span className={isLight ? "text-slate-500" : "text-white/50"}>{job.propertyId.name}</span>}
                    {job.finalCost && <span className="font-medium text-emerald-500">${job.finalCost.toLocaleString()}</span>}
                  </div>
                </div>
                <ChevronRight className={cn("h-4 w-4 shrink-0", isLight ? "text-slate-400" : "text-white/40")} />
              </button>
            ))
          )}
        </div>
      )}

      {/* Marketplace Tab */}
      {tab === "marketplace" && (
        <div className="space-y-3">
          {vendor?.complianceHold && (
            <div className={cn("rounded-xl border p-3 text-xs", isLight ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-500/20 bg-amber-500/10 text-amber-400")}>
              <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
              You are on compliance hold. Resolve your credentials before submitting bids.
            </div>
          )}
          {marketplaceJobs.length === 0 ? (
            <div className={cn("flex flex-col items-center justify-center rounded-2xl border py-12 text-center", isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.08] bg-white/[0.02]")}>
              <TrendingUp className={cn("h-10 w-10", isLight ? "text-slate-300" : "text-white/20")} />
              <p className={cn("mt-3 text-sm font-medium", isLight ? "text-slate-500" : "text-white/50")}>No open jobs in marketplace</p>
            </div>
          ) : (
            marketplaceJobs.map((job) => (
              <div
                key={job._id}
                className={cn("rounded-xl border p-4", isLight ? "border-slate-200 bg-white" : "border-white/[0.08] bg-white/[0.04]")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-semibold", isLight ? "text-slate-900" : "text-white")}>{job.title}</p>
                    <p className={cn("mt-1 line-clamp-2 text-xs leading-relaxed", isLight ? "text-slate-500" : "text-white/50")}>{job.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={cn("rounded-md px-1.5 py-0.5 font-medium", isLight ? "bg-amber-50 text-amber-700" : "bg-amber-500/10 text-amber-400")}>{job.category}</span>
                      {job.propertyId && (
                        <span className={cn("flex items-center gap-0.5", isLight ? "text-slate-500" : "text-white/50")}>
                          <MapPin className="h-3 w-3" />
                          {job.propertyId.name}
                        </span>
                      )}
                      {job.budget && (
                        <span className={cn("font-medium", isLight ? "text-slate-600" : "text-white/60")}>
                          Budget: ${job.budget.toLocaleString()}
                        </span>
                      )}
                      <span className={isLight ? "text-slate-400" : "text-white/40"}>{new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                {!vendor?.complianceHold && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      className={cn("h-8 flex-1 rounded-lg border px-2 text-xs", isLight ? "border-slate-200 bg-white" : "border-white/10 bg-white/5 text-white")}
                      placeholder="Your bid amount ($)"
                      value={selectedJob?._id === job._id ? bidAmount : ""}
                      onFocus={() => setSelectedJob(job)}
                      onChange={(e) => { setSelectedJob(job); setBidAmount(e.target.value); }}
                    />
                    <Button
                      size="sm"
                      disabled={submitting || selectedJob?._id !== job._id || !bidAmount}
                      onClick={() => handleSubmitBid(job._id)}
                      className="h-8 rounded-lg bg-amber-500 px-3 text-xs text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      Bid
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Payments Tab */}
      {tab === "payments" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Available Balance", value: wallet?.balance || 0, color: "text-teal-500" },
              { label: "Pending Payout", value: wallet?.pendingPayout || 0, color: "text-amber-500" },
              { label: "Total Earned", value: wallet?.totalEarnings || 0, color: "text-emerald-500" },
            ].map((item) => (
              <div key={item.label} className={cn("rounded-2xl border p-4", isLight ? "border-slate-200 bg-white" : "border-white/[0.08] bg-white/[0.04]")}>
                <p className={cn("text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-400" : "text-white/40")}>{item.label}</p>
                <p className={cn("mt-2 text-2xl font-semibold", item.color)}>${item.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {vendor && !vendor.bankAccountVerified && (
            <div className={cn("rounded-xl border p-4 text-xs", isLight ? "border-amber-200 bg-amber-50" : "border-amber-500/20 bg-amber-500/10")}>
              <p className={cn("font-semibold", isLight ? "text-amber-700" : "text-amber-400")}>Connect Bank Account for Payouts</p>
              <p className={cn("mt-1", isLight ? "text-amber-600" : "text-amber-500/80")}>Contact your property manager to add and verify your bank account for same-day ACH payouts.</p>
            </div>
          )}

          {vendor?.bankAccountVerified && vendor.bankAccountLast4 && (
            <div className={cn("rounded-xl border p-3 text-xs", isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.08] bg-white/[0.04]")}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className={cn("font-medium", isLight ? "text-slate-700" : "text-white/80")}>Bank account on file ending in {vendor.bankAccountLast4}</p>
              </div>
            </div>
          )}

          <div>
            <h3 className={cn("mb-3 text-xs font-semibold uppercase tracking-wider", isLight ? "text-slate-400" : "text-white/40")}>Recent Transactions</h3>
            <div className="space-y-2">
              {(wallet?.transactions || []).length === 0 ? (
                <p className={cn("text-sm", isLight ? "text-slate-400" : "text-white/40")}>No transactions yet</p>
              ) : (
                (wallet?.transactions || []).map((txn: IVendorJob) => (
                  <div key={txn._id} className={cn("flex items-center justify-between rounded-xl border p-3 text-xs", isLight ? "border-slate-200 bg-white" : "border-white/[0.08] bg-white/[0.04]")}>
                    <div>
                      <p className={cn("font-medium", isLight ? "text-slate-700" : "text-white/80")}>{txn.title}</p>
                      <p className={isLight ? "text-slate-400" : "text-white/40"}>
                        {txn.approvedDate ? new Date(txn.approvedDate).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-500">+${(txn.finalCost || 0).toLocaleString()}</p>
                      <JobStatusBadge status={txn.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {tab === "profile" && vendor && (
        <div className="space-y-4">
          <div className={cn("rounded-2xl border p-5", isLight ? "border-slate-200 bg-white" : "border-white/[0.08] bg-white/[0.04]")}>
            <div className="flex items-start justify-between">
              <div>
                <p className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>{vendor.name}</p>
                <p className={cn("text-sm", isLight ? "text-slate-500" : "text-white/50")}>{vendor.contactName}</p>
                <p className={cn("text-xs", isLight ? "text-slate-400" : "text-white/40")}>{vendor.email}</p>
              </div>
              <div className={cn("rounded-xl px-2 py-1 text-xs font-medium", vendor.complianceHold ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500")}>
                {vendor.complianceHold ? "On Hold" : "Verified"}
              </div>
            </div>
            <div className="mt-4">
              <StarRating rating={vendor.rating} />
            </div>
          </div>

          <div className={cn("rounded-2xl border p-4", isLight ? "border-slate-200 bg-white" : "border-white/[0.08] bg-white/[0.04]")}>
            <h3 className={cn("mb-3 text-xs font-semibold uppercase tracking-wider", isLight ? "text-slate-400" : "text-white/40")}>Credentials</h3>
            <div className="space-y-2 text-xs">
              {[
                { label: "License Expiry", value: vendor.licenseExpiryDate },
                { label: "Insurance Expiry", value: vendor.insuranceExpiryDate },
              ].map((item) => (
                item.value ? (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className={isLight ? "text-slate-500" : "text-white/50"}>{item.label}</span>
                    <span className={cn(
                      "font-medium",
                      new Date(item.value) < new Date() ? "text-red-500" : "text-emerald-500"
                    )}>
                      {new Date(item.value).toLocaleDateString()}
                      {new Date(item.value) < new Date() && " — Expired"}
                    </span>
                  </div>
                ) : null
              ))}
            </div>
          </div>

          <div className={cn("rounded-2xl border p-4", isLight ? "border-slate-200 bg-white" : "border-white/[0.08] bg-white/[0.04]")}>
            <h3 className={cn("mb-3 text-xs font-semibold uppercase tracking-wider", isLight ? "text-slate-400" : "text-white/40")}>Upload Credentials</h3>
            <div className="space-y-3">
              <div>
                <label className={cn("mb-1 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Document Type</label>
                <select
                  className={cn(inputClass, "appearance-none")}
                  value={docUploadForm.type}
                  onChange={(e) => setDocUploadForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {["license", "insurance", "background_check", "certification", "w9", "other"].map((t) => (
                    <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={cn("mb-1 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Document URL *</label>
                <input
                  type="url"
                  className={inputClass}
                  placeholder="https://drive.google.com/..."
                  value={docUploadForm.url}
                  onChange={(e) => setDocUploadForm((f) => ({ ...f, url: e.target.value }))}
                />
              </div>
              <div>
                <label className={cn("mb-1 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Notes (optional)</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Expires Jan 2027"
                  value={docUploadForm.notes}
                  onChange={(e) => setDocUploadForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {docUploadMsg && (
                <p className={cn("text-xs", docUploadMsg.includes("success") || docUploadMsg.includes("Uploaded") ? "text-emerald-500" : "text-red-500")}>
                  {docUploadMsg}
                </p>
              )}
              <Button
                size="sm"
                disabled={docUploading || !docUploadForm.url}
                onClick={handleDocUpload}
                className="w-full rounded-xl bg-violet-600 text-white hover:bg-violet-700 text-xs disabled:opacity-50"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                {docUploading ? "Uploading..." : "Submit Document"}
              </Button>
            </div>
          </div>

          <div className={cn("rounded-xl border p-3 text-xs", isLight ? "border-slate-200 bg-slate-50 text-slate-500" : "border-white/[0.08] bg-white/[0.03] text-white/40")}>
            <FileText className="mr-1.5 inline h-3.5 w-3.5" />
            To update your profile or bank account details, contact your property manager.
          </div>
        </div>
      )}

      {/* Job Action Modal */}
      {selectedJob && tab === "active" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={cn("absolute inset-0 backdrop-blur-sm", isLight ? "bg-slate-900/30" : "bg-black/60")} onClick={() => setSelectedJob(null)} />
          <div className={cn("relative w-full max-w-md overflow-y-auto rounded-2xl border shadow-2xl max-h-[80vh]", isLight ? "border-slate-200 bg-white" : "border-white/[0.12] bg-slate-900")}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: isLight ? "rgb(226 232 240)" : "rgba(255,255,255,0.08)" }}>
              <div>
                <h2 className={cn("text-sm font-semibold", isLight ? "text-slate-900" : "text-white")}>{selectedJob.title}</h2>
                <JobStatusBadge status={selectedJob.status} />
              </div>
              <button onClick={() => setSelectedJob(null)} className={cn("rounded-lg p-1.5", isLight ? "text-slate-400 hover:bg-slate-100" : "text-white/50 hover:bg-white/10")}>
                ✕
              </button>
            </div>
            <div className="space-y-4 p-5">
              <p className={cn("text-sm", isLight ? "text-slate-600" : "text-white/60")}>{selectedJob.description}</p>

              <div className="flex flex-wrap gap-2">
                {selectedJob.status === "dispatched" && (
                  <>
                    <Button size="sm" disabled={statusUpdateLoading} onClick={() => handleStatusUpdate(selectedJob._id, "accept")} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
                      Accept Job
                    </Button>
                    <Button size="sm" variant="ghost" disabled={statusUpdateLoading} onClick={() => handleStatusUpdate(selectedJob._id, "decline")} className={cn("rounded-xl border text-xs text-red-500", isLight ? "border-slate-200" : "border-white/10")}>
                      Decline
                    </Button>
                  </>
                )}
                {selectedJob.status === "accepted" && (
                  <Button size="sm" disabled={statusUpdateLoading} onClick={() => handleStatusUpdate(selectedJob._id, "en_route")} className="rounded-xl bg-sky-600 text-white hover:bg-sky-700 text-xs">
                    En Route
                  </Button>
                )}
                {selectedJob.status === "en_route" && (
                  <Button size="sm" disabled={statusUpdateLoading} onClick={() => handleStatusUpdate(selectedJob._id, "on_site")} className="rounded-xl bg-orange-500 text-white hover:bg-orange-600 text-xs">
                    Arrived On Site
                  </Button>
                )}
                {selectedJob.status === "on_site" && (
                  <Button size="sm" disabled={statusUpdateLoading} onClick={() => handleStatusUpdate(selectedJob._id, "start_work")} className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-xs">
                    Start Work
                  </Button>
                )}
                {selectedJob.status === "work_started" && (
                  <div className="w-full space-y-3">
                    <p className={cn("text-xs font-semibold uppercase tracking-wider", isLight ? "text-slate-400" : "text-white/40")}>Complete Job</p>
                    <div>
                      <label className={cn("mb-1 block text-xs", isLight ? "text-slate-500" : "text-white/50")}>Before Photo URLs (comma-separated)</label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="https://... , https://..."
                        value={completionForm.beforePhotos}
                        onChange={(e) => setCompletionForm((f) => ({ ...f, beforePhotos: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={cn("mb-1 block text-xs", isLight ? "text-slate-500" : "text-white/50")}>After Photo URLs (comma-separated)</label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="https://... , https://..."
                        value={completionForm.afterPhotos}
                        onChange={(e) => setCompletionForm((f) => ({ ...f, afterPhotos: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={cn("mb-1 block text-xs", isLight ? "text-slate-500" : "text-white/50")}>Final Cost ($)</label>
                        <input
                          type="number"
                          className={inputClass}
                          placeholder="0.00"
                          value={completionForm.finalCost}
                          onChange={(e) => setCompletionForm((f) => ({ ...f, finalCost: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className={cn("mb-1 block text-xs", isLight ? "text-slate-500" : "text-white/50")}>Vendor Notes</label>
                        <input
                          type="text"
                          className={inputClass}
                          placeholder="Optional notes"
                          value={completionForm.vendorNotes}
                          onChange={(e) => setCompletionForm((f) => ({ ...f, vendorNotes: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={statusUpdateLoading}
                      onClick={() => handleStatusUpdate(selectedJob._id, "complete", {
                        beforePhotos: completionForm.beforePhotos.split(",").map((s) => s.trim()).filter(Boolean),
                        afterPhotos: completionForm.afterPhotos.split(",").map((s) => s.trim()).filter(Boolean),
                        vendorNotes: completionForm.vendorNotes || undefined,
                        finalCost: completionForm.finalCost ? Number(completionForm.finalCost) : undefined,
                      })}
                      className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Submit Completion
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
