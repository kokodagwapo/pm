"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2, Info, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface CreditBuilderData {
  optedIn: boolean;
  enrolledAt: string | null;
}

const BENEFITS = [
  "On-time rent payments reported to credit bureaus",
  "Builds credit history without taking on debt",
  "Monthly credit impact summary in your dashboard",
  "Secure & private — your data is never sold",
];

export function CreditBuilderWidget() {
  const [data, setData] = useState<CreditBuilderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/tenant-intelligence/credit-builder")
      .then((r) => r.json())
      .then((j) => setData(j.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tenant-intelligence/credit-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: !data.optedIn }),
      });
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
        toast.success(json.message || "Preference saved.");
      } else {
        toast.error(json.error || "Failed to update.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/60 animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 w-40 rounded bg-muted/60 mb-3" />
          <div className="h-3 w-full rounded bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Star className="h-5 w-5 text-amber-500" />
            Credit Builder Program
          </CardTitle>
          {data.optedIn && (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              Enrolled
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Build your credit score through your rent payments — at no extra cost. Each on-time payment
          is reported to major credit bureaus, helping you establish a stronger financial profile.
        </p>

        <ul className="space-y-1.5">
          {BENEFITS.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
              {b}
            </li>
          ))}
        </ul>

        {data.optedIn && data.enrolledAt && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Enrolled since {new Date(data.enrolledAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              <span>
                Your on-time rent payments are queued for reporting.{" "}
                <span className="font-medium">
                  Bureau integration coming soon — your enrollment is saved and will activate automatically.
                </span>
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={data.optedIn ? "outline" : "default"}
            onClick={handleToggle}
            disabled={saving}
            className={!data.optedIn ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : data.optedIn ? (
              "Unenroll"
            ) : (
              "Enroll Now — It's Free"
            )}
          </Button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            You can unenroll at any time
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
