"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingRuleType } from "@/types";

const RULE_TYPE_OPTIONS: { value: PricingRuleType; label: string; description: string }[] = [
  { value: PricingRuleType.DAILY_OVERRIDE, label: "Daily Override", description: "Set a specific price for a date range" },
  { value: PricingRuleType.WEEKEND, label: "Weekend Pricing", description: "Special pricing for weekends" },
  { value: PricingRuleType.WEEKDAY, label: "Weekday Pricing", description: "Special pricing for weekdays" },
  { value: PricingRuleType.SEASONAL, label: "Seasonal", description: "Seasonal rate adjustments" },
  { value: PricingRuleType.HOLIDAY, label: "Holiday", description: "Holiday pricing" },
  { value: PricingRuleType.LAST_MINUTE, label: "Last Minute", description: "Pricing for last-minute bookings" },
  { value: PricingRuleType.LONG_TERM_DISCOUNT, label: "Long-Term Discount", description: "Discounts for extended stays" },
  { value: PricingRuleType.EARLY_BIRD_DISCOUNT, label: "Early Bird Discount", description: "Discounts for advance bookings" },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export interface PricingRuleFormData {
  name: string;
  ruleType: PricingRuleType;
  startDate?: string;
  endDate?: string;
  pricePerNight?: number;
  priceModifier?: { type: "fixed" | "percentage"; value: number };
  daysOfWeek?: number[];
  minimumStay?: number;
  maximumStay?: number;
  advanceBookingDiscounts?: { daysAhead: number; discountPercent: number }[];
  longTermDiscount?: { weeklyPercent?: number; monthlyPercent?: number };
  lastMinutePricing?: {
    enabled: boolean;
    daysBeforeCheckIn?: number;
    modifier?: { type: "fixed" | "percentage"; value: number };
  };
  priority: number;
  isActive: boolean;
}

interface PricingRuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PricingRuleFormData) => Promise<void>;
  initialStartDate?: string;
  initialEndDate?: string;
  editingRule?: any;
  baseRentPerNight?: number;
  isLoading?: boolean;
}

function formatDateForInput(date: string | Date | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

const NEEDS_DATES: PricingRuleType[] = [
  PricingRuleType.DAILY_OVERRIDE,
  PricingRuleType.SEASONAL,
  PricingRuleType.HOLIDAY,
];

const NEEDS_DAYS_OF_WEEK: PricingRuleType[] = [
  PricingRuleType.WEEKEND,
  PricingRuleType.WEEKDAY,
];

export function PricingRuleForm({
  open,
  onOpenChange,
  onSubmit,
  initialStartDate,
  initialEndDate,
  editingRule,
  baseRentPerNight = 0,
  isLoading = false,
}: PricingRuleFormProps) {
  const [formData, setFormData] = useState<PricingRuleFormData>({
    name: "",
    ruleType: PricingRuleType.DAILY_OVERRIDE,
    startDate: formatDateForInput(initialStartDate),
    endDate: formatDateForInput(initialEndDate),
    pricePerNight: undefined,
    priceModifier: undefined,
    daysOfWeek: [],
    minimumStay: undefined,
    maximumStay: undefined,
    advanceBookingDiscounts: [],
    longTermDiscount: undefined,
    lastMinutePricing: undefined,
    priority: 0,
    isActive: true,
  });

  const [pricingMode, setPricingMode] = useState<"fixed" | "modifier">("fixed");
  const [modifierType, setModifierType] = useState<"fixed" | "percentage">("percentage");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (editingRule) {
      setFormData({
        name: editingRule.name || "",
        ruleType: editingRule.ruleType || PricingRuleType.DAILY_OVERRIDE,
        startDate: formatDateForInput(editingRule.startDate),
        endDate: formatDateForInput(editingRule.endDate),
        pricePerNight: editingRule.pricePerNight,
        priceModifier: editingRule.priceModifier,
        daysOfWeek: editingRule.daysOfWeek || [],
        minimumStay: editingRule.minimumStay,
        maximumStay: editingRule.maximumStay,
        advanceBookingDiscounts: editingRule.advanceBookingDiscounts || [],
        longTermDiscount: editingRule.longTermDiscount,
        lastMinutePricing: editingRule.lastMinutePricing,
        priority: editingRule.priority ?? 0,
        isActive: editingRule.isActive ?? true,
      });
      if (editingRule.priceModifier) {
        setPricingMode("modifier");
        setModifierType(editingRule.priceModifier.type);
      }
    }
  }, [editingRule]);

  const needsDates = NEEDS_DATES.includes(formData.ruleType);
  const needsDaysOfWeek = NEEDS_DAYS_OF_WEEK.includes(formData.ruleType);
  const isDiscountType =
    formData.ruleType === PricingRuleType.LONG_TERM_DISCOUNT ||
    formData.ruleType === PricingRuleType.EARLY_BIRD_DISCOUNT;
  const isLastMinute = formData.ruleType === PricingRuleType.LAST_MINUTE;

  const toggleDayOfWeek = useCallback((day: number) => {
    setFormData((prev) => {
      const days = prev.daysOfWeek || [];
      return {
        ...prev,
        daysOfWeek: days.includes(day)
          ? days.filter((d) => d !== day)
          : [...days, day].sort(),
      };
    });
  }, []);

  const addAdvanceDiscount = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      advanceBookingDiscounts: [
        ...(prev.advanceBookingDiscounts || []),
        { daysAhead: 30, discountPercent: 10 },
      ],
    }));
  }, []);

  const removeAdvanceDiscount = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      advanceBookingDiscounts: (prev.advanceBookingDiscounts || []).filter(
        (_, i) => i !== index
      ),
    }));
  }, []);

  const updateAdvanceDiscount = useCallback(
    (index: number, field: "daysAhead" | "discountPercent", value: number) => {
      setFormData((prev) => ({
        ...prev,
        advanceBookingDiscounts: (prev.advanceBookingDiscounts || []).map(
          (d, i) => (i === index ? { ...d, [field]: value } : d)
        ),
      }));
    },
    []
  );

  const calculatePreviewPrice = useCallback((): number | null => {
    if (isDiscountType || isLastMinute) return null;

    if (pricingMode === "fixed" && formData.pricePerNight !== undefined) {
      return formData.pricePerNight;
    }

    if (pricingMode === "modifier" && formData.priceModifier) {
      if (formData.priceModifier.type === "fixed") {
        return baseRentPerNight + formData.priceModifier.value;
      }
      if (formData.priceModifier.type === "percentage") {
        return baseRentPerNight * (1 + formData.priceModifier.value / 100);
      }
    }

    return null;
  }, [formData, pricingMode, baseRentPerNight, isDiscountType, isLastMinute]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Rule name is required");
      return;
    }

    if (needsDates && (!formData.startDate || !formData.endDate)) {
      setError("Start date and end date are required for this rule type");
      return;
    }

    if (needsDaysOfWeek && (!formData.daysOfWeek || formData.daysOfWeek.length === 0)) {
      setError("At least one day of week must be selected");
      return;
    }

    const submitData: PricingRuleFormData = { ...formData };

    if (pricingMode === "fixed" && !isDiscountType && !isLastMinute) {
      submitData.priceModifier = undefined;
    } else if (pricingMode === "modifier" && !isDiscountType && !isLastMinute) {
      submitData.pricePerNight = undefined;
      submitData.priceModifier = {
        type: modifierType,
        value: formData.priceModifier?.value || 0,
      };
    }

    if (!needsDates) {
      submitData.startDate = undefined;
      submitData.endDate = undefined;
    }

    if (!needsDaysOfWeek) {
      submitData.daysOfWeek = undefined;
    }

    try {
      await onSubmit(submitData);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to save pricing rule");
    }
  };

  const previewPrice = calculatePreviewPrice();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {editingRule ? "Edit Pricing Rule" : "Create Pricing Rule"}
          </DialogTitle>
          <DialogDescription>
            Configure pricing rules for this unit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ruleName">Rule Name</Label>
            <Input
              id="ruleName"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Winter Peak Season"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ruleType">Rule Type</Label>
            <Select
              value={formData.ruleType}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  ruleType: value as PricingRuleType,
                }))
              }
            >
              <SelectTrigger id="ruleType">
                <SelectValue placeholder="Select rule type" />
              </SelectTrigger>
              <SelectContent>
                {RULE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {RULE_TYPE_OPTIONS.find((o) => o.value === formData.ruleType)?.description}
            </p>
          </div>

          {needsDates && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ruleStartDate">Start Date</Label>
                <Input
                  id="ruleStartDate"
                  type="date"
                  value={formData.startDate || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruleEndDate">End Date</Label>
                <Input
                  id="ruleEndDate"
                  type="date"
                  value={formData.endDate || ""}
                  min={formData.startDate || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
          )}

          {needsDaysOfWeek && (
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_OF_WEEK_OPTIONS.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    size="sm"
                    variant={
                      formData.daysOfWeek?.includes(day.value)
                        ? "default"
                        : "outline"
                    }
                    onClick={() => toggleDayOfWeek(day.value)}
                    className="w-12"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {!isDiscountType && !isLastMinute && (
            <>
              <div className="space-y-2">
                <Label>Pricing Mode</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={pricingMode === "fixed" ? "default" : "outline"}
                    onClick={() => setPricingMode("fixed")}
                  >
                    Fixed Price
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={pricingMode === "modifier" ? "default" : "outline"}
                    onClick={() => setPricingMode("modifier")}
                  >
                    Price Modifier
                  </Button>
                </div>
              </div>

              {pricingMode === "fixed" ? (
                <div className="space-y-2">
                  <Label htmlFor="pricePerNight">Price Per Night ($)</Label>
                  <Input
                    id="pricePerNight"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricePerNight ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pricePerNight: e.target.value ? parseFloat(e.target.value) : undefined,
                      }))
                    }
                    placeholder="Enter price per night"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Modifier Type</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={modifierType === "percentage" ? "default" : "outline"}
                        onClick={() => setModifierType("percentage")}
                      >
                        Percentage (%)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={modifierType === "fixed" ? "default" : "outline"}
                        onClick={() => setModifierType("fixed")}
                      >
                        Fixed ($)
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modifierValue">
                      {modifierType === "percentage"
                        ? "Percentage Adjustment (%)"
                        : "Fixed Adjustment ($)"}
                    </Label>
                    <Input
                      id="modifierValue"
                      type="number"
                      step={modifierType === "percentage" ? "1" : "0.01"}
                      value={formData.priceModifier?.value ?? ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          priceModifier: {
                            type: modifierType,
                            value: e.target.value ? parseFloat(e.target.value) : 0,
                          },
                        }))
                      }
                      placeholder={
                        modifierType === "percentage"
                          ? "e.g. 20 for +20%, -10 for -10%"
                          : "e.g. 50 for +$50, -25 for -$25"
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {isLastMinute && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="daysBeforeCheckIn">Days Before Check-in</Label>
                <Input
                  id="daysBeforeCheckIn"
                  type="number"
                  min="1"
                  value={formData.lastMinutePricing?.daysBeforeCheckIn ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastMinutePricing: {
                        enabled: true,
                        daysBeforeCheckIn: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                        modifier: prev.lastMinutePricing?.modifier,
                      },
                    }))
                  }
                  placeholder="e.g. 7"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Modifier Type</Label>
                  <Select
                    value={formData.lastMinutePricing?.modifier?.type || "percentage"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        lastMinutePricing: {
                          enabled: true,
                          daysBeforeCheckIn: prev.lastMinutePricing?.daysBeforeCheckIn,
                          modifier: {
                            type: value as "fixed" | "percentage",
                            value: prev.lastMinutePricing?.modifier?.value || 0,
                          },
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastMinuteValue">Value</Label>
                  <Input
                    id="lastMinuteValue"
                    type="number"
                    step="0.01"
                    value={formData.lastMinutePricing?.modifier?.value ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lastMinutePricing: {
                          enabled: true,
                          daysBeforeCheckIn: prev.lastMinutePricing?.daysBeforeCheckIn,
                          modifier: {
                            type: prev.lastMinutePricing?.modifier?.type || "percentage",
                            value: e.target.value ? parseFloat(e.target.value) : 0,
                          },
                        },
                      }))
                    }
                    placeholder="e.g. -15"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.ruleType === PricingRuleType.LONG_TERM_DISCOUNT && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="weeklyPercent">Weekly Discount (%)</Label>
                <Input
                  id="weeklyPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.longTermDiscount?.weeklyPercent ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      longTermDiscount: {
                        ...prev.longTermDiscount,
                        weeklyPercent: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      },
                    }))
                  }
                  placeholder="e.g. 10 for 10% off weekly stays"
                />
                <p className="text-xs text-muted-foreground">
                  Applied for stays of 7+ nights
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyPercent">Monthly Discount (%)</Label>
                <Input
                  id="monthlyPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.longTermDiscount?.monthlyPercent ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      longTermDiscount: {
                        ...prev.longTermDiscount,
                        monthlyPercent: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      },
                    }))
                  }
                  placeholder="e.g. 25 for 25% off monthly stays"
                />
                <p className="text-xs text-muted-foreground">
                  Applied for stays of 30+ nights
                </p>
              </div>
            </div>
          )}

          {formData.ruleType === PricingRuleType.EARLY_BIRD_DISCOUNT && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Advance Booking Discount Tiers</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addAdvanceDiscount}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Tier
                </Button>
              </div>
              {(formData.advanceBookingDiscounts || []).map((discount, index) => (
                <div
                  key={index}
                  className="flex items-end gap-2 rounded-lg border p-3"
                >
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Days Ahead</Label>
                    <Input
                      type="number"
                      min="1"
                      value={discount.daysAhead}
                      onChange={(e) =>
                        updateAdvanceDiscount(
                          index,
                          "daysAhead",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Discount (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={discount.discountPercent}
                      onChange={(e) =>
                        updateAdvanceDiscount(
                          index,
                          "discountPercent",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeAdvanceDiscount(index)}
                    className="text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(!formData.advanceBookingDiscounts ||
                formData.advanceBookingDiscounts.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No discount tiers added. Click &quot;Add Tier&quot; to create one.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimumStay">Minimum Stay (nights)</Label>
              <Input
                id="minimumStay"
                type="number"
                min="1"
                value={formData.minimumStay ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    minimumStay: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maximumStay">Maximum Stay (nights)</Label>
              <Input
                id="maximumStay"
                type="number"
                min="1"
                value={formData.maximumStay ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maximumStay: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  }))
                }
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority (0-100)</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="100"
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Higher priority rules take precedence
              </p>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="ruleActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
              <Label htmlFor="ruleActive" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>

          {previewPrice !== null && baseRentPerNight > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price Preview</span>
                  <div className="flex items-center gap-2">
                    <span className="line-through text-muted-foreground">
                      ${baseRentPerNight.toFixed(2)}
                    </span>
                    <Badge
                      variant={
                        previewPrice > baseRentPerNight ? "destructive" : "default"
                      }
                    >
                      ${previewPrice.toFixed(2)}/night
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Saving..."
                : editingRule
                ? "Update Rule"
                : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
