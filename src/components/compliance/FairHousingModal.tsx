"use client";

import { useState } from "react";
import { X, Eye, CheckCircle2, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  isLight: boolean;
  onClose: () => void;
}

const SEVERITY_COLORS = {
  critical: "text-red-500 bg-red-500/10 border-red-500/20",
  high: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  medium: "text-amber-500 bg-amber-500/10 border-amber-500/20",
};

export default function FairHousingModal({ isLight, onClose }: Props) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/fair-housing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const textareaClass = cn(
    "w-full rounded-xl border px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 resize-none",
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
            <Eye className={cn("h-5 w-5", isLight ? "text-violet-600" : "text-violet-400")} />
            <h2 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>
              Fair Housing Guardrails
            </h2>
          </div>
          <button onClick={onClose} className={cn("rounded-lg p-1.5 transition-colors", isLight ? "text-slate-400 hover:bg-slate-100" : "text-white/50 hover:bg-white/10")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className={cn("text-xs", isLight ? "text-slate-500" : "text-white/50")}>
            Paste your listing description, advertisement, or tenant communication below to scan for potentially discriminatory language.
          </p>

          <div>
            <label className={cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60")}>
              Text to Analyze
            </label>
            <textarea
              rows={5}
              className={textareaClass}
              placeholder="Paste your listing or advertisement text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
            className="w-full rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Scan for Issues"}
          </Button>

          {result && (
            <div className="space-y-3">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4",
                  result.isCompliant
                    ? isLight ? "border-emerald-200 bg-emerald-50" : "border-emerald-500/20 bg-emerald-500/10"
                    : result.riskLevel === "critical"
                    ? isLight ? "border-red-200 bg-red-50" : "border-red-500/20 bg-red-500/10"
                    : isLight ? "border-amber-200 bg-amber-50" : "border-amber-500/20 bg-amber-500/10"
                )}
              >
                {result.isCompliant ? (
                  <>
                    <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-600">No Issues Found</p>
                      <p className={cn("text-xs", isLight ? "text-slate-500" : "text-white/50")}>
                        Your text appears to comply with fair housing guidelines
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className={cn("h-6 w-6 shrink-0", result.riskLevel === "critical" ? "text-red-500" : "text-amber-500")} />
                    <div>
                      <p className={cn("text-sm font-semibold", result.riskLevel === "critical" ? "text-red-600" : "text-amber-600")}>
                        {result.issues.length} Issue{result.issues.length > 1 ? "s" : ""} Found
                      </p>
                      <p className={cn("text-xs", isLight ? "text-slate-500" : "text-white/50")}>
                        Risk level: <strong className="capitalize">{result.riskLevel}</strong>
                      </p>
                    </div>
                  </>
                )}
              </div>

              {result.issues.length > 0 && (
                <div className="space-y-2">
                  <p className={cn("text-xs font-semibold uppercase tracking-wider", isLight ? "text-slate-500" : "text-white/50")}>
                    Issues Detected
                  </p>
                  {result.issues.map((issue: any, i: number) => (
                    <div
                      key={i}
                      className={cn("rounded-lg border p-3 text-xs", SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS])}
                    >
                      <p className="font-semibold capitalize">{issue.severity}: "{issue.matched}"</p>
                      <p className="mt-1 opacity-80">{issue.warning}</p>
                      {issue.recommendation && (
                        <p className="mt-1.5 font-medium">Instead use: "{issue.recommendation}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {result.generalRecommendations.length > 0 && (
                <div className="space-y-1.5">
                  <p className={cn("text-xs font-semibold uppercase tracking-wider", isLight ? "text-slate-500" : "text-white/50")}>
                    Best Practices
                  </p>
                  {result.generalRecommendations.map((rec: string, i: number) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <Info className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", isLight ? "text-blue-500" : "text-blue-400")} />
                      <span className={isLight ? "text-slate-600" : "text-white/70"}>{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className={cn("rounded-xl border p-3 text-xs", isLight ? "border-slate-200 bg-slate-50" : "border-white/[0.08] bg-white/[0.03]")}>
            <p className={cn("font-semibold", isLight ? "text-slate-700" : "text-white/80")}>Federal Protected Classes</p>
            <p className={cn("mt-1", isLight ? "text-slate-500" : "text-white/50")}>
              Race, Color, National Origin, Religion, Sex, Disability, Familial Status. Many states add: Source of Income, Sexual Orientation, Gender Identity, Age.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
