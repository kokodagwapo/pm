"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronsUpDown,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
      "h-10",
      widthClass,
      isLight
        ? "border-slate-200 bg-white text-slate-900 [&_svg]:text-slate-500"
        : "border-white/20 bg-white/5 text-white [&_svg]:text-white/70"
    );

  const [pickerOpen, setPickerOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerResults, setPickerResults] = useState<PropertyListItem[]>([]);

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
    const id = window.setTimeout(() => setDebouncedSearch(searchInput), 320);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    (async () => {
      setPickerLoading(true);
      try {
        const q = debouncedSearch.trim();
        const url = q
          ? `/api/properties?limit=40&search=${encodeURIComponent(q)}`
          : `/api/properties?limit=40`;
        const res = await fetch(url);
        const body = await res.json();
        const list = Array.isArray(body.data) ? body.data : [];
        if (!cancelled) setPickerResults(list as PropertyListItem[]);
      } catch {
        if (!cancelled) setPickerResults([]);
      } finally {
        if (!cancelled) setPickerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, debouncedSearch]);

  useEffect(() => {
    if (!pickerOpen) return;
    const id = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [pickerOpen]);

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
      toast.error(err instanceof Error ? err.message : "Failed");
      throw err;
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
      toast.error(err instanceof Error ? err.message : "Failed");
      throw err;
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
      toast.error(err instanceof Error ? err.message : "Failed");
      throw err;
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

  const selectedLabel = property
    ? `${property.name}${formatAddress(property.address) ? ` — ${formatAddress(property.address)}` : ""}`
    : t("dashboard.propertyCalendar.pickProperty");

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
          "w-full overflow-hidden rounded-3xl border shadow-xl backdrop-blur-sm transition-shadow",
          isLight
            ? "border-slate-200/90 bg-gradient-to-br from-white via-white to-sky-50/50 shadow-slate-900/[0.08]"
            : "border-white/10 bg-gradient-to-br from-slate-950/50 via-slate-900/40 to-cyan-950/25 shadow-black/30"
        )}
      >
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <CardTitle
                className={cn(
                  "flex items-center gap-2 text-base font-semibold",
                  isLight ? "text-slate-900" : undefined
                )}
              >
                <CalendarDays className="h-5 w-5 shrink-0 opacity-90" />
                {t("dashboard.propertyCalendar.cardTitle")}
              </CardTitle>
              <CardDescription>{t("dashboard.propertyCalendar.cardDescription")}</CardDescription>
              <Popover
                modal={false}
                open={pickerOpen}
                onOpenChange={(o) => {
                  setPickerOpen(o);
                  if (o) {
                    setSearchInput("");
                    setDebouncedSearch("");
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={pickerOpen}
                    className={cn(
                      "h-12 w-full max-w-full justify-between rounded-2xl border px-4 text-left font-normal shadow-sm transition-all hover:shadow-md xl:max-w-xl",
                      isLight
                        ? "border-slate-200/90 bg-white/90 hover:bg-white"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 opacity-60" />
                      <span className="truncate">{selectedLabel}</span>
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={cn(
                    "w-[min(100vw-2rem,440px)] p-0 shadow-2xl",
                    isLight
                      ? "border-slate-200/90 bg-white/95 backdrop-blur-xl"
                      : "border-white/10 bg-slate-950/95 backdrop-blur-xl"
                  )}
                  align="start"
                  sideOffset={6}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col">
                    <div
                      className={cn(
                        "flex items-center gap-2 border-b px-3 py-2.5",
                        isLight ? "border-slate-200/80 bg-slate-50/50" : "border-white/10 bg-white/5"
                      )}
                    >
                      <Search className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                      <input
                        ref={searchInputRef}
                        type="search"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={t("dashboard.propertyCalendar.searchPlaceholder")}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className={cn(
                          "h-10 w-full min-w-0 border-0 bg-transparent text-sm outline-none ring-0 focus:ring-0",
                          isLight
                            ? "text-slate-900 placeholder:text-slate-400"
                            : "text-white placeholder:text-white/40"
                        )}
                      />
                    </div>
                    <div
                      className="max-h-[min(50vh,320px)] overflow-y-auto overscroll-contain p-2"
                      role="listbox"
                      aria-label={t("dashboard.propertyCalendar.pickProperty")}
                    >
                      {pickerLoading && pickerResults.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          {t("dashboard.propertyCalendar.loading")}
                        </p>
                      ) : pickerResults.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          {t("dashboard.propertyCalendar.noResults")}
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {pickerResults.map((p) => {
                            const selected = propertyId === p._id;
                            const addr = formatAddress(p.address);
                            return (
                              <li key={p._id}>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  className={cn(
                                    "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                                    selected
                                      ? isLight
                                        ? "bg-sky-100/90 text-sky-950"
                                        : "bg-sky-500/20 text-white"
                                      : isLight
                                        ? "hover:bg-slate-100/90"
                                        : "hover:bg-white/10"
                                  )}
                                  onClick={() => {
                                    void loadProperty(p._id);
                                    setPickerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mt-0.5 h-4 w-4 shrink-0",
                                      selected ? "opacity-100" : "opacity-0"
                                    )}
                                    aria-hidden
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold leading-snug">{p.name}</p>
                                    {addr ? (
                                      <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                                        <MapPin className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
                                        <span className="leading-snug">{addr}</span>
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
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:w-auto xl:justify-end">
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
                className={cn(isLight && "border-slate-200 bg-white")}
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
                    className={cn(isLight && "border-slate-200 bg-white")}
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
                    className={cn(isLight && "border-slate-200 bg-white")}
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
                        className={cn(isLight && "border-slate-200 bg-white")}
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
                        onClick={() => {
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
                          onClick={() => {
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
        <CardContent className="space-y-4 pt-0">
          {!propertyId && !propertyLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {t("dashboard.propertyCalendar.emptyState")}
            </p>
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
                    ? "border border-slate-200/90 bg-slate-100/90 text-slate-900 [&_svg]:text-slate-800"
                    : "border border-white/10 bg-white/5"
                )}
              >
                <TabsTrigger value="calendar" className="gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {t("dashboard.propertyCalendar.tabCalendar")}
                </TabsTrigger>
                <TabsTrigger value="blocks" className="gap-1.5">
                  <Lock className="h-4 w-4" />
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
