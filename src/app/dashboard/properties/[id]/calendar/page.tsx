"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  DollarSign,
  Lock,
  Plus,
  Filter,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  CalendarPricingRule,
  CalendarLease,
  CalendarRentalRequest,
  DateSelection,
} from "@/components/calendar/AvailabilityCalendar";
import { StackedPropertyUnitCalendars } from "@/components/calendar/StackedPropertyUnitCalendars";
import { DateBlockForm, DateBlockFormData } from "@/components/calendar/DateBlockForm";
import { PricingRuleForm, PricingRuleFormData } from "@/components/calendar/PricingRuleForm";
import { DateBlockType } from "@/types";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TIP = {
  pageTitle:
    "Per-property availability for the selected unit: see bookings, holds, and pricing. Admins and managers can block dates or add pricing rules from the calendar or these tabs.",
  back: "Return to the property overview for this listing.",
  refresh:
    "Reload calendar data from the server: date blocks, pricing rules, active leases, and pending rental requests.",
  blockDates:
    "Open the form to mark date ranges as unavailable for the selected unit (maintenance, owner stay, hold, etc.).",
  addPricingRule:
    "Add a rule that changes nightly rates for specific dates (seasons, weekends, minimum stay, or fixed overrides).",
  selectUnit:
    "Each unit has its own calendar and rules. Choose a unit to view and edit its availability.",
  viewUnitCalendar:
    "Open the full-screen calendar page for only this unit (same data, focused layout).",
  tabCalendar:
    "Month grid showing availability. Colors reflect blocks, leases, pricing, and requests. Drag or click dates to act (if you have permission).",
  tabBlocks:
    "All date blocks for this unit: times the unit is not bookable. Use the filter to narrow by block type.",
  tabPricing:
    "Pricing rules that adjust the default nightly rate for date ranges. Active rules apply when guests book.",
  cardAvailability:
    "Interactive calendar for the unit selected above. Use the legend to read colors; select dates to create blocks or pricing when allowed.",
  cardBlocks:
    "Hard blocks usually prevent bookings entirely. Dates shown here match the Blocks tab and the calendar overlays.",
  filterBlocks: "Show every block type or only one category (e.g. maintenance, owner stay).",
  cardPricing:
    "Rules are evaluated for stays that fall in their date range. Delete a rule from the trash icon if it no longer applies.",
  addRule: "Create another pricing rule; you can pre-fill dates from a selection on the calendar.",
  bulkTitle:
    "Apply the same action to every unit in this property at once—useful for whole-building closures or holidays.",
  blockAllUnits:
    "Create one date block and apply it to all units in this property in a single step.",
} as const;

function TitleTip({
  tip,
  children,
  className,
}: {
  tip: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex cursor-help items-center gap-2 underline-offset-4", className)}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-left leading-snug">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

function ActionTip({
  tip,
  children,
}: {
  tip: string;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-left leading-snug">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
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

export default function PropertyCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const propertyId = params.id as string;
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;
  const filterSelectTrigger = (widthClass: string) =>
    cn(
      "h-10",
      widthClass,
      isLight
        ? "border-slate-200 bg-white text-slate-900 [&_svg]:text-slate-500"
        : "border-white/20 bg-white/5 text-white [&_svg]:text-white/70"
    );

  const [property, setProperty] = useState<any>(null);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [pricingRules, setPricingRules] = useState<CalendarPricingRule[]>([]);
  const [leases, setLeases] = useState<CalendarLease[]>([]);
  const [rentalRequests, setRentalRequests] = useState<CalendarRentalRequest[]>([]);
  const [blockFilterType, setBlockFilterType] = useState<string>("all");

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [blockFormDates, setBlockFormDates] = useState<{ start?: string; end?: string }>({});
  const [pricingFormDates, setPricingFormDates] = useState<{ start?: string; end?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");

  const userRole = (session?.user as any)?.role || "tenant";

  useEffect(() => {
    fetchPropertyData();
  }, [propertyId]);

  useEffect(() => {
    if (selectedUnitId) {
      fetchUnitCalendarData(selectedUnitId);
    }
  }, [selectedUnitId]);

  const fetchPropertyData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/properties/${propertyId}`);
      if (!res.ok) throw new Error("Failed to fetch property");
      const data = await res.json();
      const prop = data.data || data;
      setProperty(prop);

      if (prop.units && prop.units.length > 0) {
        setUnits(prop.units);
        setSelectedUnitId(prop.units[0]._id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load property");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnitCalendarData = async (unitId: string) => {
    try {
      const [blocksRes, rulesRes, leasesRes, requestsRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}/units/${unitId}/blocks`),
        fetch(`/api/properties/${propertyId}/units/${unitId}/pricing-rules?activeOnly=true`),
        fetch(`/api/leases?propertyId=${propertyId}&unitId=${unitId}&status=active,pending`).catch(() => null),
        fetch(`/api/rental-requests?propertyId=${propertyId}&unitId=${unitId}&status=pending`).catch(() => null),
      ]);

      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        setBlocks(blocksData.data || []);
      }

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setPricingRules(rulesData.data || []);
      }

      if (leasesRes?.ok) {
        const leasesData = await leasesRes.json();
        const leasesArr = leasesData.data?.leases || leasesData.data || [];
        setLeases(
          leasesArr.map((l: any) => ({
            _id: l._id,
            startDate: l.startDate,
            endDate: l.endDate,
            status: l.status,
            tenantName: l.tenantId?.firstName
              ? `${l.tenantId.firstName} ${l.tenantId.lastName}`
              : undefined,
          }))
        );
      }

      if (requestsRes?.ok) {
        const requestsData = await requestsRes.json();
        const requestsArr = requestsData.data?.requests || requestsData.data || [];
        setRentalRequests(Array.isArray(requestsArr) ? requestsArr : []);
      }
    } catch (err: any) {
      toast.error("Failed to load calendar data");
    }
  };

  const handleDateSelect = useCallback((selection: DateSelection) => {
  }, []);

  const handleBlockCreate = useCallback((selection: DateSelection) => {
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
    if (!selectedUnitId) return;
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
      toast.success("Date block created successfully");
      await fetchUnitCalendarData(selectedUnitId);
    } catch (err: any) {
      toast.error(err.message || "Failed to create date block");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkBlockSubmit = async (data: DateBlockFormData) => {
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
          : "Bulk block created successfully"
      );
      if (selectedUnitId) {
        await fetchUnitCalendarData(selectedUnitId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create bulk block");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePricingSubmit = async (data: PricingRuleFormData) => {
    if (!selectedUnitId) return;
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
      toast.success("Pricing rule created successfully");
      await fetchUnitCalendarData(selectedUnitId);
    } catch (err: any) {
      toast.error(err.message || "Failed to create pricing rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!selectedUnitId) return;
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/units/${selectedUnitId}/blocks?blockId=${blockId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete block");
      }
      toast.success("Block deleted successfully");
      await fetchUnitCalendarData(selectedUnitId);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeletePricingRule = async (ruleId: string) => {
    if (!selectedUnitId) return;
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/units/${selectedUnitId}/pricing-rules?ruleId=${ruleId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete pricing rule");
      }
      toast.success("Pricing rule deleted successfully");
      await fetchUnitCalendarData(selectedUnitId);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selectedUnit = units.find((u) => u._id === selectedUnitId);
  const baseRentPerNight = selectedUnit?.rentAmount ? selectedUnit.rentAmount / 30 : 0;

  const filteredBlocks = blockFilterType === "all"
    ? blocks
    : blocks.filter((b) => b.blockType === blockFilterType);

  if (loading) {
    return (
      <TooltipProvider delayDuration={250}>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-64 rounded bg-muted" />
            <div className="h-96 rounded bg-muted" />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (!property) {
    return (
      <TooltipProvider delayDuration={250}>
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3
                    className={cn(
                      "mb-2 cursor-help text-lg font-semibold underline decoration-dotted decoration-muted-foreground/50 underline-offset-4",
                      isLight ? "text-slate-900" : "text-foreground"
                    )}
                  >
                    Property not found
                  </h3>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-left leading-snug" side="bottom">
                  No listing matches this URL. It may have been deleted or the link is wrong—go
                  back to your property list to pick a valid property.
                </TooltipContent>
              </Tooltip>
              <ActionTip tip={TIP.back}>
                <Button onClick={() => router.push("/dashboard/properties")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Properties
                </Button>
              </ActionTip>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ActionTip tip={TIP.back}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/properties/${propertyId}`)}
              className={cn(
                "w-fit shrink-0",
                isLight &&
                  "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              )}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </ActionTip>
          <div>
            <h1
              className={cn(
                "text-2xl font-bold tracking-tight sm:text-3xl",
                isLight ? "text-slate-900" : "text-white"
              )}
            >
              <TitleTip
                tip={TIP.pageTitle}
                className={cn(
                  "flex items-center gap-2",
                  isLight ? "text-slate-900" : "text-white"
                )}
              >
                <CalendarDays
                  className={cn(
                    "h-6 w-6 shrink-0",
                    isLight ? "text-slate-800" : "text-white"
                  )}
                />
                {property.name} - Availability Calendar
              </TitleTip>
            </h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <p
                  className={cn(
                    "mt-1 cursor-help text-sm sm:text-base underline decoration-dotted decoration-current/30 underline-offset-4",
                    isLight ? "text-slate-600" : "text-white/80"
                  )}
                >
                  Manage date blocks, pricing rules, and view availability
                </p>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-left leading-snug" side="bottom">
                Blocks remove availability; pricing rules change nightly rates for date ranges. Use
                the Calendar tab for the visual month view, or Blocks / Pricing for lists.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ActionTip tip={TIP.refresh}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedUnitId) fetchUnitCalendarData(selectedUnitId);
              }}
              className={cn(
                isLight &&
                  "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              )}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh
            </Button>
          </ActionTip>
          {(userRole === "admin" || userRole === "manager" || userRole === "owner") && (
            <>
              <ActionTip tip={TIP.blockDates}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBlockFormDates({});
                    setShowBlockForm(true);
                  }}
                  className={cn(
                    isLight &&
                      "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <Lock className="mr-1 h-4 w-4" />
                  Block Dates
                </Button>
              </ActionTip>
              <ActionTip tip={TIP.addPricingRule}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPricingFormDates({});
                    setShowPricingForm(true);
                  }}
                  className={cn(
                    isLight &&
                      "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <DollarSign className="mr-1 h-4 w-4" />
                  Add Pricing Rule
                </Button>
              </ActionTip>
            </>
          )}
        </div>
      </div>

      {units.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <label
                className={cn(
                  "cursor-help text-sm font-medium underline decoration-dotted decoration-muted-foreground/50 underline-offset-4",
                  isLight ? "text-slate-800" : "text-foreground"
                )}
              >
                Select Unit:
              </label>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-left leading-snug" side="bottom">
              {TIP.selectUnit}
            </TooltipContent>
          </Tooltip>
          <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
            <SelectTrigger className={filterSelectTrigger("w-[250px]")}>
              <SelectValue placeholder="Select a unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit._id} value={unit._id}>
                  Unit {unit.unitNumber} - ${unit.rentAmount}/mo
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUnit && (
            <ActionTip tip={TIP.viewUnitCalendar}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(
                    `/dashboard/properties/${propertyId}/units/${selectedUnitId}/calendar`
                  )
                }
                className={cn(
                  isLight
                    ? "text-sky-700 hover:bg-sky-50 hover:text-sky-800"
                    : undefined
                )}
              >
                View Unit Calendar →
              </Button>
            </ActionTip>
          )}
        </div>
      )}

      {units.length > 0 && propertyId && (
        <StackedPropertyUnitCalendars
          propertyId={propertyId}
          units={units}
          baseRentPerNight={baseRentPerNight}
          defaultExpanded
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList
          className={cn(
            isLight &&
              "border border-slate-200/90 bg-slate-100/90 text-slate-900 [&_svg]:text-slate-800 shadow-sm"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="calendar" className="cursor-help">
                <CalendarDays className="mr-1 h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-left leading-snug" side="bottom">
              {TIP.tabCalendar}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="blocks" className="cursor-help">
                <Lock className="mr-1 h-4 w-4" />
                Blocks ({blocks.length})
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-left leading-snug" side="bottom">
              {TIP.tabBlocks}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <TabsTrigger value="pricing" className="cursor-help">
                <DollarSign className="mr-1 h-4 w-4" />
                Pricing Rules ({pricingRules.length})
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-left leading-snug" side="bottom">
              {TIP.tabPricing}
            </TooltipContent>
          </Tooltip>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TitleTip
                  tip={TIP.cardAvailability}
                  className="flex items-center gap-2"
                >
                  <CalendarDays className="h-5 w-5 shrink-0" />
                  {selectedUnit
                    ? `Unit ${selectedUnit.unitNumber} - Availability`
                    : "Select a unit to view calendar"}
                </TitleTip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUnitId ? (
                <AvailabilityCalendar
                  blocks={blocks}
                  pricingRules={pricingRules}
                  leases={leases}
                  rentalRequests={rentalRequests}
                  baseRentPerNight={baseRentPerNight}
                  onDateSelect={handleDateSelect}
                  onBlockCreate={handleBlockCreate}
                  onPricingCreate={handlePricingCreate}
                  readOnly={userRole === "tenant"}
                  showPricing={true}
                  showLegend={true}
                  selectionMode="two-click"
                />
              ) : (
                <p
                  className={cn(
                    "py-12 text-center",
                    isLight ? "text-slate-600" : "text-muted-foreground"
                  )}
                >
                  No units available for this property.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocks">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <TitleTip tip={TIP.cardBlocks} className="flex items-center gap-2">
                    <Lock className="h-5 w-5 shrink-0" />
                    Active Date Blocks
                  </TitleTip>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help">
                        <Filter
                          className={cn(
                            "h-4 w-4",
                            isLight ? "text-slate-500" : "text-muted-foreground"
                          )}
                          aria-hidden
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-left leading-snug" side="bottom">
                      {TIP.filterBlocks}
                    </TooltipContent>
                  </Tooltip>
                  <Select value={blockFilterType} onValueChange={setBlockFilterType}>
                    <SelectTrigger className={filterSelectTrigger("w-[180px]")}>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(BLOCK_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredBlocks.length === 0 ? (
                <p
                  className={cn(
                    "py-8 text-center",
                    isLight ? "text-slate-600" : "text-muted-foreground"
                  )}
                >
                  No active date blocks for this unit.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredBlocks.map((block) => (
                    <div
                      key={block._id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3",
                        isLight
                          ? "border-slate-200/90 bg-white/60"
                          : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {block.isHardBlock && (
                            <Lock className="h-4 w-4 text-red-500" />
                          )}
                          <Badge variant="secondary">
                            {BLOCK_TYPE_LABELS[block.blockType] || block.blockType}
                          </Badge>
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isLight ? "text-slate-900" : undefined
                            )}
                          >
                            {new Date(block.startDate).toLocaleDateString()} –{" "}
                            {new Date(block.endDate).toLocaleDateString()}
                          </p>
                          {block.reason && (
                            <p
                              className={cn(
                                "text-xs",
                                isLight ? "text-slate-600" : "text-muted-foreground"
                              )}
                            >
                              {block.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      {(userRole === "admin" || userRole === "manager" || userRole === "owner") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBlock(block._id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <TitleTip tip={TIP.cardPricing} className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 shrink-0" />
                    Pricing Rules
                  </TitleTip>
                </CardTitle>
                {(userRole === "admin" || userRole === "manager" || userRole === "owner") && (
                  <ActionTip tip={TIP.addRule}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPricingFormDates({});
                        setShowPricingForm(true);
                      }}
                      className={cn(
                        isLight &&
                          "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                      )}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add Rule
                    </Button>
                  </ActionTip>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {pricingRules.length === 0 ? (
                <p
                  className={cn(
                    "py-8 text-center",
                    isLight ? "text-slate-600" : "text-muted-foreground"
                  )}
                >
                  No pricing rules configured for this unit.
                </p>
              ) : (
                <div className="space-y-3">
                  {pricingRules.map((rule) => (
                    <div
                      key={rule._id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3",
                        isLight
                          ? "border-slate-200/90 bg-white/60"
                          : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={rule.isActive ? "default" : "secondary"}>
                          {rule.ruleType.replace(/_/g, " ")}
                        </Badge>
                        <div>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isLight ? "text-slate-900" : undefined
                            )}
                          >
                            {rule.name}
                          </p>
                          <p
                            className={cn(
                              "text-xs",
                              isLight ? "text-slate-600" : "text-muted-foreground"
                            )}
                          >
                            {rule.pricePerNight !== undefined && rule.pricePerNight !== null
                              ? `$${rule.pricePerNight}/night`
                              : rule.priceModifier
                                ? `${rule.priceModifier.type === "percentage" ? `${rule.priceModifier.value}%` : `$${rule.priceModifier.value}`} modifier`
                                : ""}
                            {rule.startDate && rule.endDate && (
                              <span>
                                {" "}
                                • {new Date(rule.startDate).toLocaleDateString()} –{" "}
                                {new Date(rule.endDate).toLocaleDateString()}
                              </span>
                            )}
                            {rule.minimumStay && (
                              <span> • Min {rule.minimumStay} nights</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {(userRole === "admin" || userRole === "manager" || userRole === "owner") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePricingRule(rule._id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {(userRole === "admin" || userRole === "manager" || userRole === "owner") && units.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TitleTip tip={TIP.bulkTitle} className="flex items-center gap-2">
                <Building2 className="h-5 w-5 shrink-0" />
                Bulk Operations
              </TitleTip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tooltip>
              <TooltipTrigger asChild>
                <p
                  className={cn(
                    "mb-3 cursor-help text-sm underline decoration-dotted decoration-muted-foreground/50 underline-offset-4",
                    isLight ? "text-slate-600" : "text-muted-foreground"
                  )}
                >
                  Apply operations to all units in this property at once.
                </p>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-left leading-snug" side="top">
                {TIP.bulkTitle}
              </TooltipContent>
            </Tooltip>
            <div className="flex gap-2">
              <ActionTip tip={TIP.blockAllUnits}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBlockFormDates({});
                    setShowBlockForm(true);
                  }}
                  className={cn(
                    isLight &&
                      "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <Lock className="mr-1 h-4 w-4" />
                  Block All Units
                </Button>
              </ActionTip>
            </div>
          </CardContent>
        </Card>
      )}

      <DateBlockForm
        open={showBlockForm}
        onOpenChange={setShowBlockForm}
        onSubmit={handleBlockSubmit}
        initialStartDate={blockFormDates.start}
        initialEndDate={blockFormDates.end}
        userRole={userRole as "admin" | "manager" | "owner"}
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
    </TooltipProvider>
  );
}
