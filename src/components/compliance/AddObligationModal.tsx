"use client";

import { useState, useEffect } from "react";
import { X, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  isLight: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CATEGORIES = [
  { value: "rent_control", label: "Rent Control" },
  { value: "eviction", label: "Eviction" },
  { value: "fair_housing", label: "Fair Housing" },
  { value: "habitability", label: "Habitability" },
  { value: "security_deposit", label: "Security Deposit" },
  { value: "notice_requirements", label: "Notice Requirements" },
  { value: "inspection", label: "Inspection" },
  { value: "discrimination", label: "Discrimination" },
  { value: "accessibility", label: "Accessibility" },
  { value: "lead_disclosure", label: "Lead Disclosure" },
  { value: "mold", label: "Mold" },
  { value: "vendor_compliance", label: "Vendor Compliance" },
  { value: "license_renewal", label: "License Renewal" },
  { value: "insurance", label: "Insurance" },
  { value: "general", label: "General" },
];

interface PropertyOption {
  _id: string;
  name: string;
  address?: { city?: string; state?: string };
}

export default function AddObligationModal({ isLight, onClose, onCreated }: Props) {
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    title: "",
    description: "",
    category: "general",
    severity: "medium",
    status: "pending",
    dueDate: "",
    recurrence: "one_time",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/properties?limit=100")
      .then((r) => r.json())
      .then((d) => setProperties(d.properties || []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.propertyId || !form.title || !form.description) return;
    setLoading(true);
    try {
      const { dueDate, ...rest } = form;
      const payload: Record<string, string> = { ...rest };
      if (dueDate) payload.dueDate = dueDate;
      const res = await fetch("/api/compliance/obligations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        onCreated();
        onClose();
      }
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

  const labelClass = cn("mb-1.5 block text-xs font-medium", isLight ? "text-slate-600" : "text-white/60");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn("absolute inset-0 backdrop-blur-sm", isLight ? "bg-slate-900/30" : "bg-black/60")}
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative w-full max-w-md overflow-y-auto rounded-2xl border shadow-2xl",
          isLight ? "border-slate-200 bg-white" : "border-white/[0.12] bg-slate-900",
          "max-h-[90vh]"
        )}
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: isLight ? "rgb(226 232 240)" : "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <Shield className={cn("h-5 w-5", isLight ? "text-violet-600" : "text-violet-400")} />
            <h2 className={cn("text-base font-semibold", isLight ? "text-slate-900" : "text-white")}>
              Add Compliance Obligation
            </h2>
          </div>
          <button type="button" onClick={onClose} className={cn("rounded-lg p-1.5 transition-colors", isLight ? "text-slate-400 hover:bg-slate-100" : "text-white/50 hover:bg-white/10")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className={labelClass}>Property *</label>
            <div className="relative">
              <select
                required
                className={cn(inputClass, "appearance-none pr-8")}
                value={form.propertyId}
                onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value }))}
              >
                <option value="">Select a property...</option>
                {properties.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Title *</label>
            <input
              required
              type="text"
              className={inputClass}
              placeholder="e.g. Annual fire inspection due"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div>
            <label className={labelClass}>Description *</label>
            <textarea
              required
              rows={3}
              className={cn(inputClass, "resize-none")}
              placeholder="Describe the compliance requirement..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category</label>
              <div className="relative">
                <select
                  className={cn(inputClass, "appearance-none pr-8")}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Severity</label>
              <div className="relative">
                <select
                  className={cn(inputClass, "appearance-none pr-8")}
                  value={form.severity}
                  onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Due Date</label>
              <input
                type="date"
                className={inputClass}
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass}>Recurrence</label>
              <div className="relative">
                <select
                  className={cn(inputClass, "appearance-none pr-8")}
                  value={form.recurrence}
                  onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
                >
                  <option value="one_time">One Time</option>
                  <option value="annual">Annual</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                  <option value="event_triggered">Event Triggered</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-50" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              rows={2}
              className={cn(inputClass, "resize-none")}
              placeholder="Additional notes or context..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className={cn("flex-1 rounded-xl", isLight ? "text-slate-600 hover:bg-slate-100" : "text-white/70 hover:bg-white/10")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.propertyId || !form.title || !form.description}
              className="flex-1 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Add Obligation"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
