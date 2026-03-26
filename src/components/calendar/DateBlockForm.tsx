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
import {
  glassDialog,
  glassField,
  glassInsetRow,
  glassOutlineButton,
  glassSelectContent,
} from "@/lib/glass-ui";
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
      <DialogContent className={cn("sm:max-w-[480px]", glassDialog)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CalendarDays className="h-5 w-5 text-primary" />
            {editingBlock ? "Edit Date Block" : "Block Dates"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Block dates to prevent bookings during this period.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-foreground/90">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                className={glassField}
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
              <Label htmlFor="endDate" className="text-foreground/90">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                className={glassField}
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
            <Label htmlFor="blockType" className="text-foreground/90">
              Block Type
            </Label>
            <Select
              value={formData.blockType}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, blockType: value as DateBlockType }))
              }
            >
              <SelectTrigger id="blockType" className={glassField}>
                <SelectValue placeholder="Select block type" />
              </SelectTrigger>
              <SelectContent className={glassSelectContent}>
                {availableBlockTypes.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-foreground/90">
              Reason (Optional)
            </Label>
            <Textarea
              id="reason"
              className={glassField}
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
                glassInsetRow
              )}
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label
                    htmlFor="isHardBlock"
                    className="cursor-pointer text-foreground/90"
                  >
                    Hard Block
                  </Label>
                  <p className="text-xs text-muted-foreground">
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
              glassInsetRow
            )}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label
                  htmlFor="recurring"
                  className="cursor-pointer text-foreground/90"
                >
                  Recurring Yearly
                </Label>
                <p className="text-xs text-muted-foreground">
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
            <div className="space-y-2 border-l-2 border-border/60 pl-4 dark:border-white/15">
              <Label htmlFor="endRecurrence" className="text-foreground/90">
                End Recurrence (Optional)
              </Label>
              <Input
                id="endRecurrence"
                type="date"
                className={glassField}
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

          <DialogFooter className="gap-2 border-t border-border/40 pt-4 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              className={glassOutlineButton}
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
