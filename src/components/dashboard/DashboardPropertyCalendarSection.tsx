"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ExternalLink,
  Filter,
  Lock,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AvailabilityCalendar,
  CalendarBlock,
  CalendarLease,
  CalendarPricingRule,
  CalendarRentalRequest,
  DateSelection,
} from "@/components/calendar/AvailabilityCalendar";
import { DateBlockForm, DateBlockFormData } from "@/components/calendar/DateBlockForm";
import { PricingRuleForm, PricingRuleFormData } from "@/components/calendar/PricingRuleForm";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { cn } from "@/lib/utils";

interface PropertyListItem {
  _id: string;
  name: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

interface UnitOption {
  _id: string;
  unitNumber: string;
  rentAmount: number;
  status: string;
}

const SIDEBAR_PAGE_SIZE = 5;

const BLOCK_TYPE_LABELS: Record<string, string> = {
  owner_stay: "Owner Stay",
  maintenance: "Maintenance",
  hold: "Hold",
  renovation: "Renovation",
  personal: "Personal",
  seasonal_closure: "Seasonal Closure",
};

function formatAddress(addr?: PropertyListItem["address"]) {
  if (!addr) return "";
  const parts = [addr.street, addr.city, addr.state].filter(Boolean);
  return parts.join(", ");
}

export function DashboardPropertyCalendarSection() {
  const { data: session } = useSession();
  const { t } = useLocalizationContext();
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;

  const userRole = (session?.user as { role?: string })?.role || "tenant";
  const canManage =
    userRole === "admin" || userRole === "manager" || userRole === "owner";
  const blockFormRole = (
    userRole === "admin" || userRole === "manager" || userRole === "owner"
      ? userRole
      : "manager"
  ) as "admin" | "manager" | "owner";

  const filterSelectTrigger = (widthClass: string) =>
    cn(
      "h-10 shrink-0 backdrop-blur-sm transition-[background-color,border-color] duration-200",
      widthClass,
      isLight
        ? "border-slate-200/80 bg-white/75 text-slate-900 shadow-sm hover:bg-white/90 [&_svg]:text-slate-500"
        : "border-white/18 bg-white/[0.08] text-white shadow-none hover:bg-white/[0.11] [&_svg]:text-white/65"
    );

  const toolbarOutlineClass = cn(
    isLight
      ? "border-slate-200/80 bg-white/75 backdrop-blur-sm shadow-sm hover:bg-white/90"
      : "border-white/18 bg-white/[0.08] backdrop-blur-sm shadow-none hover:bg-white/[0.12]"
  );

  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarPage, setSidebarPage] = useState(0);
  const [sidebarListLoading, setSidebarListLoading] = useState(true);
  const [sidebarProperties, setSidebarProperties] = useState<PropertyListItem[]>([]);

  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [property, setProperty] = useState<PropertyListItem | null>(null);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [propertyLoading, setPropertyLoading] = useState(false);

  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [pricingRules, setPricingRules] = useState<CalendarPricingRule[]>([]);
  const [leases, setLeases] = useState<CalendarLease[]>([]);
  const [rentalRequests, setRentalRequests] = useState<CalendarRentalRequest[]>([]);
  const [blockFilterType, setBlockFilterType] = useState<string>("all");

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockFormTarget, setBlockFormTarget] = useState<"unit" | "all">("unit");
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [blockFormDates, setBlockFormDates] = useState<{ start?: string; end?: string }>({});
  const [pricingFormDates, setPricingFormDates] = useState<{ start?: string; end?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSidebarListLoading(true);
      try {
        const res = await fetch("/api/properties?limit=200");
        const body = await res.json();
        const raw = body.data;
        const list = Array.isArray(raw)
          ? raw
          : raw && typeof raw === "object" && Array.isArray((raw as { properties?: unknown }).properties)
            ? (raw as { properties: PropertyListItem[] }).properties
            : [];
        if (!cancelled) setSidebarProperties(list);
      } catch {
        if (!cancelled) setSidebarProperties([]);
      } finally {
        if (!cancelled) setSidebarListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSidebarProperties = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    if (!q) return sidebarProperties;
    return sidebarProperties.filter((p) => {
      const addr = formatAddress(p.address).toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        addr.includes(q) ||
        p.address?.city?.toLowerCase().includes(q) ||
        p.address?.street?.toLowerCase().includes(q)
      );
    });
  }, [sidebarProperties, sidebarSearch]);

  const sidebarTotalPages = Math.max(
    1,
    Math.ceil(filteredSidebarProperties.length / SIDEBAR_PAGE_SIZE)
  );

  const paginatedSidebarProperties = useMemo(() => {
    const start = sidebarPage * SIDEBAR_PAGE_SIZE;
    return filteredSidebarProperties.slice(start, start + SIDEBAR_PAGE_SIZE);
  }, [filteredSidebarProperties, sidebarPage]);

  useEffect(() => {
    if (filteredSidebarProperties.length === 0) {
      setSidebarPage(0);
      return;
    }
    if (propertyId) {
      const idx = filteredSidebarProperties.findIndex((p) => p._id === propertyId);
      if (idx >= 0) {
        setSidebarPage(Math.floor(idx / SIDEBAR_PAGE_SIZE));
        return;
      }
    }
    setSidebarPage((p) => Math.min(p, Math.max(0, sidebarTotalPages - 1)));
  }, [sidebarSearch, propertyId, filteredSidebarProperties, sidebarTotalPages]);

  const loadProperty = useCallback(async (id: string) => {
    setPropertyLoading(true);
    try {
      const res = await fetch(`/api/properties/${id}`);
      if (!res.ok) throw new Error("Failed to load property");
      const body = await res.json();
      const prop = (body.data ?? body) as PropertyListItem & { units?: UnitOption[] };
      setProperty({ _id: prop._id, name: prop.name, address: prop.address });
      const u = Array.isArray(prop.units) ? prop.units : [];
      setUnits(u);
      setPropertyId(id);
      if (u.length > 0) {
        setSelectedUnitId((prev) => (u.some((x) => x._id === prev) ? prev : u[0]._id));
      } else {
        setSelectedUnitId("");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load property");
      setProperty(null);
      setPropertyId(null);
      setUnits([]);
      setSelectedUnitId("");
    } finally {
      setPropertyLoading(false);
    }
  }, []);

  const fetchUnitCalendarData = useCallback(
    async (pid: string, unitId: string) => {
      if (!pid || !unitId) return;
      try {
        const [blocksRes, rulesRes, leasesRes, requestsRes] = await Promise.all([
          fetch(`/api/properties/${pid}/units/${unitId}/blocks`),
          fetch(`/api/properties/${pid}/units/${unitId}/pricing-rules?activeOnly=true`),
          fetch(`/api/leases?propertyId=${pid}&unitId=${unitId}&status=active,pending`).catch(
            () => null
          ),
          fetch(`/api/rental-requests?propertyId=${pid}&unitId=${unitId}&status=pending`).catch(
            () => null
          ),
        ]);

        if (blocksRes.ok) {
          const blocksData = await blocksRes.json();
          setBlocks(blocksData.data || []);
        } else setBlocks([]);

        if (rulesRes.ok) {
          const rulesData = await rulesRes.json();
          setPricingRules(rulesData.data || []);
        } else setPricingRules([]);

        if (leasesRes?.ok) {
          const leasesData = await leasesRes.json();
          const leasesArr = leasesData.data?.leases || leasesData.data || [];
          setLeases(
            leasesArr.map((l: Record<string, unknown>) => ({
              _id: String(l._id),
              startDate: l.startDate as string,
              endDate: l.endDate as string,
              status: String(l.status),
              tenantName:
                (l.tenantId as { firstName?: string; lastName?: string } | undefined)?.firstName != null
                  ? `${(l.tenantId as { firstName: string }).firstName} ${(l.tenantId as { lastName?: string }).lastName || ""}`
                  : undefined,
            }))
          );
        } else setLeases([]);

        if (requestsRes?.ok) {
          const requestsData = await requestsRes.json();
          const requestsArr = requestsData.data?.requests || requestsData.data || [];
          setRentalRequests(Array.isArray(requestsArr) ? requestsArr : []);
        } else setRentalRequests([]);
      } catch {
        toast.error("Failed to load calendar data");
      }
    },
    []
  );

  useEffect(() => {
    if (propertyId && selectedUnitId) {
      fetchUnitCalendarData(propertyId, selectedUnitId);
    } else {
      setBlocks([]);
      setPricingRules([]);
      setLeases([]);
      setRentalRequests([]);
    }
  }, [propertyId, selectedUnitId, fetchUnitCalendarData]);

  const handleBlockCreate = useCallback((selection: DateSelection) => {
    setBlockFormTarget("unit");
    setBlockFormDates({
      start: selection.startDate.toISOString(),
      end: selection.endDate.toISOString(),
    });
    setShowBlockForm(true);
  }, []);

  const handlePricingCreate = useCallback((selection: DateSelection) => {
    setPricingFormDates({
      start: selection.startDate.toISOString(),
      end: selection.endDate.toISOString(),
    });
    setShowPricingForm(true);
  }, []);

  const handleBlockSubmit = async (data: DateBlockFormData) => {
    if (!propertyId || !selectedUnitId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/units/${selectedUnitId}/blocks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create block");
      }
      toast.success("Date block created");
      await fetchUnitCalendarData(propertyId, selectedUnitId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create date block");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkBlockSubmit = async (data: DateBlockFormData) => {
    if (!propertyId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create bulk block");
      }
      const result = await res.json();
      const summary = result.data?.summary;
      toast.success(
        summary
          ? `Blocked ${summary.unitsBlocked} of ${summary.totalUnits} units`
          : "Bulk block created"
      );
      if (selectedUnitId) await fetchUnitCalendarData(propertyId, selectedUnitId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create bulk block");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePricingSubmit = async (data: PricingRuleFormData) => {
    if (!propertyId || !selectedUnitId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/units/${selectedUnitId}/pricing-rules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create pricing rule");
      }
      toast.success("Pricing rule created");
      await fetchUnitCalendarData(propertyId, selectedUnitId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create pricing rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitBlockForm = async (data: DateBlockFormData) => {
    if (blockFormTarget === "all") {
      await handleBulkBlockSubmit(data);
    } else {
      await handleBlockSubmit(data);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!propertyId || !selectedUnitId) return;
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/units/${selectedUnitId}/blocks?blockId=${blockId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete block");
      }
      toast.success("Block removed");
      await fetchUnitCalendarData(propertyId, selectedUnitId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const selectedUnit = units.find((u) => u._id === selectedUnitId);
  const baseRentPerNight = selectedUnit?.rentAmount ? selectedUnit.rentAmount / 30 : 0;

  const filteredBlocks = useMemo(
    () =>
      blockFilterType === "all" ? blocks : blocks.filter((b) => b.blockType === blockFilterType),
    [blocks, blockFilterType]
  );

  return (
    <div className="w-full space-y-3">
      <div>
        <h2
          className={cn(
            "text-lg font-semibold tracking-tight sm:text-xl",
            isLight ? "text-slate-900" : "text-white"
          )}
        >
          {t("dashboard.propertyCalendar.title")}
        </h2>
        <p
          className={cn(
            "mt-0.5 text-sm",
            isLight ? "text-slate-600" : "text-white/75"
          )}
        >
          {t("dashboard.propertyCalendar.subtitle")}
        </p>
      </div>

      <Card
        className={cn(
          "w-full overflow-hidden rounded-3xl border shadow-xl backdrop-blur-xl transition-shadow duration-300",
          isLight
            ? "border-slate-200/90 bg-gradient-to-br from-white via-white to-sky-50/40 shadow-slate-900/[0.06]"
            : "border-white/10 bg-gradient-to-br from-slate-950/55 via-slate-900/35 to-cyan-950/20 shadow-black/25"
        )}
      >
        <div className="flex min-h-0 flex-col lg:min-h-[520px] lg:flex-row lg:items-stretch">
          {/* Property rail — replaces combobox */}
          <aside
            className={cn(
              "flex max-h-[min(340px,46vh)] shrink-0 flex-col border-b lg:max-h-none lg:w-[min(100%,288px)] lg:border-b-0 lg:border-r",
              isLight
                ? "border-slate-200/70 bg-slate-50/40"
                : "border-white/[0.08] bg-black/15"
            )}
            aria-label={t("dashboard.propertyCalendar.sidebarTitle")}
          >
            <div
              className={cn(
                "shrink-0 border-b px-4 pb-3 pt-4",
                isLight ? "border-slate-200/60" : "border-white/[0.08]"
              )}
            >
              <p
                className={cn(
                  "text-[0.65rem] font-semibold uppercase tracking-[0.2em]",
                  isLight ? "text-slate-500" : "text-white/45"
                )}
              >
                {t("dashboard.propertyCalendar.sidebarTitle")}
              </p>
              <div className="relative mt-3">
                <Search
                  className={cn(
                    "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2",
                    isLight ? "text-slate-400" : "text-white/35"
                  )}
                  aria-hidden
                />
                <input
                  type="search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t("dashboard.propertyCalendar.searchPlaceholder")}
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className={cn(
                    "h-9 w-full rounded-xl border pl-9 pr-3 text-sm outline-none transition-[border-color,box-shadow]",
                    isLight
                      ? "border-slate-200/90 bg-white/80 text-slate-900 placeholder:text-slate-400 focus:border-sky-300/80 focus:ring-2 focus:ring-sky-200/50"
                      : "border-white/12 bg-white/[0.06] text-white placeholder:text-white/35 focus:border-white/25 focus:ring-2 focus:ring-white/10"
                  )}
                />
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <div
                className="shrink-0 px-2 py-2 lg:py-3"
                role="listbox"
                aria-label={t("dashboard.propertyCalendar.pickProperty")}
              >
                {sidebarListLoading ? (
                  <div className="space-y-2 px-2 py-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-[3.25rem] animate-pulse rounded-xl",
                          isLight ? "bg-slate-200/40" : "bg-white/[0.06]"
                        )}
                      />
                    ))}
                  </div>
                ) : filteredSidebarProperties.length === 0 ? (
                  <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                    {sidebarSearch.trim()
                      ? t("dashboard.propertyCalendar.noResults")
                      : t("dashboard.propertyCalendar.noPropertiesInList")}
                  </p>
                ) : (
                  <ul className="space-y-1 pb-1">
                    {paginatedSidebarProperties.map((p) => {
                    const selected = propertyId === p._id;
                    const addr = formatAddress(p.address);
                    return (
                      <li key={p._id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={cn(
                            "group flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200",
                            selected
                              ? isLight
                                ? "bg-white shadow-sm ring-1 ring-sky-200/80"
                                : "bg-white/[0.12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
                              : isLight
                                ? "hover:bg-white/70"
                                : "hover:bg-white/[0.07]"
                          )}
                          onClick={() => void loadProperty(p._id)}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                              selected
                                ? isLight
                                  ? "border-sky-500 bg-sky-500 text-white"
                                  : "border-cyan-400/60 bg-cyan-500/25 text-cyan-100"
                                : isLight
                                  ? "border-slate-200 bg-transparent"
                                  : "border-white/15 bg-transparent"
                            )}
                            aria-hidden
                          >
                            {selected ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "truncate font-medium leading-snug tracking-tight",
                                isLight ? "text-slate-900" : "text-white/95"
                              )}
                            >
                              {p.name}
                            </p>
                            {addr ? (
                              <p className="mt-0.5 flex items-start gap-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                <MapPin className="mt-0.5 h-3 w-3 shrink-0 opacity-60" aria-hidden />
                                <span>{addr}</span>
                              </p>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  </ul>
                )}
              </div>

              {!sidebarListLoading &&
                filteredSidebarProperties.length > SIDEBAR_PAGE_SIZE && (
                  <div
                    className={cn(
                      "mt-auto flex shrink-0 items-center justify-between gap-2 border-t px-2 py-2.5",
                      isLight ? "border-slate-200/60" : "border-white/[0.08]"
                    )}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 shrink-0 rounded-lg",
                        isLight ? "hover:bg-slate-200/60" : "hover:bg-white/10"
                      )}
                      disabled={sidebarPage <= 0}
                      aria-label={t("dashboard.propertyCalendar.sidebarPrevPage")}
                      onClick={() => setSidebarPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span
                      className={cn(
                        "min-w-0 flex-1 text-center text-[0.7rem] tabular-nums leading-tight",
                        isLight ? "text-slate-600" : "text-white/55"
                      )}
                    >
                      {t("dashboard.propertyCalendar.sidebarPagination", {
                        values: {
                          start:
                            filteredSidebarProperties.length === 0
                              ? 0
                              : sidebarPage * SIDEBAR_PAGE_SIZE + 1,
                          end: Math.min(
                            (sidebarPage + 1) * SIDEBAR_PAGE_SIZE,
                            filteredSidebarProperties.length
                          ),
                          total: filteredSidebarProperties.length,
                        },
                      })}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 shrink-0 rounded-lg",
                        isLight ? "hover:bg-slate-200/60" : "hover:bg-white/10"
                      )}
                      disabled={sidebarPage >= sidebarTotalPages - 1}
                      aria-label={t("dashboard.propertyCalendar.sidebarNextPage")}
                      onClick={() =>
                        setSidebarPage((p) => Math.min(sidebarTotalPages - 1, p + 1))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <CardHeader className="min-w-0 w-full space-y-4 pb-4 pt-5 sm:pt-6">
              <div className="flex min-w-0 w-full flex-col gap-4">
                <div className="min-w-0 w-full max-w-full space-y-2">
                  <CardTitle
                    className={cn(
                      "flex w-full min-w-0 max-w-full flex-row flex-wrap items-center gap-x-2 gap-y-1 text-lg font-semibold tracking-tight sm:text-xl",
                      isLight ? "text-slate-900" : undefined
                    )}
                  >
                    <span className="inline-flex min-w-0 max-w-full items-center gap-2">
                      <CalendarDays className="h-5 w-5 shrink-0 opacity-90" />
                      <span className="min-w-0 whitespace-normal">
                        {t("dashboard.propertyCalendar.cardTitle")}
                      </span>
                    </span>
                    {property && (
                      <span
                        className={cn(
                          "min-w-0 max-w-full text-sm font-normal leading-snug sm:max-w-[min(100%,42rem)]",
                          isLight ? "text-slate-600" : "text-white/75"
                        )}
                      >
                        <span
                          className={cn(
                            "mr-1.5 inline",
                            isLight ? "text-slate-400" : "text-white/45"
                          )}
                        >
                          ·
                        </span>
                        <span className="break-words">{property.name}</span>
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="max-w-full text-pretty leading-relaxed">
                    {t("dashboard.propertyCalendar.cardDescription")}
                  </CardDescription>
                </div>

                <div className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
              {units.length > 0 && (
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger className={cn(filterSelectTrigger("w-full sm:w-[240px]"))}>
                    <SelectValue placeholder={t("dashboard.propertyCalendar.selectUnit")} />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit._id} value={unit._id}>
                        {t("dashboard.propertyCalendar.unitLabel", {
                          values: {
                            number: unit.unitNumber,
                            rent: unit.rentAmount,
                          },
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!propertyId || !selectedUnitId}
                onClick={() => {
                  if (propertyId && selectedUnitId)
                    fetchUnitCalendarData(propertyId, selectedUnitId);
                }}
                className={toolbarOutlineClass}
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                {t("dashboard.actions.refresh")}
              </Button>
              {canManage && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!propertyId || !selectedUnitId}
                    onClick={() => {
                      setBlockFormTarget("unit");
                      setBlockFormDates({});
                      setShowBlockForm(true);
                    }}
                    className={toolbarOutlineClass}
                  >
                    <Lock className="mr-1 h-4 w-4" />
                    {t("dashboard.propertyCalendar.blockDates")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!propertyId || !selectedUnitId}
                    onClick={() => {
                      setPricingFormDates({});
                      setShowPricingForm(true);
                    }}
                    className={toolbarOutlineClass}
                  >
                    <DollarSign className="mr-1 h-4 w-4" />
                    {t("dashboard.propertyCalendar.addPricing")}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!propertyId}
                        className={toolbarOutlineClass}
                      >
                        <MoreHorizontal className="mr-1 h-4 w-4" />
                        {t("dashboard.propertyCalendar.moreActions")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild disabled={!propertyId}>
                        <Link
                          href={propertyId ? `/dashboard/properties/${propertyId}/calendar` : "#"}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {t("dashboard.propertyCalendar.openFullCalendar")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/leases/new" className="flex cursor-pointer items-center gap-2">
                          <Plus className="h-4 w-4" />
                          {t("dashboard.propertyCalendar.bookLease")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/dashboard/maintenance/new"
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <Wrench className="h-4 w-4" />
                          {t("dashboard.propertyCalendar.addMaintenance")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!propertyId || !selectedUnitId}
                        onSelect={() => {
                          setBlockFormTarget("unit");
                          setBlockFormDates({});
                          setShowBlockForm(true);
                          toast.info(t("dashboard.propertyCalendar.activityHintTitle"), {
                            description: t("dashboard.propertyCalendar.activityHintBody"),
                          });
                        }}
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        {t("dashboard.propertyCalendar.scheduleActivity")}
                      </DropdownMenuItem>
                      {units.length > 1 && (
                        <DropdownMenuItem
                          disabled={!propertyId}
                          onSelect={() => {
                            setBlockFormTarget("all");
                            setBlockFormDates({});
                            setShowBlockForm(true);
                          }}
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          {t("dashboard.propertyCalendar.blockAllUnits")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6 pt-0 sm:px-6">
          {!propertyId && !propertyLoading && (
            <div
              className={cn(
                "flex min-h-[min(320px,50vh)] flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center",
                isLight
                  ? "border-slate-200/80 bg-white/30"
                  : "border-white/[0.12] bg-white/[0.02]"
              )}
            >
              <Building2
                className={cn(
                  "mb-4 h-12 w-12",
                  isLight ? "text-slate-300" : "text-white/25"
                )}
                aria-hidden
              />
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                {t("dashboard.propertyCalendar.emptyState")}
              </p>
            </div>
          )}
          {propertyLoading && (
            <div className="space-y-3 py-6">
              <div className="h-64 animate-pulse rounded-xl bg-muted" />
            </div>
          )}
          {propertyId && !propertyLoading && selectedUnitId && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
              <TabsList
                className={cn(
                  "grid h-11 w-full grid-cols-2 rounded-2xl p-1 sm:inline-flex sm:w-auto",
                  isLight
                    ? "border border-slate-200/80 text-slate-900 [&_svg]:text-slate-700"
                    : "border border-white/12"
                )}
              >
                <TabsTrigger value="calendar" className="gap-1.5 rounded-xl">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  {t("dashboard.propertyCalendar.tabCalendar")}
                </TabsTrigger>
                <TabsTrigger value="blocks" className="gap-1.5 rounded-xl">
                  <Lock className="h-4 w-4 shrink-0" />
                  {t("dashboard.propertyCalendar.tabBlocks", { values: { count: blocks.length } })}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="calendar" className="mt-0">
                <div
                  className={cn(
                    "rounded-2xl border p-4 sm:p-6",
                    isLight
                      ? "border-slate-200/80 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                      : "border-white/10 bg-white/[0.04] shadow-inner"
                  )}
                >
                  <AvailabilityCalendar
                    blocks={blocks}
                    pricingRules={pricingRules}
                    leases={leases}
                    rentalRequests={rentalRequests}
                    baseRentPerNight={baseRentPerNight}
                    onDateSelect={() => {}}
                    onBlockCreate={canManage ? handleBlockCreate : undefined}
                    onPricingCreate={canManage ? handlePricingCreate : undefined}
                    readOnly={!canManage}
                    showPricing
                    showLegend
                    monthsShown={1}
                    daySize="comfortable"
                    selectionMode="two-click"
                    className="w-full"
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("dashboard.propertyCalendar.leaseHint")}
                </p>
              </TabsContent>

              <TabsContent value="blocks" className="mt-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={blockFilterType} onValueChange={setBlockFilterType}>
                    <SelectTrigger className={filterSelectTrigger("w-full sm:w-[200px]")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("dashboard.propertyCalendar.filterAllBlocks")}</SelectItem>
                      {Object.entries(BLOCK_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filteredBlocks.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("dashboard.propertyCalendar.noBlocks")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredBlocks.map((block) => (
                      <div
                        key={block._id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3",
                          isLight ? "border-slate-200/90 bg-white/70" : "border-border"
                        )}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {block.isHardBlock && <Lock className="h-3.5 w-3.5 text-red-500" />}
                            <Badge variant="secondary">
                              {BLOCK_TYPE_LABELS[block.blockType] || block.blockType}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">
                            {new Date(block.startDate).toLocaleDateString()} –{" "}
                            {new Date(block.endDate).toLocaleDateString()}
                          </p>
                          {block.reason && (
                            <p className="text-xs text-muted-foreground">{block.reason}</p>
                          )}
                        </div>
                        {canManage && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBlock(block._id)}
                            aria-label={t("dashboard.propertyCalendar.removeBlock")}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          {propertyId && !propertyLoading && !selectedUnitId && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("dashboard.propertyCalendar.noUnits")}
            </p>
          )}
        </CardContent>
          </div>
        </div>
      </Card>

      <DateBlockForm
        open={showBlockForm}
        onOpenChange={setShowBlockForm}
        onSubmit={submitBlockForm}
        initialStartDate={blockFormDates.start}
        initialEndDate={blockFormDates.end}
        userRole={blockFormRole}
        isLoading={isSubmitting}
      />
      <PricingRuleForm
        open={showPricingForm}
        onOpenChange={setShowPricingForm}
        onSubmit={handlePricingSubmit}
        initialStartDate={pricingFormDates.start}
        initialEndDate={pricingFormDates.end}
        baseRentPerNight={baseRentPerNight}
        isLoading={isSubmitting}
      />
    </div>
  );
}
