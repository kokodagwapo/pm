"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { UserRole } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Inbox, RefreshCw } from "lucide-react";

type DemoLeadRow = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  createdAt: string | null;
};

export default function AdminDemoLeadsPage() {
  const { t } = useLocalizationContext();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<DemoLeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo-leads?page=1&limit=100");
      const json = (await res.json()) as {
        success?: boolean;
        data?: { items?: DemoLeadRow[] };
        pagination?: { total?: number };
        error?: string;
      };
      if (!res.ok || !json.success) {
        setError(json.error || t("dashboard.admin.demoLeads.loadError"));
        setRows([]);
        return;
      }
      setRows(json.data?.items ?? []);
      setTotal(json.pagination?.total ?? json.data?.items?.length ?? 0);
    } catch {
      setError(t("dashboard.admin.demoLeads.loadError"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === UserRole.ADMIN) {
      void load();
    }
  }, [status, session, load]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (session?.user?.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Inbox className="h-7 w-7 text-rose-200/90" aria-hidden />
            {t("dashboard.admin.demoLeads.title")}
          </h1>
          <p className="mt-1 text-sm text-white/55">
            {t("dashboard.admin.demoLeads.subtitle")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
          className="border-white/20 bg-white/5 text-white hover:bg-white/10"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("dashboard.admin.demoLeads.refresh")}
        </Button>
      </div>

      <Card className="border-white/15 bg-white/[0.06] text-white/90 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-white">
            {t("dashboard.admin.demoLeads.tableTitle")}
          </CardTitle>
          <CardDescription className="text-white/50">
            {t("dashboard.admin.demoLeads.tableHint", {
              values: { count: String(total) },
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
              {error}
            </p>
          )}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-white/50">{t("dashboard.admin.demoLeads.empty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/70">
                      {t("dashboard.admin.demoLeads.col.name")}
                    </TableHead>
                    <TableHead className="text-white/70">
                      {t("dashboard.admin.demoLeads.col.phone")}
                    </TableHead>
                    <TableHead className="text-white/70">
                      {t("dashboard.admin.demoLeads.col.email")}
                    </TableHead>
                    <TableHead className="text-white/70 text-right">
                      {t("dashboard.admin.demoLeads.col.submitted")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-white/10">
                      <TableCell className="font-medium text-white/90">
                        {row.fullName}
                      </TableCell>
                      <TableCell className="text-white/75">{row.phone}</TableCell>
                      <TableCell>
                        <a
                          href={`mailto:${row.email}`}
                          className="text-sky-300/90 underline-offset-2 hover:underline"
                        >
                          {row.email}
                        </a>
                      </TableCell>
                      <TableCell className="text-right text-sm text-white/55 whitespace-nowrap">
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
