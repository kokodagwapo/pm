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
import { DateBlockForm, DateBlockFormData } from "@/components/calendar/DateBlockForm";
import { PricingRuleForm, PricingRuleFormData } from "@/components/calendar/PricingRuleForm";
import { DateBlockType } from "@/types";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { cn } from "@/lib/utils";

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
      toast.error(err.message);
      throw err;
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
      toast.error(err.message);
      throw err;
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
      toast.error(err.message);
      throw err;
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
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 rounded bg-muted" />
          <div className="h-96 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3
              className={cn(
                "mb-2 text-lg font-semibold",
                isLight ? "text-slate-900" : "text-foreground"
              )}
            >
              Property not found
            </h3>
            <Button onClick={() => router.push("/dashboard/properties")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Properties
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
          <div>
            <h1
              className={cn(
                "flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl",
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
            </h1>
            <p
              className={cn(
                "mt-1 text-sm sm:text-base",
                isLight ? "text-slate-600" : "text-white/80"
              )}
            >
              Manage date blocks, pricing rules, and view availability
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          {(userRole === "admin" || userRole === "manager" || userRole === "owner") && (
            <>
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
            </>
          )}
        </div>
      </div>

      {units.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={cn(
              "text-sm font-medium",
              isLight ? "text-slate-800" : "text-foreground"
            )}
          >
            Select Unit:
          </label>
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
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList
          className={cn(
            isLight &&
              "border border-slate-200/90 bg-slate-100/90 text-slate-900 [&_svg]:text-slate-800 shadow-sm"
          )}
        >
          <TabsTrigger value="calendar">
            <CalendarDays className="mr-1 h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="blocks">
            <Lock className="mr-1 h-4 w-4" />
            Blocks ({blocks.length})
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="mr-1 h-4 w-4" />
            Pricing Rules ({pricingRules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {selectedUnit
                  ? `Unit ${selectedUnit.unitNumber} - Availability`
                  : "Select a unit to view calendar"}
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Active Date Blocks
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Filter
                    className={cn(
                      "h-4 w-4",
                      isLight ? "text-slate-500" : "text-muted-foreground"
                    )}
                  />
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
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing Rules
                </CardTitle>
                {(userRole === "admin" || userRole === "manager" || userRole === "owner") && (
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
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bulk Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "mb-3 text-sm",
                isLight ? "text-slate-600" : "text-muted-foreground"
              )}
            >
              Apply operations to all units in this property at once.
            </p>
            <div className="flex gap-2">
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
  );
}
