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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
  Zap,
  CheckCircle,
  AlertTriangle,
  Clock,
  Settings,
  Play,
  RefreshCw,
  Eye,
  TrendingUp,
  Shield,
  Brain,
  Mail,
  Wrench,
  FileText,
  DollarSign,
  ChevronRight,
  XCircle,
  UserCheck,
  BarChart3,
} from "lucide-react";
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
  | "pending_human";

interface LunaAutonomySettings {
  mode: "full" | "supervised" | "off";
  confidenceThreshold: number;
  enabledCategories: LunaActionCategory[];
  digestEmailEnabled: boolean;
  digestEmailFrequency: "daily" | "weekly";
  maxActionsPerHour: number;
  humanReviewThreshold: number;
}

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
  executedAt?: string;
  createdAt: string;
}

interface ActionStats {
  totalToday: number;
  totalWeek: number;
  executedToday: number;
  pendingHuman: number;
  failedTotal: number;
  successRate: number;
}

const CATEGORY_CONFIG: Record<
  LunaActionCategory,
  { label: string; icon: React.ReactNode; color: string }
> = {
  payment_reminder: {
    label: "Payment Reminder",
    icon: <DollarSign className="h-4 w-4" />,
    color: "text-blue-500",
  },
  payment_escalation: {
    label: "Payment Escalation",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-red-500",
  },
  maintenance_triage: {
    label: "Maintenance Triage",
    icon: <Wrench className="h-4 w-4" />,
    color: "text-orange-500",
  },
  maintenance_escalation: {
    label: "Emergency Escalation",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-red-600",
  },
  lease_renewal_notice: {
    label: "Lease Renewal",
    icon: <FileText className="h-4 w-4" />,
    color: "text-green-500",
  },
  lease_expiry_alert: {
    label: "Lease Expiry Alert",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-yellow-500",
  },
  tenant_communication: {
    label: "Tenant Communication",
    icon: <Mail className="h-4 w-4" />,
    color: "text-purple-500",
  },
  occupancy_alert: {
    label: "Occupancy Alert",
    icon: <BarChart3 className="h-4 w-4" />,
    color: "text-cyan-500",
  },
  system_digest: {
    label: "System Digest",
    icon: <Brain className="h-4 w-4" />,
    color: "text-slate-500",
  },
};

const STATUS_CONFIG: Record<
  LunaActionStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }
> = {
  evaluated: { label: "Evaluated", variant: "secondary", color: "text-slate-500" },
  executed: { label: "Executed", variant: "default", color: "text-green-600" },
  skipped: { label: "Skipped", variant: "outline", color: "text-slate-400" },
  failed: { label: "Failed", variant: "destructive", color: "text-red-500" },
  pending_human: { label: "Needs Review", variant: "secondary", color: "text-amber-600" },
};

const ALL_CATEGORIES: LunaActionCategory[] = [
  "payment_reminder",
  "payment_escalation",
  "maintenance_triage",
  "maintenance_escalation",
  "lease_renewal_notice",
  "lease_expiry_alert",
  "tenant_communication",
  "occupancy_alert",
  "system_digest",
];

export default function LunaAutonomousDashboard() {
  const [actions, setActions] = useState<LunaAction[]>([]);
  const [stats, setStats] = useState<ActionStats>({
    totalToday: 0,
    totalWeek: 0,
    executedToday: 0,
    pendingHuman: 0,
    failedTotal: 0,
    successRate: 0,
  });
  const [settings, setSettings] = useState<LunaAutonomySettings>({
    mode: "supervised",
    confidenceThreshold: 0.75,
    enabledCategories: [
      "payment_reminder",
      "maintenance_triage",
      "lease_renewal_notice",
      "lease_expiry_alert",
      "system_digest",
    ],
    digestEmailEnabled: true,
    digestEmailFrequency: "daily",
    maxActionsPerHour: 20,
    humanReviewThreshold: 0.6,
  });
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    action: LunaAction | null;
  }>({ open: false, action: null });
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewApprove, setReviewApprove] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterCategory && filterCategory !== "all") params.set("category", filterCategory);
      if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/luna/actions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setActions(data.actions || []);
        setStats(data.stats || stats);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/luna/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, [fetchData, fetchSettings]);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleTriggerDemo = async () => {
    setTriggering(true);
    try {
      const res = await fetch("/api/luna/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_demo" }),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setTriggering(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await fetch("/api/luna/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewDialog.action) return;
    setSubmittingReview(true);
    try {
      await fetch("/api/luna/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          actionId: reviewDialog.action._id,
          notes: reviewNotes,
          approve: reviewApprove,
        }),
      });
      setReviewDialog({ open: false, action: null });
      setReviewNotes("");
      await fetchData();
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleCategory = (cat: LunaActionCategory) => {
    setSettings((prev) => ({
      ...prev,
      enabledCategories: prev.enabledCategories.includes(cat)
        ? prev.enabledCategories.filter((c) => c !== cat)
        : [...prev.enabledCategories, cat],
    }));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const modeDescriptions: Record<string, string> = {
    full: "Luna acts autonomously on all enabled categories without human confirmation.",
    supervised:
      "Luna acts autonomously on high-confidence decisions; lower-confidence items require human review.",
    off: "Luna evaluates events and logs recommendations, but takes no autonomous actions.",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Bot className="h-10 w-10 text-rose-400 animate-pulse" />
          <p className="text-sm text-muted-foreground">Luna is initializing…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40">
            <Bot className="h-7 w-7 text-rose-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Luna Autonomous Agent</h2>
            <p className="text-sm text-muted-foreground">
              AI-driven property operations — mode:{" "}
              <span className="font-medium capitalize">{settings.mode}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleTriggerDemo}
            disabled={triggering}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {triggering ? (
              <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1.5" />
            )}
            Run Evaluation
          </Button>
        </div>
      </div>

      {/* Mode Alert */}
      {settings.mode === "off" && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Luna is in <strong>observation mode</strong>. Events are logged but no autonomous
            actions are taken.
          </AlertDescription>
        </Alert>
      )}

      {stats.pendingHuman > 0 && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>{stats.pendingHuman} action(s)</strong> are awaiting your review. Luna
            flagged these as needing human confirmation before execution.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalToday}</div>
            <p className="text-xs text-muted-foreground">{stats.executedToday} executed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWeek}</div>
            <p className="text-xs text-muted-foreground">evaluations triggered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pendingHuman}</div>
            <p className="text-xs text-muted-foreground">pending human approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(stats.successRate * 100).toFixed(1)}%
            </div>
            <Progress value={stats.successRate * 100} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="actions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="actions">Action Log</TabsTrigger>
          <TabsTrigger value="review">
            Needs Review
            {stats.pendingHuman > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-amber-600 bg-amber-100">
                {stats.pendingHuman}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Action Log Tab */}
        <TabsContent value="actions" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="executed">Executed</SelectItem>
                <SelectItem value="pending_human">Needs Review</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Autonomous Actions</CardTitle>
              <CardDescription>
                Every event Luna evaluated, with reasoning and outcome
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No actions logged yet.</p>
                  <p className="text-xs mt-1">
                    Click &quot;Run Evaluation&quot; to trigger a demo evaluation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map((action) => {
                    const catConf = CATEGORY_CONFIG[action.category];
                    const statConf = STATUS_CONFIG[action.status];
                    return (
                      <div
                        key={action._id}
                        className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                      >
                        <div className={`mt-0.5 flex-shrink-0 ${catConf?.color}`}>
                          {catConf?.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm leading-tight">{action.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {action.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant={statConf?.variant} className="text-xs">
                                {statConf?.label}
                              </Badge>
                              {action.humanReviewRequired && action.status === "pending_human" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-amber-300 text-amber-700"
                                  onClick={() => {
                                    setReviewDialog({ open: true, action });
                                    setReviewNotes("");
                                    setReviewApprove(true);
                                  }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Review
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5">
                              <Brain className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
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
                            </div>
                            {action.actionsTaken.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                <CheckCircle className="h-3 w-3 inline mr-1 text-green-500" />
                                {action.actionsTaken.length} action(s)
                              </span>
                            )}
                            {action.notificationsSent.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                <Mail className="h-3 w-3 inline mr-1 text-blue-500" />
                                {action.notificationsSent.length} notification(s)
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              <Clock className="h-3 w-3 inline mr-1" />
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
                          </details>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Human Review</CardTitle>
              <CardDescription>
                Actions where Luna&apos;s confidence was below your review threshold — approve or
                skip each one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actions.filter((a) => a.status === "pending_human").length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No pending reviews — you&apos;re all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actions
                    .filter((a) => a.status === "pending_human")
                    .map((action) => {
                      const catConf = CATEGORY_CONFIG[action.category];
                      return (
                        <div
                          key={action._id}
                          className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 ${catConf?.color}`}>{catConf?.icon}</div>
                              <div>
                                <p className="font-medium text-sm">{action.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {action.description}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  {action.reasoning}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50 h-8"
                                onClick={() => {
                                  setReviewDialog({ open: true, action });
                                  setReviewNotes("");
                                  setReviewApprove(false);
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Skip
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white h-8"
                                onClick={() => {
                                  setReviewDialog({ open: true, action });
                                  setReviewNotes("");
                                  setReviewApprove(true);
                                }}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Autonomy Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Autonomy Mode</CardTitle>
                <CardDescription>Controls how Luna acts on decisions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(["full", "supervised", "off"] as const).map((mode) => (
                  <div
                    key={mode}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      settings.mode === mode
                        ? "border-rose-400 bg-rose-50 dark:bg-rose-950/20"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSettings((p) => ({ ...p, mode }))}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize text-sm">{mode}</span>
                      {settings.mode === mode && (
                        <CheckCircle className="h-4 w-4 text-rose-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {modeDescriptions[mode]}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Confidence Thresholds</CardTitle>
                <CardDescription>
                  Set minimum confidence for autonomous action and human review
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Action Threshold</Label>
                    <span className="text-sm font-medium text-rose-600">
                      {(settings.confidenceThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    min={50}
                    max={100}
                    step={5}
                    value={[settings.confidenceThreshold * 100]}
                    onValueChange={([v]) =>
                      setSettings((p) => ({ ...p, confidenceThreshold: v / 100 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Luna acts autonomously when confidence ≥ this threshold
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Human Review Threshold</Label>
                    <span className="text-sm font-medium text-amber-600">
                      {(settings.humanReviewThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    min={40}
                    max={90}
                    step={5}
                    value={[settings.humanReviewThreshold * 100]}
                    onValueChange={([v]) =>
                      setSettings((p) => ({ ...p, humanReviewThreshold: v / 100 }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Actions below this confidence require human approval
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Actions / Hour</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      min={5}
                      max={100}
                      step={5}
                      value={[settings.maxActionsPerHour]}
                      onValueChange={([v]) =>
                        setSettings((p) => ({ ...p, maxActionsPerHour: v }))
                      }
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-8 text-right">
                      {settings.maxActionsPerHour}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enabled Categories */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Enabled Action Categories</CardTitle>
                <CardDescription>
                  Choose which types of actions Luna can evaluate and execute
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ALL_CATEGORIES.map((cat) => {
                    const conf = CATEGORY_CONFIG[cat];
                    const enabled = settings.enabledCategories.includes(cat);
                    return (
                      <div
                        key={cat}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          enabled ? "bg-muted/30" : "opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={conf.color}>{conf.icon}</span>
                          <span className="text-sm font-medium">{conf.label}</span>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={() => toggleCategory(cat)}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Digest Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Digest Email</CardTitle>
                <CardDescription>
                  Daily or weekly portfolio summary sent by Luna
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="digest-toggle">Enable Digest Email</Label>
                  <Switch
                    id="digest-toggle"
                    checked={settings.digestEmailEnabled}
                    onCheckedChange={(v) =>
                      setSettings((p) => ({ ...p, digestEmailEnabled: v }))
                    }
                  />
                </div>
                {settings.digestEmailEnabled && (
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={settings.digestEmailFrequency}
                      onValueChange={(v: "daily" | "weekly") =>
                        setSettings((p) => ({ ...p, digestEmailFrequency: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {savingSettings ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => setReviewDialog((d) => ({ ...d, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewApprove ? "Approve Action" : "Skip Action"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {reviewDialog.action?.description}
            </p>
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
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this decision…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialog({ open: false, action: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className={
                reviewApprove
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {submittingReview ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
