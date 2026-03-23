"use client";

import { useState } from "react";
import { X, Calculator, CheckCircle2, AlertTriangle, Info, ChevronDown } from "lucide-react";
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

interface Props {
  isLight: boolean;
  onClose: () => void;
}

interface RentResult {
  currentRent: number;
  proposedIncrease: number;
  proposedIncreasePercent: number;
  newRent: number;
  stateCode: string;
  jurisdictionRule?: {
    title: string;
    maxRentIncreasePercent?: number;
    rentControlled: boolean;
    noticePeriodDays?: number;
    description: string;
  };
  compliance: {
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
    requiredNoticeDays: number;
    effectiveDate: string;
  };
}

export default function RentCalculatorModal({ isLight, onClose }: Props) {
  const [form, setForm] = useState({
    currentRent: "",
    proposedNewRent: "",
    stateCode: "FL",
    noticeDays: "30",
  });
  const [result, setResult] = useState<RentResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    if (!form.currentRent || !form.proposedNewRent) return;
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/rent-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentRent: Number(form.currentRent),
          proposedNewRent: Number(form.proposedNewRent),
          stateCode: form.stateCode,
          noticeDays: Number(form.noticeDays),
        }),
      });
      const data = await res.json();
      setResult(data);
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
          "relative w-full max-w-lg rounded-2xl border shadow-2xl",
          isLight ? "border-slate-200 bg-white" : "border-white/[0.12] bg-slate-900"
        )}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: isLight ? "rgb(226 232 240)" : "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <Calculator className={cn("h-5 w-5", isLight ? "text-emerald-600" : "text-emerald-400")} />
            <h2 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>
              Rent Increase Calculator
            </h2>
          </div>
          <button onClick={onClose} className={cn("rounded-lg p-1.5 transition-colors", isLight ? "text-slate-400 hover:bg-slate-100" : "text-white/50 hover:bg-white/10")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>
                Current Rent ($)
              </label>
              <input
                type="number"
                className={inputClass}
                placeholder="e.g. 2000"
                value={form.currentRent}
                onChange={(e) => setForm((f) => ({ ...f, currentRent: e.target.value }))}
              />
            </div>
            <div>
              <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>
                Proposed New Rent ($)
              </label>
              <input
                type="number"
                className={inputClass}
                placeholder="e.g. 2150"
                value={form.proposedNewRent}
                onChange={(e) => setForm((f) => ({ ...f, proposedNewRent: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>
                State
              </label>
              <div className="relative">
                <select
                  className={cn(inputClass, "appearance-none pr-8")}
                  value={form.stateCode}
                  onChange={(e) => setForm((f) => ({ ...f, stateCode: e.target.value }))}
                >
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
              </div>
            </div>
            <div>
              <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>
                Notice Days Planned
              </label>
              <input
                type="number"
                className={inputClass}
                placeholder="30"
                value={form.noticeDays}
                onChange={(e) => setForm((f) => ({ ...f, noticeDays: e.target.value }))}
              />
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={loading || !form.currentRent || !form.proposedNewRent}
            className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Calculating..." : "Check Compliance"}
          </Button>

          {result && (
            <div className="space-y-3">
              <div
                className={cn(
                  "rounded-xl border p-4",
                  result.compliance.isCompliant
                    ? isLight ? "border-emerald-200 bg-emerald-50" : "border-emerald-500/20 bg-emerald-500/10"
                    : isLight ? "border-red-200 bg-red-50" : "border-red-500/20 bg-red-500/10"
                )}
              >
                <div className="flex items-center gap-2">
                  {result.compliance.isCompliant ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={cn("text-sm font-semibold", result.compliance.isCompliant ? "text-emerald-600" : "text-red-600")}>
                    {result.compliance.isCompliant ? "Compliant" : "Issues Found"}
                  </span>
                  <span className={cn("ml-auto text-sm font-medium", isLight ? "text-slate-700" : "text-white/80")}>
                    +{result.proposedIncreasePercent.toFixed(1)}% increase
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { label: "Current", value: `$${result.currentRent.toLocaleString()}` },
                    { label: "New Rent", value: `$${result.newRent.toLocaleString()}` },
                    { label: "Increase", value: `$${result.proposedIncrease.toLocaleString()}` },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <p className={cn("text-xs", isLight ? "text-slate-500" : "text-white/50")}>{item.label}</p>
                      <p className={cn("text-sm font-semibold", isLight ? "text-slate-800" : "text-white")}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {result.compliance.issues.length > 0 && (
                <div>
                  {result.compliance.issues.map((issue: string, i: number) => (
                    <div key={i} className="flex gap-2 rounded-lg p-2 text-xs text-red-500">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.compliance.recommendations.length > 0 && (
                <div>
                  <p className={cn("mb-1 text-xs font-medium", isLight ? "text-slate-500" : "text-white/50")}>Recommendations</p>
                  {result.compliance.recommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex gap-2 rounded-lg p-2 text-xs">
                      <Info className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", isLight ? "text-blue-500" : "text-blue-400")} />
                      <span className={isLight ? "text-slate-600" : "text-white/70"}>{rec}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.jurisdictionRule && (
                <div className={cn("rounded-lg border p-3 text-xs", isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.08] bg-white/[0.03]")}>
                  <p className={cn("font-semibold", isLight ? "text-slate-700" : "text-white/80")}>{result.jurisdictionRule.title}</p>
                  <p className={cn("mt-1", isLight ? "text-slate-500" : "text-white/50")}>{result.jurisdictionRule.description}</p>
                  {result.jurisdictionRule.rentControlled && (
                    <span className="mt-2 inline-flex items-center rounded-md bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                      Rent Controlled Jurisdiction
                    </span>
                  )}
                </div>
              )}

              <p className={cn("text-center text-xs", isLight ? "text-slate-400" : "text-white/30")}>
                Earliest compliant effective date:{" "}
                <strong>{new Date(result.compliance.effectiveDate).toLocaleDateString()}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
