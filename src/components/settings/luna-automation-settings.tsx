"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Zap,
  Eye,
  PowerOff,
  Loader2,
  Plus,
  Trash2,
  DollarSign,
  AlertTriangle,
  Wrench,
  FileText,
  MessageSquare,
  Building,
  Mail,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";

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

interface LunaEscalationContact {
  name: string;
  email: string;
  phone?: string;
  role: string;
  notifyOnEmergency: boolean;
  notifyOnHighCost: boolean;
}

interface LunaRoleAutonomyConfig {
  role: "admin" | "manager" | "owner";
  enabledCategories: LunaActionCategory[];
  canApproveActions: boolean;
  canOverrideActions: boolean;
  receivesDigest: boolean;
}

interface LunaSettings {
  mode: "full" | "supervised" | "off";
  confidenceThreshold: number;
  humanReviewThreshold: number;
  spendingLimit: number;
  maxActionsPerHour: number;
  enabledCategories: LunaActionCategory[];
  digestEmailEnabled: boolean;
  digestEmailFrequency: "daily" | "weekly";
  escalationContacts: LunaEscalationContact[];
  roleAutonomyConfig: LunaRoleAutonomyConfig[];
}

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

const CATEGORY_LABELS: Record<LunaActionCategory, { label: string; icon: React.ReactNode }> = {
  payment_reminder: { label: "Payment Reminder", icon: <DollarSign className="h-3.5 w-3.5" /> },
  payment_escalation: { label: "Payment Escalation", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  maintenance_triage: { label: "Maintenance Triage", icon: <Wrench className="h-3.5 w-3.5" /> },
  maintenance_escalation: { label: "Maintenance Escalation", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  lease_renewal_notice: { label: "Lease Renewal Notice", icon: <FileText className="h-3.5 w-3.5" /> },
  lease_expiry_alert: { label: "Lease Expiry Alert", icon: <Clock className="h-3.5 w-3.5" /> },
  tenant_communication: { label: "Tenant Communication", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  occupancy_alert: { label: "Occupancy Alert", icon: <Building className="h-3.5 w-3.5" /> },
  system_digest: { label: "System Digest", icon: <Mail className="h-3.5 w-3.5" /> },
};

const MODE_OPTIONS: { value: "full" | "supervised" | "off"; label: string; description: string; icon: typeof Bot }[] = [
  { value: "full", label: "Full Autonomy", description: "Luna acts automatically without human approval.", icon: Zap },
  { value: "supervised", label: "Supervised", description: "Luna proposes actions; humans approve before execution.", icon: Eye },
  { value: "off", label: "Off", description: "Luna evaluates but takes no autonomous actions.", icon: PowerOff },
];

const DEFAULT_SETTINGS: LunaSettings = {
  mode: "supervised",
  confidenceThreshold: 0.75,
  humanReviewThreshold: 0.6,
  spendingLimit: 500,
  maxActionsPerHour: 20,
  enabledCategories: ["payment_reminder", "maintenance_triage", "lease_renewal_notice", "lease_expiry_alert", "tenant_communication", "system_digest"],
  digestEmailEnabled: true,
  digestEmailFrequency: "daily",
  escalationContacts: [],
  roleAutonomyConfig: [
    {
      role: "admin",
      enabledCategories: ALL_CATEGORIES,
      canApproveActions: true,
      canOverrideActions: true,
      receivesDigest: true,
    },
    {
      role: "manager",
      enabledCategories: ["payment_reminder", "maintenance_triage", "lease_renewal_notice", "lease_expiry_alert", "tenant_communication"],
      canApproveActions: true,
      canOverrideActions: false,
      receivesDigest: true,
    },
    {
      role: "owner",
      enabledCategories: ["system_digest"],
      canApproveActions: false,
      canOverrideActions: false,
      receivesDigest: true,
    },
  ],
};

const EMPTY_CONTACT: LunaEscalationContact = {
  name: "",
  email: "",
  phone: "",
  role: "Manager",
  notifyOnEmergency: true,
  notifyOnHighCost: false,
};

interface LunaAutomationSettingsProps {
  onAlert: (type: "success" | "error" | "info", message: string) => void;
}

export function LunaAutomationSettings({ onAlert }: LunaAutomationSettingsProps) {
  const appearance = useOptionalDashboardAppearance();
  const isLight = appearance?.theme === "light";

  const [settings, setSettings] = useState<LunaSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newContact, setNewContact] = useState<LunaEscalationContact>({ ...EMPTY_CONTACT });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/luna/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSettings({
              ...DEFAULT_SETTINGS,
              ...data.settings,
              escalationContacts: data.settings.escalationContacts || [],
              roleAutonomyConfig: data.settings.roleAutonomyConfig || DEFAULT_SETTINGS.roleAutonomyConfig,
            });
          }
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/luna/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        onAlert("success", "Luna automation settings saved successfully.");
      } else {
        onAlert("error", "Failed to save settings. Please try again.");
      }
    } catch {
      onAlert("error", "Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function toggleCategory(cat: LunaActionCategory) {
    setSettings((s) => ({
      ...s,
      enabledCategories: s.enabledCategories.includes(cat)
        ? s.enabledCategories.filter((c) => c !== cat)
        : [...s.enabledCategories, cat],
    }));
  }

  function addContact() {
    if (!newContact.name || !newContact.email) return;
    setSettings((s) => ({ ...s, escalationContacts: [...s.escalationContacts, { ...newContact }] }));
    setNewContact({ ...EMPTY_CONTACT });
  }

  function removeContact(idx: number) {
    setSettings((s) => ({ ...s, escalationContacts: s.escalationContacts.filter((_, i) => i !== idx) }));
  }

  function updateRoleConfig(roleIdx: number, field: keyof LunaRoleAutonomyConfig, value: unknown) {
    setSettings((s) => {
      const updated = [...s.roleAutonomyConfig];
      updated[roleIdx] = { ...updated[roleIdx], [field]: value };
      return { ...s, roleAutonomyConfig: updated };
    });
  }

  function toggleRoleCategory(roleIdx: number, cat: LunaActionCategory) {
    setSettings((s) => {
      const updated = [...s.roleAutonomyConfig];
      const cats = updated[roleIdx].enabledCategories || [];
      updated[roleIdx] = {
        ...updated[roleIdx],
        enabledCategories: cats.includes(cat) ? cats.filter((c) => c !== cat) : [...cats, cat],
      };
      return { ...s, roleAutonomyConfig: updated };
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const labelCls = cn("text-sm font-semibold mb-3", isLight ? "text-slate-700" : "text-white/80");
  const subLabelCls = cn("text-xs", isLight ? "text-slate-400" : "text-white/40");

  return (
    <div className="space-y-10">
      <div id="mode">
        <h3 className={labelCls}>Autonomy Mode</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = settings.mode === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setSettings((s) => ({ ...s, mode: option.value }))}
                className={cn(
                  "rounded-lg border p-4 text-left transition-all",
                  isSelected ? "border-primary bg-primary/10" : isLight ? "border-slate-200 hover:border-slate-300" : "border-white/10 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-medium", isLight ? "text-slate-900" : "text-white")}>{option.label}</span>
                  {isSelected && <Badge variant="outline" className="ml-auto text-[10px]">Active</Badge>}
                </div>
                <p className={subLabelCls}>{option.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div id="thresholds" className="space-y-5">
        <h3 className={labelCls}>Confidence & Spending Thresholds</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={cn("text-sm", isLight ? "text-slate-700" : "text-white/70")}>Confidence threshold</label>
            <span className="text-sm font-mono text-primary">{(settings.confidenceThreshold * 100).toFixed(0)}%</span>
          </div>
          <Slider min={50} max={99} step={1} value={[settings.confidenceThreshold * 100]}
            onValueChange={([v]) => setSettings((s) => ({ ...s, confidenceThreshold: v / 100 }))} className="w-full" />
          <p className={subLabelCls}>Minimum confidence score required for Luna to take action.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={cn("text-sm", isLight ? "text-slate-700" : "text-white/70")}>Human review threshold</label>
            <span className="text-sm font-mono text-primary">{(settings.humanReviewThreshold * 100).toFixed(0)}%</span>
          </div>
          <Slider min={50} max={99} step={1} value={[settings.humanReviewThreshold * 100]}
            onValueChange={([v]) => setSettings((s) => ({ ...s, humanReviewThreshold: v / 100 }))} className="w-full" />
          <p className={subLabelCls}>Actions below this confidence require human approval (supervised mode).</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={cn("text-sm", isLight ? "text-slate-700" : "text-white/70")}>Spending limit per action</label>
            <span className="text-sm font-mono text-primary">${settings.spendingLimit}</span>
          </div>
          <Slider min={0} max={5000} step={50} value={[settings.spendingLimit]}
            onValueChange={([v]) => setSettings((s) => ({ ...s, spendingLimit: v }))} className="w-full" />
          <p className={subLabelCls}>Actions that exceed this cost require human approval.</p>
        </div>
      </div>

      <div id="categories" className="space-y-3">
        <h3 className={labelCls}>Enabled Action Categories</h3>
        <p className={subLabelCls}>Choose which types of actions Luna is allowed to evaluate and execute.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ALL_CATEGORIES.map((cat) => {
            const catConf = CATEGORY_LABELS[cat];
            const enabled = settings.enabledCategories.includes(cat);
            return (
              <div key={cat} className={cn("flex items-center justify-between rounded-lg border px-3 py-2",
                isLight ? "border-slate-200" : "border-white/10")}>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{catConf.icon}</span>
                  <span className={cn("text-sm", isLight ? "text-slate-700" : "text-white/80")}>{catConf.label}</span>
                </div>
                <Switch checked={enabled} onCheckedChange={() => toggleCategory(cat)} />
              </div>
            );
          })}
        </div>
      </div>

      <div id="digest" className="space-y-4">
        <h3 className={labelCls}>Digest Notifications</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className={cn("text-sm", isLight ? "text-slate-700" : "text-white/80")}>Email digest</p>
            <p className={subLabelCls}>Send a summary of Luna activity to all managers.</p>
          </div>
          <Switch checked={settings.digestEmailEnabled} onCheckedChange={(v) => setSettings((s) => ({ ...s, digestEmailEnabled: v }))} />
        </div>
        {settings.digestEmailEnabled && (
          <div className="flex items-center gap-3">
            <span className={cn("text-sm", isLight ? "text-slate-600" : "text-white/60")}>Frequency:</span>
            {(["daily", "weekly"] as const).map((freq) => (
              <button key={freq} onClick={() => setSettings((s) => ({ ...s, digestEmailFrequency: freq }))}
                className={cn("rounded px-3 py-1 text-xs font-medium border transition-all",
                  settings.digestEmailFrequency === freq
                    ? "border-primary bg-primary/10 text-primary"
                    : isLight ? "border-slate-200 text-slate-600" : "border-white/10 text-white/50")}>
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div id="escalation" className="space-y-4">
        <h3 className={labelCls}>Escalation Contacts</h3>
        <p className={subLabelCls}>People Luna should alert in emergencies or when actions exceed the spending limit.</p>
        {settings.escalationContacts.map((contact, idx) => (
          <div key={idx} className={cn("flex items-center gap-3 rounded-lg border p-3", isLight ? "border-slate-200" : "border-white/10")}>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium truncate", isLight ? "text-slate-900" : "text-white")}>{contact.name}</p>
              <p className={cn("text-xs truncate", isLight ? "text-slate-500" : "text-white/50")}>{contact.email} · {contact.role}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {contact.notifyOnEmergency && <Badge variant="outline" className="text-[10px] text-red-500 border-red-200">Emergency</Badge>}
              {contact.notifyOnHighCost && <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-200">High Cost</Badge>}
            </div>
            <button onClick={() => removeContact(idx)} className="text-red-500 hover:text-red-600 shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <div className={cn("rounded-lg border p-3 space-y-3", isLight ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/5")}>
          <p className={cn("text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Add escalation contact</p>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Name" value={newContact.name} onChange={(e) => setNewContact((c) => ({ ...c, name: e.target.value }))} className="text-sm" />
            <Input placeholder="Email" type="email" value={newContact.email} onChange={(e) => setNewContact((c) => ({ ...c, email: e.target.value }))} className="text-sm" />
            <Input placeholder="Role (e.g. Manager)" value={newContact.role} onChange={(e) => setNewContact((c) => ({ ...c, role: e.target.value }))} className="text-sm" />
            <Input placeholder="Phone (optional)" value={newContact.phone || ""} onChange={(e) => setNewContact((c) => ({ ...c, phone: e.target.value }))} className="text-sm" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Switch checked={newContact.notifyOnEmergency} onCheckedChange={(v) => setNewContact((c) => ({ ...c, notifyOnEmergency: v }))} />
              Emergencies
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Switch checked={newContact.notifyOnHighCost} onCheckedChange={(v) => setNewContact((c) => ({ ...c, notifyOnHighCost: v }))} />
              High cost
            </label>
            <Button size="sm" variant="outline" onClick={addContact} disabled={!newContact.name || !newContact.email} className="ml-auto gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>
      </div>

      <div id="roles" className="space-y-4">
        <h3 className={labelCls}>Per-Role Permissions</h3>
        <p className={subLabelCls}>Configure which actions each role can approve, override, and which categories they can trigger.</p>
        {settings.roleAutonomyConfig.map((roleConfig, roleIdx) => (
          <div key={roleIdx} className={cn("rounded-lg border p-4 space-y-4", isLight ? "border-slate-200" : "border-white/10")}>
            <div className="flex items-center justify-between">
              <span className={cn("text-sm font-semibold capitalize", isLight ? "text-slate-900" : "text-white")}>
                {roleConfig.role}
              </span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Switch checked={roleConfig.canApproveActions}
                    onCheckedChange={(v) => updateRoleConfig(roleIdx, "canApproveActions", v)} />
                  Can approve
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Switch checked={roleConfig.canOverrideActions}
                    onCheckedChange={(v) => updateRoleConfig(roleIdx, "canOverrideActions", v)} />
                  Can override
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Switch checked={roleConfig.receivesDigest}
                    onCheckedChange={(v) => updateRoleConfig(roleIdx, "receivesDigest", v)} />
                  Digest
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((cat) => {
                const catConf = CATEGORY_LABELS[cat];
                const enabled = (roleConfig.enabledCategories || []).includes(cat);
                return (
                  <button key={cat} onClick={() => toggleRoleCategory(roleIdx, cat)}
                    className={cn("flex items-center gap-1 rounded px-2 py-1 text-xs border transition-all",
                      enabled ? "border-primary/40 bg-primary/10 text-primary" : isLight ? "border-slate-200 text-slate-400" : "border-white/10 text-white/30")}>
                    {catConf.icon}
                    {catConf.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          <Bot className="h-4 w-4" />
          Save Automation Settings
        </Button>
      </div>
    </div>
  );
}
