"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ResponsiveLayout } from "@/components/layout/responsive-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserRole } from "@/types";
import { RENEWAL_OPPORTUNITY_STATUSES } from "@/models/RenewalOpportunity";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { cn } from "@/lib/utils";

type PopulatedOpp = {
  _id: string;
  status: string;
  notes?: string;
  nextContactAt?: string;
  leaseId?: { endDate?: string; startDate?: string; status?: string };
  tenantId?: { firstName?: string; lastName?: string; email?: string };
  propertyId?: { name?: string; address?: { city?: string; state?: string } };
};

export default function RenewalsPage() {
  const { data: session, status } = useSession();
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;
  const [items, setItems] = useState<PopulatedOpp[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const allowed =
    session?.user?.role === UserRole.ADMIN ||
    session?.user?.role === UserRole.MANAGER;

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/renewal-opportunities");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      const data = json?.data ?? json;
      setItems(data?.opportunities ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    if (status === "authenticated" && allowed) load();
  }, [status, allowed, load]);

  const runSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/renewal-opportunities/sync", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Sync failed");
      const data = json?.data ?? json;
      toast.success(
        `Synced: ${data?.created ?? 0} created, ${data?.skippedExisting ?? 0} already tracked`
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const saveRow = async (id: string, patch: Record<string, unknown>) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/renewal-opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");
      toast.success("Saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  if (status === "loading") {
    return (
      <ResponsiveLayout>
        <div className="animate-pulse rounded-xl bg-white/5 p-8">Loading…</div>
      </ResponsiveLayout>
    );
  }

  if (!allowed) {
    return (
      <ResponsiveLayout>
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Renewal pipeline</CardTitle>
            <CardDescription>
              Only property managers and admins can view renewal opportunities.
            </CardDescription>
          </CardHeader>
        </Card>
      </ResponsiveLayout>
    );
  }

  const muted = isLight ? "text-slate-600" : "text-white/75";
  const titleCls = isLight ? "text-slate-900" : "text-white";

  return (
    <ResponsiveLayout className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className={cn(
              "inline-flex items-center gap-1 text-sm",
              muted,
              "hover:underline"
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <h1 className={cn("text-xl font-semibold tracking-tight", titleCls)}>
            Renewal pipeline
          </h1>
          <p className={cn("text-sm", muted)}>
            Track status from candidate through decision — synced from leases expiring within 90 days.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncing || loading}
          onClick={runSync}
          className={cn(
            "gap-2",
            isLight ? "border-slate-200 bg-white" : "border-white/20 bg-white/5 text-white"
          )}
        >
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          Sync from leases (90d)
        </Button>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-xl bg-white/5 p-10" />
      ) : items.length === 0 ? (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className={titleCls}>No rows yet</CardTitle>
            <CardDescription className={muted}>
              Run <strong>Sync from leases</strong> to create renewal candidates for active leases
              ending in the next 90 days, or add one from the API.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-1">
          {items.map((row) => {
            const lease = row.leaseId as PopulatedOpp["leaseId"];
            const tenant = row.tenantId as PopulatedOpp["tenantId"];
            const prop = row.propertyId as PopulatedOpp["propertyId"];
            const end = lease?.endDate
              ? new Date(lease.endDate).toLocaleDateString()
              : "—";
            const tenantName =
              `${tenant?.firstName ?? ""} ${tenant?.lastName ?? ""}`.trim() ||
              tenant?.email ||
              "Tenant";
            const propLabel =
              prop?.name ||
              [prop?.address?.city, prop?.address?.state]
                .filter(Boolean)
                .join(", ") ||
              "Property";

            return (
              <Card key={row._id} className="rounded-xl">
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className={cn("text-base", titleCls)}>
                        {propLabel}
                      </CardTitle>
                      <CardDescription className={muted}>
                        {tenantName} · Lease ends {end}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={row.status}
                        onValueChange={(status) => saveRow(row._id, { status })}
                        disabled={savingId === row._id}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-[200px]",
                            isLight ? "bg-white" : "bg-white/5 text-white border-white/20"
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RENEWAL_OPPORTUNITY_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    defaultValue={row.notes ?? ""}
                    placeholder="Notes (next step, rent discussion, etc.)"
                    className={cn(
                      "min-h-[72px] text-sm",
                      isLight ? "bg-white" : "bg-white/5 text-white border-white/15"
                    )}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v !== (row.notes ?? "")) {
                        saveRow(row._id, { notes: v });
                      }
                    }}
                    disabled={savingId === row._id}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </ResponsiveLayout>
  );
}
