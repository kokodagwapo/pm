"use client";

import { useState } from "react";
import { X, Gavel, ChevronDown, AlertTriangle, Info, CheckCircle2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

const EVICTION_REASONS = [
  "Non-payment of rent",
  "Lease violation",
  "Property damage",
  "Illegal activity",
  "Unauthorized occupants",
  "Owner move-in",
  "Property sale",
  "End of lease term",
  "Other",
];

interface Props {
  isLight: boolean;
  onClose: () => void;
}

export default function EvictionWorkflowModal({ isLight, onClose }: Props) {
  const [form, setForm] = useState({ stateCode: "FL", reason: "Non-payment of rent", tenantName: "", propertyAddress: "" });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/eviction-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
      setExpandedStep(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = cn(
    "w-full rounded-xl border px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2",
    isLight
      ? "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-violet-400 focus:ring-violet-400/20"
      : "border-white/[0.12] bg-white/[0.06] text-white placeholder-white/30 focus:border-violet-500/50 focus:ring-violet-500/20"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn("absolute inset-0 backdrop-blur-sm", isLight ? "bg-slate-900/30" : "bg-black/60")}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-lg overflow-y-auto rounded-2xl border shadow-2xl",
          isLight ? "border-slate-200 bg-white" : "border-white/[0.12] bg-slate-900",
          "max-h-[90vh]"
        )}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: isLight ? "rgb(226 232 240)" : "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <Gavel className={cn("h-5 w-5", isLight ? "text-orange-600" : "text-orange-400")} />
            <h2 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>
              Eviction Workflow Builder
            </h2>
          </div>
          <button onClick={onClose} className={cn("rounded-lg p-1.5 transition-colors", isLight ? "text-slate-400 hover:bg-slate-100" : "text-white/50 hover:bg-white/10")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div
            className={cn(
              "flex gap-2 rounded-xl border p-3 text-xs",
              isLight ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-500/20 bg-amber-500/10 text-amber-400"
            )}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This tool provides general guidance only. Always consult a licensed attorney before proceeding with eviction.</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>State</label>
              <div className="relative">
                <select
                  className={cn(inputClass, "appearance-none pr-8")}
                  value={form.stateCode}
                  onChange={(e) => setForm((f) => ({ ...f, stateCode: e.target.value }))}
                >
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
              </div>
            </div>
            <div>
              <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Reason</label>
              <div className="relative">
                <select
                  className={cn(inputClass, "appearance-none pr-8")}
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                >
                  {EVICTION_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Tenant Name (optional)</label>
              <input
                type="text"
                className={inputClass}
                placeholder="John Doe"
                value={form.tenantName}
                onChange={(e) => setForm((f) => ({ ...f, tenantName: e.target.value }))}
              />
            </div>
            <div>
              <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>Property Address (optional)</label>
              <input
                type="text"
                className={inputClass}
                placeholder="123 Main St"
                value={form.propertyAddress}
                onChange={(e) => setForm((f) => ({ ...f, propertyAddress: e.target.value }))}
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-xl bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Workflow"}
          </Button>

          {result?.workflow && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className={cn("text-xs font-semibold uppercase tracking-wider", isLight ? "text-slate-500" : "text-white/50")}>
                  {result.workflow.stateCode} Eviction Process
                </p>
                <span className={cn("rounded-lg px-2 py-0.5 text-xs", isLight ? "bg-slate-100 text-slate-600" : "bg-white/10 text-white/60")}>
                  ~{result.workflow.totalTimelineDays} days
                </span>
              </div>

              {result.workflow.recommendedAttorney && (
                <div className={cn("flex gap-2 rounded-lg border p-3 text-xs", isLight ? "border-violet-200 bg-violet-50 text-violet-700" : "border-violet-500/20 bg-violet-500/10 text-violet-400")}>
                  <Scale className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Attorney strongly recommended for {result.workflow.stateCode} evictions due to complex tenant protections</span>
                </div>
              )}

              <div className="space-y-2">
                {result.workflow.steps.map((step: any, i: number) => (
                  <div
                    key={i}
                    className={cn("overflow-hidden rounded-xl border transition-all", isLight ? "border-slate-200" : "border-white/[0.08]")}
                  >
                    <button
                      onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                      className={cn(
                        "flex w-full items-center gap-3 p-3 text-left transition-colors",
                        isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.04]"
                      )}
                    >
                      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        isLight ? "bg-orange-100 text-orange-700" : "bg-orange-500/20 text-orange-400"
                      )}>
                        {step.step}
                      </span>
                      <span className={cn("flex-1 text-sm font-medium", isLight ? "text-slate-800" : "text-white")}>
                        {step.title}
                      </span>
                      <span className={cn("shrink-0 text-xs", isLight ? "text-slate-400" : "text-white/40")}>
                        Day {step.daysFromStart}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", expandedStep === i && "rotate-180", isLight ? "text-slate-400" : "text-white/40")} />
                    </button>
                    {expandedStep === i && (
                      <div className={cn("border-t px-3 pb-3 pt-2 text-xs space-y-2", isLight ? "border-slate-100" : "border-white/[0.06]")}>
                        <p className={isLight ? "text-slate-600" : "text-white/70"}>{step.description}</p>
                        {step.requiredDocuments.length > 0 && (
                          <div>
                            <p className={cn("font-semibold", isLight ? "text-slate-700" : "text-white/80")}>Required Documents:</p>
                            <ul className="mt-1 space-y-0.5">
                              {step.requiredDocuments.map((doc: string, j: number) => (
                                <li key={j} className={cn("flex gap-1.5", isLight ? "text-slate-600" : "text-white/60")}>
                                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                                  {doc}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {step.legalRequirements.length > 0 && (
                          <div>
                            <p className={cn("font-semibold", isLight ? "text-slate-700" : "text-white/80")}>Legal Requirements:</p>
                            <ul className="mt-1 space-y-0.5">
                              {step.legalRequirements.map((req: string, j: number) => (
                                <li key={j} className={cn("flex gap-1.5", isLight ? "text-slate-600" : "text-white/60")}>
                                  <Info className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {step.warnings.length > 0 && (
                          <div>
                            {step.warnings.map((w: string, j: number) => (
                              <div key={j} className="flex gap-1.5 text-amber-500">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                <span>{w}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {result.workflow.fairHousingWarnings.length > 0 && (
                <div className={cn("rounded-xl border p-3 space-y-1.5", isLight ? "border-red-200 bg-red-50" : "border-red-500/20 bg-red-500/10")}>
                  <p className="text-xs font-semibold text-red-600">Fair Housing Reminders</p>
                  {result.workflow.fairHousingWarnings.map((w: string, i: number) => (
                    <p key={i} className="flex gap-1.5 text-xs text-red-500">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      {w}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
