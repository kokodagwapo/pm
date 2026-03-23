"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Bot, Zap, Eye, PowerOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";

interface LunaSettings {
  mode: "full" | "supervised" | "off";
  confidenceThreshold: number;
  humanReviewThreshold: number;
  spendingLimit: number;
  digestEmailEnabled: boolean;
  digestEmailFrequency: "daily" | "weekly";
}

const MODE_OPTIONS: { value: "full" | "supervised" | "off"; label: string; description: string; icon: typeof Bot }[] = [
  {
    value: "full",
    label: "Full Autonomy",
    description: "Luna acts automatically without human approval.",
    icon: Zap,
  },
  {
    value: "supervised",
    label: "Supervised",
    description: "Luna proposes actions; humans approve before execution.",
    icon: Eye,
  },
  {
    value: "off",
    label: "Off",
    description: "Luna evaluates but takes no autonomous actions.",
    icon: PowerOff,
  },
];

interface LunaAutomationSettingsProps {
  onAlert: (type: "success" | "error" | "info", message: string) => void;
}

export function LunaAutomationSettings({ onAlert }: LunaAutomationSettingsProps) {
  const appearance = useOptionalDashboardAppearance();
  const isLight = appearance?.theme === "light";

  const [settings, setSettings] = useState<LunaSettings>({
    mode: "supervised",
    confidenceThreshold: 0.75,
    humanReviewThreshold: 0.85,
    spendingLimit: 500,
    digestEmailEnabled: true,
    digestEmailFrequency: "daily",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/luna/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) setSettings(data.settings);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div id="mode">
        <h3 className={cn("text-sm font-semibold mb-3", isLight ? "text-slate-700" : "text-white/80")}>
          Autonomy Mode
        </h3>
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
                  isSelected
                    ? "border-primary bg-primary/10"
                    : isLight
                    ? "border-slate-200 hover:border-slate-300"
                    : "border-white/10 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-sm font-medium", isLight ? "text-slate-900" : "text-white")}>
                    {option.label}
                  </span>
                  {isSelected && <Badge variant="outline" className="ml-auto text-[10px]">Active</Badge>}
                </div>
                <p className={cn("text-xs", isLight ? "text-slate-500" : "text-white/50")}>
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div id="thresholds" className="space-y-5">
        <h3 className={cn("text-sm font-semibold", isLight ? "text-slate-700" : "text-white/80")}>
          Confidence & Spending Thresholds
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={cn("text-sm", isLight ? "text-slate-700" : "text-white/70")}>
              Confidence threshold
            </label>
            <span className="text-sm font-mono text-primary">
              {(settings.confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            min={50}
            max={99}
            step={1}
            value={[settings.confidenceThreshold * 100]}
            onValueChange={([v]) => setSettings((s) => ({ ...s, confidenceThreshold: v / 100 }))}
            className="w-full"
          />
          <p className={cn("text-xs", isLight ? "text-slate-400" : "text-white/40")}>
            Minimum confidence score required for Luna to take action.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={cn("text-sm", isLight ? "text-slate-700" : "text-white/70")}>
              Human review threshold
            </label>
            <span className="text-sm font-mono text-primary">
              {(settings.humanReviewThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            min={50}
            max={99}
            step={1}
            value={[settings.humanReviewThreshold * 100]}
            onValueChange={([v]) => setSettings((s) => ({ ...s, humanReviewThreshold: v / 100 }))}
            className="w-full"
          />
          <p className={cn("text-xs", isLight ? "text-slate-400" : "text-white/40")}>
            Actions below this confidence require human approval (supervised mode).
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={cn("text-sm", isLight ? "text-slate-700" : "text-white/70")}>
              Spending limit per action
            </label>
            <span className="text-sm font-mono text-primary">${settings.spendingLimit}</span>
          </div>
          <Slider
            min={0}
            max={5000}
            step={50}
            value={[settings.spendingLimit]}
            onValueChange={([v]) => setSettings((s) => ({ ...s, spendingLimit: v }))}
            className="w-full"
          />
          <p className={cn("text-xs", isLight ? "text-slate-400" : "text-white/40")}>
            Actions that exceed this cost require human approval.
          </p>
        </div>
      </div>

      <div id="digest" className="space-y-4">
        <h3 className={cn("text-sm font-semibold", isLight ? "text-slate-700" : "text-white/80")}>
          Digest Notifications
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className={cn("text-sm", isLight ? "text-slate-700" : "text-white/80")}>
              Email digest
            </p>
            <p className={cn("text-xs", isLight ? "text-slate-400" : "text-white/40")}>
              Send a summary of Luna activity to all managers.
            </p>
          </div>
          <Switch
            checked={settings.digestEmailEnabled}
            onCheckedChange={(v) => setSettings((s) => ({ ...s, digestEmailEnabled: v }))}
          />
        </div>
        {settings.digestEmailEnabled && (
          <div className="flex items-center gap-3">
            <span className={cn("text-sm", isLight ? "text-slate-600" : "text-white/60")}>Frequency:</span>
            {(["daily", "weekly"] as const).map((freq) => (
              <button
                key={freq}
                onClick={() => setSettings((s) => ({ ...s, digestEmailFrequency: freq }))}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium border transition-all",
                  settings.digestEmailFrequency === freq
                    ? "border-primary bg-primary/10 text-primary"
                    : isLight
                    ? "border-slate-200 text-slate-600"
                    : "border-white/10 text-white/50"
                )}
              >
                {freq.charAt(0).toUpperCase() + freq.slice(1)}
              </button>
            ))}
          </div>
        )}
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
