"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Percent, Save } from "lucide-react";
import {
  DEFAULT_BOOKING_DISCOUNTS,
  normalizeBookingDiscountSettings,
  type BookingDiscountSettings,
  type BookingDiscountTierKey,
} from "@/lib/booking-discounts";

const tierLabels: Record<BookingDiscountTierKey, string> = {
  weekly: "Weekly booking",
  monthly: "Monthly booking",
  bimonthly: "Bi-monthly booking",
};

export function BookingDiscountSettingsCard() {
  const [settings, setSettings] = useState<BookingDiscountSettings>(DEFAULT_BOOKING_DISCOUNTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/booking-discounts")
      .then((res) => res.json())
      .then((data) => {
        setSettings(normalizeBookingDiscountSettings(data?.data?.settings));
      })
      .catch(() => {
        setSettings(DEFAULT_BOOKING_DISCOUNTS);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateTier = (
    tier: BookingDiscountTierKey,
    field: "enabled" | "minNights" | "percent" | "label",
    value: string | number | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        [field]:
          field === "minNights" || field === "percent"
            ? Number(value)
            : value,
      },
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/settings/booking-discounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Failed to save booking discounts");
      }
      setSettings(normalizeBookingDiscountSettings(data?.data?.settings));
      setMessage("Booking discounts saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save booking discounts.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Bulk Booking Discounts</CardTitle>
            <CardDescription>
              Control the public weekly, monthly, and bi-monthly stay discounts shown on property pages and used as pricing fallbacks.
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Percent className="h-3 w-3" />
            Public pricing
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading booking discounts...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {(["weekly", "monthly", "bimonthly"] as BookingDiscountTierKey[]).map((tier) => (
              <div key={tier} className="rounded-xl border p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{tierLabels[tier]}</p>
                    <p className="text-xs text-muted-foreground">{settings[tier].label}</p>
                  </div>
                  <Switch
                    checked={settings[tier].enabled}
                    onCheckedChange={(checked) => updateTier(tier, "enabled", checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${tier}-label`}>Label</Label>
                  <Input
                    id={`${tier}-label`}
                    value={settings[tier].label}
                    onChange={(e) => updateTier(tier, "label", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${tier}-nights`}>Minimum nights</Label>
                  <Input
                    id={`${tier}-nights`}
                    type="number"
                    min={1}
                    value={settings[tier].minNights}
                    onChange={(e) => updateTier(tier, "minNights", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${tier}-percent`}>Discount percent</Label>
                  <Input
                    id={`${tier}-percent`}
                    type="number"
                    min={0}
                    max={100}
                    value={settings[tier].percent}
                    onChange={(e) => updateTier(tier, "percent", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Owners, managers, and admins can update these defaults. Property-specific long-stay pricing rules still take priority.
          </p>
          <Button onClick={saveSettings} disabled={loading || saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save discounts
          </Button>
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
