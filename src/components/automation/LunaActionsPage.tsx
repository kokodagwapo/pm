"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bot,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Eye,
  Brain,
  Mail,
  Wrench,
  FileText,
  DollarSign,
  ChevronRight,
  XCircle,
  BarChart3,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type LunaActionCategory =
  | "payment_reminder"
  | "payment_escalation"
  | "maintenance_triage"
  | "maintenance_escalation"
  | "lease_renewal_notice"
  | "lease_expiry_alert"
  | "tenant_communication"
  | "occupancy_alert"
  | "system_digest";

type LunaActionStatus =
  | "evaluated"
  | "executed"
  | "skipped"
  | "failed"
  | "pending_human"
  | "undone";

interface LunaAction {
  _id: string;
  category: LunaActionCategory;
  status: LunaActionStatus;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  triggerEvent: string;
  triggerEntityType: string;
  actionsTaken: string[];
  notificationsSent: string[];
  humanReviewRequired: boolean;
  humanReviewNotes?: string;
  humanReviewedAt?: string;
  humanReviewedBy?: string;
  executedAt?: string;
  undoneAt?: string;
  undoneBy?: string;
  executionError?: string;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<
  LunaActionCategory,
  { label: string; icon: React.ReactNode; color: string }
> = {
  payment_reminder: { label: "Payment Reminder", icon: <DollarSign className="h-4 w-4" />, color: "text-blue-500" },
  payment_escalation: { label: "Payment Escalation", icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-500" },
  maintenance_triage: { label: "Maintenance Triage", icon: <Wrench className="h-4 w-4" />, color: "text-orange-500" },
  maintenance_escalation: { label: "Emergency Escalation", icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600" },
  lease_renewal_notice: { label: "Lease Renewal", icon: <FileText className="h-4 w-4" />, color: "text-green-500" },
  lease_expiry_alert: { label: "Lease Expiry Alert", icon: <AlertTriangle className="h-4 w-4" />, color: "text-yellow-500" },
  tenant_communication: { label: "Tenant Communication", icon: <Mail className="h-4 w-4" />, color: "text-purple-500" },
  occupancy_alert: { label: "Occupancy Alert", icon: <BarChart3 className="h-4 w-4" />, color: "text-cyan-500" },
  system_digest: { label: "System Digest", icon: <Brain className="h-4 w-4" />, color: "text-slate-500" },
};

const STATUS_CONFIG: Record<
  LunaActionStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; bg: string }
> = {
  evaluated: { label: "Evaluated", variant: "secondary", bg: "" },
  executed: { label: "Executed", variant: "default", bg: "border-green-200 bg-green-50/40 dark:bg-green-950/10" },
  skipped: { label: "Skipped", variant: "outline", bg: "" },
  failed: { label: "Failed", variant: "destructive", bg: "border-red-200 bg-red-50/40 dark:bg-red-950/10" },
  pending_human: { label: "Needs Review", variant: "secondary", bg: "border-amber-200 bg-amber-50/40 dark:bg-amber-950/10" },
  undone: { label: "Overridden", variant: "outline", bg: "border-orange-200 bg-orange-50/30 dark:bg-orange-950/10" },
};

const ALL_CATEGORIES: LunaActionCategory[] = [
  "payment_reminder", "payment_escalation", "maintenance_triage", "maintenance_escalation",
  "lease_renewal_notice", "lease_expiry_alert", "tenant_communication", "occupancy_alert", "system_digest",
];

export default function LunaActionsPage() {
  const [actions, setActions] = useState<LunaAction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialog, setDialog] = useState<{
    open: boolean;
    action: LunaAction | null;
    mode: "review" | "undo";
  }>({ open: false, action: null, mode: "review" });
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewApprove, setReviewApprove] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50", page: String(page) });
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/luna/actions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json() as {
          actions: LunaAction[];
          total: number;
          totalPages: number;
        };
        setActions(data.actions || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, page]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleSubmit = async () => {
    if (!dialog.action) return;
    setSubmitting(true);
    try {
      if (dialog.mode === "undo") {
        await fetch("/api/luna/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "undo", actionId: dialog.action._id, notes: reviewNotes }),
        });
      } else {
        await fetch("/api/luna/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "review", actionId: dialog.action._id, notes: reviewNotes, approve: reviewApprove }),
        });
      }
      setDialog({ open: false, action: null, mode: "review" });
      setReviewNotes("");
      await fetchActions();
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/automation/luna">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Luna Dashboard
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40">
            <Bot className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Autonomous Actions Log</h1>
            <p className="text-sm text-muted-foreground">
              {total} total action(s) — every trigger, decision, and outcome Luna has processed
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchActions()}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {ALL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_CONFIG[cat]?.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="executed">Executed</SelectItem>
            <SelectItem value="pending_human">Needs Review</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="undone">Overridden</SelectItem>
            <SelectItem value="evaluated">Evaluated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Actions</CardTitle>
          <CardDescription>
            Reverse-chronological. Executed actions show an Override button to log manual
            interventions. Pending actions can be approved or skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">No actions match the current filters.</p>
            </div>
          ) : (
            <div className="divide-y">
              {actions.map((action) => {
                const catConf = CATEGORY_CONFIG[action.category];
                const statusConf = STATUS_CONFIG[action.status];
                return (
                  <div
                    key={action._id}
                    className={`p-4 hover:bg-muted/20 transition-colors ${statusConf.bg}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`mt-0.5 flex-shrink-0 ${catConf?.color}`}>
                          {catConf?.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-sm">{action.title}</p>
                            <Badge variant={statusConf.variant} className="text-xs shrink-0">
                              {statusConf.label}
                            </Badge>
                            {action.humanReviewRequired && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                Review Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {action.description}
                          </p>
                          {action.executionError && (
                            <Alert className="mt-2 border-red-200 bg-red-50 dark:bg-red-950/20 py-2">
                              <AlertDescription className="text-xs text-red-700 dark:text-red-300">
                                Execution error: {action.executionError}
                              </AlertDescription>
                            </Alert>
                          )}
                          {action.undoneAt && (
                            <p className="text-xs text-orange-600 mt-1">
                              Overridden {formatTime(action.undoneAt)}
                              {action.undoneBy ? ` by ${action.undoneBy}` : ""}
                              {action.humanReviewNotes ? ` — "${action.humanReviewNotes}"` : ""}
                            </p>
                          )}
                          {action.humanReviewedAt && action.status !== "undone" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Reviewed {formatTime(action.humanReviewedAt)}
                              {action.humanReviewedBy ? ` by ${action.humanReviewedBy}` : ""}
                              {action.humanReviewNotes ? ` — "${action.humanReviewNotes}"` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {action.status === "pending_human" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-red-300 text-red-600"
                              onClick={() => {
                                setDialog({ open: true, action, mode: "review" });
                                setReviewNotes("");
                                setReviewApprove(false);
                              }}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Skip
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                setDialog({ open: true, action, mode: "review" });
                                setReviewNotes("");
                                setReviewApprove(true);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Review
                            </Button>
                          </>
                        )}
                        {action.status === "executed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-orange-300 text-orange-700"
                            onClick={() => {
                              setDialog({ open: true, action, mode: "undo" });
                              setReviewNotes("");
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Override
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        Confidence:{" "}
                        <span
                          className={`font-medium ${
                            action.confidence >= 0.85
                              ? "text-green-600"
                              : action.confidence >= 0.7
                              ? "text-amber-600"
                              : "text-red-500"
                          }`}
                        >
                          {(action.confidence * 100).toFixed(0)}%
                        </span>
                      </span>
                      {action.actionsTaken.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {action.actionsTaken.length} action(s)
                        </span>
                      )}
                      {action.notificationsSent.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3 text-blue-500" />
                          {action.notificationsSent.length} sent
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(action.createdAt)}
                      </span>
                    </div>

                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" />
                        Luna&apos;s reasoning
                      </summary>
                      <p className="text-xs text-muted-foreground mt-1.5 pl-4 border-l-2 border-muted">
                        {action.reasoning}
                      </p>
                      {action.actionsTaken.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 pl-4">
                          Actions: {action.actionsTaken.join(", ")}
                        </p>
                      )}
                    </details>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total} total
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review / Override Dialog */}
      <Dialog open={dialog.open} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "undo"
                ? "Override / Undo Action"
                : reviewApprove
                ? "Approve & Execute"
                : "Skip Action"}
            </DialogTitle>
            <DialogDescription>{dialog.action?.title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{dialog.action?.description}</p>

            {dialog.mode === "undo" ? (
              <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 dark:text-orange-200 text-xs">
                  Notifications already sent cannot be recalled. This override will be recorded
                  in the audit trail.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant={reviewApprove ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReviewApprove(true)}
                  className={reviewApprove ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Approve & Execute
                </Button>
                <Button
                  variant={!reviewApprove ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReviewApprove(false)}
                  className={!reviewApprove ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Skip
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  dialog.mode === "undo"
                    ? "Reason for overriding…"
                    : "Notes about this decision…"
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog({ open: false, action: null, mode: "review" })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className={
                dialog.mode === "undo"
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : reviewApprove
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {submitting && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {dialog.mode === "undo" ? "Confirm Override" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
