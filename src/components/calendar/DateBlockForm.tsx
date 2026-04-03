"use client";

import React, { useState } from "react";
import { CalendarDays, Lock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
/** Solid light modal — white sheet on white scrim (no glass). */
const lightField =
  "!border-slate-200 !bg-white shadow-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-slate-400/30";
const lightInsetRow = "rounded-xl border border-slate-200 bg-slate-50";
const lightSelectContent = "border-slate-200 bg-white text-slate-900";
const lightOutlineButton =
  "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-900";
import { DateBlockType } from "@/types";

const BLOCK_TYPE_OPTIONS: { value: DateBlockType; label: string; adminOnly?: boolean }[] = [
  { value: DateBlockType.OWNER_STAY, label: "Owner Stay" },
  { value: DateBlockType.MAINTENANCE, label: "Maintenance" },
  { value: DateBlockType.HOLD, label: "Hold" },
  { value: DateBlockType.RENOVATION, label: "Renovation" },
  { value: DateBlockType.PERSONAL, label: "Personal" },
  { value: DateBlockType.SEASONAL_CLOSURE, label: "Seasonal Closure", adminOnly: true },
];

export interface DateBlockFormData {
  startDate: string;
  endDate: string;
  blockType: DateBlockType;
  isHardBlock: boolean;
  reason: string;
  recurring: {
    enabled: boolean;
    frequency: "yearly";
    endRecurrence?: string;
  };
}

interface DateBlockFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DateBlockFormData) => Promise<void>;
  initialStartDate?: string;
  initialEndDate?: string;
  editingBlock?: {
    _id: string;
    blockType: DateBlockType;
    isHardBlock: boolean;
    reason?: string;
    recurring?: { enabled: boolean; frequency: "yearly"; endRecurrence?: string };
  };
  userRole: "admin" | "manager" | "owner";
  isLoading?: boolean;
}

function formatDateForInput(date: string | Date | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export function DateBlockForm({
  open,
  onOpenChange,
  onSubmit,
  initialStartDate,
  initialEndDate,
  editingBlock,
  userRole,
  isLoading = false,
}: DateBlockFormProps) {
  const [formData, setFormData] = useState<DateBlockFormData>({
    startDate: formatDateForInput(initialStartDate) || formatDateForInput(new Date()),
    endDate: formatDateForInput(initialEndDate) || "",
    blockType: editingBlock?.blockType || DateBlockType.HOLD,
    isHardBlock: editingBlock?.isHardBlock || false,
    reason: editingBlock?.reason || "",
    recurring: editingBlock?.recurring || {
      enabled: false,
      frequency: "yearly",
    },
  });

  const [error, setError] = useState<string>("");

  const isAdmin = userRole === "admin" || userRole === "manager";

  const availableBlockTypes = BLOCK_TYPE_OPTIONS.filter(
    (opt) => !opt.adminOnly || isAdmin
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.startDate || !formData.endDate) {
      setError("Start date and end date are required");
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (start >= end) {
      setError("End date must be after start date");
      return;
    }

    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    if (end > twoYearsFromNow) {
      setError("Cannot block dates more than 2 years in advance");
      return;
    }

    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to create block");
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const maxDateStr = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split("T")[0];
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-white"
        className={cn(
          "sm:max-w-[480px] !rounded-2xl !border-slate-200 !bg-white !shadow-[0_24px_64px_rgba(15,23,42,0.08)] text-slate-900",
          "[&_[data-slot=dialog-close]]:text-slate-500 [&_[data-slot=dialog-close]]:hover:bg-slate-100 [&_[data-slot=dialog-close]]:hover:text-slate-900"
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <CalendarDays className="h-5 w-5 text-teal-600" />
            {editingBlock ? "Edit Date Block" : "Block Dates"}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Block dates to prevent bookings during this period.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-slate-800">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                className={lightField}
                value={formData.startDate}
                min={todayStr}
                max={maxDateStr}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-slate-800">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                className={lightField}
                value={formData.endDate}
                min={formData.startDate || todayStr}
                max={maxDateStr}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blockType" className="text-slate-800">
              Block Type
            </Label>
            <Select
              value={formData.blockType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, blockType: value as DateBlockType }))
              }
            >
              <SelectTrigger id="blockType" className={lightField}>
                <SelectValue placeholder="Select block type" />
              </SelectTrigger>
              <SelectContent className={lightSelectContent}>
                {availableBlockTypes.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-slate-800">
              Reason (Optional)
            </Label>
            <Textarea
              id="reason"
              className={lightField}
              value={formData.reason}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="Describe the reason for blocking these dates..."
              maxLength={500}
              rows={3}
            />
          </div>

          {isAdmin && (
            <div
              className={cn(
                "flex items-center justify-between p-3",
                lightInsetRow
              )}
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-500" />
                <div>
                  <Label
                    htmlFor="isHardBlock"
                    className="cursor-pointer text-slate-800"
                  >
                    Hard Block
                  </Label>
                  <p className="text-xs text-slate-500">
                    Cannot be overridden by owners
                  </p>
                </div>
              </div>
              <Switch
                id="isHardBlock"
                checked={formData.isHardBlock}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isHardBlock: checked }))
                }
              />
            </div>
          )}

          <div
            className={cn(
              "flex items-center justify-between p-3",
              lightInsetRow
            )}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-500" />
              <div>
                <Label
                  htmlFor="recurring"
                  className="cursor-pointer text-slate-800"
                >
                  Recurring Yearly
                </Label>
                <p className="text-xs text-slate-500">
                  Block the same dates every year
                </p>
              </div>
            </div>
            <Switch
              id="recurring"
              checked={formData.recurring.enabled}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  recurring: { ...prev.recurring, enabled: checked },
                }))
              }
            />
          </div>

          {formData.recurring.enabled && (
            <div className="space-y-2 border-l-2 border-slate-200 pl-4">
              <Label htmlFor="endRecurrence" className="text-slate-800">
                End Recurrence (Optional)
              </Label>
              <Input
                id="endRecurrence"
                type="date"
                className={lightField}
                value={formData.recurring.endRecurrence || ""}
                min={formData.endDate || todayStr}
                max={maxDateStr}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    recurring: {
                      ...prev.recurring,
                      endRecurrence: e.target.value || undefined,
                    },
                  }))
                }
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter className="gap-2 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="outline"
              className={lightOutlineButton}
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : editingBlock ? "Update Block" : "Create Block"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
