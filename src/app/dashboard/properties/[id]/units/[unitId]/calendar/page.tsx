"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
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

const BLOCK_TYPE_LABELS: Record<string, string> = {
  owner_stay: "Owner Stay",
  maintenance: "Maintenance",
  hold: "Hold",
  renovation: "Renovation",
  personal: "Personal",
  seasonal_closure: "Seasonal Closure",
};

export default function UnitCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const propertyId = params.id as string;
  const unitId = params.unitId as string;

  const [property, setProperty] = useState<any>(null);
  const [unit, setUnit] = useState<any>(null);
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
    fetchData();
  }, [propertyId, unitId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/properties/${propertyId}`);
      if (!res.ok) throw new Error("Failed to fetch property");
      const data = await res.json();
      const prop = data.data || data;
      setProperty(prop);

      const foundUnit = prop.units?.find((u: any) => u._id === unitId);
      setUnit(foundUnit || null);

      await fetchCalendarData();
    } catch (err: any) {
      toast.error(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
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
        setRentalRequests(requestsData.data || []);
      }
    } catch {
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
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/units/${unitId}/blocks`,
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
      await fetchCalendarData();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePricingSubmit = async (data: PricingRuleFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/units/${unitId}/pricing-rules`,
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
      await fetchCalendarData();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/units/${unitId}/blocks?blockId=${blockId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete block");
      }
      toast.success("Block deleted successfully");
      await fetchCalendarData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeletePricingRule = async (ruleId: string) => {
    try {
      const res = await fetch(
        `/api/properties/${propertyId}/units/${unitId}/pricing-rules?ruleId=${ruleId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete pricing rule");
      }
      toast.success("Pricing rule deleted successfully");
      await fetchCalendarData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const baseRentPerNight = unit?.rentAmount ? unit.rentAmount / 30 : 0;

  const filteredBlocks = blockFilterType === "all"
    ? blocks
    : blocks.filter((b) => b.blockType === blockFilterType);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-64" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!property || !unit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Unit not found</h3>
            <Button onClick={() => router.push(`/dashboard/properties/${propertyId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Property
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/dashboard/properties/${propertyId}/units/${unitId}`)
            }
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6" />
              Unit {unit.unitNumber} - Availability Calendar
            </h1>
            <p className="text-sm text-muted-foreground">
              {property.name} • ${unit.rentAmount}/mo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCalendarData}>
            <RefreshCw className="h-4 w-4 mr-1" />
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
              >
                <Lock className="h-4 w-4 mr-1" />
                Block Dates
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPricingFormDates({});
                  setShowPricingForm(true);
                }}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Add Pricing Rule
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarDays className="h-4 w-4 mr-1" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="blocks">
            <Lock className="h-4 w-4 mr-1" />
            Blocks ({blocks.length})
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <DollarSign className="h-4 w-4 mr-1" />
            Pricing Rules ({pricingRules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Unit {unit.unitNumber} Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={blockFilterType} onValueChange={setBlockFilterType}>
                    <SelectTrigger className="w-[180px]">
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
                <p className="text-muted-foreground text-center py-8">
                  No active date blocks for this unit.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredBlocks.map((block) => (
                    <div
                      key={block._id}
                      className="flex items-center justify-between p-3 rounded-lg border"
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
                          <p className="text-sm font-medium">
                            {new Date(block.startDate).toLocaleDateString()} –{" "}
                            {new Date(block.endDate).toLocaleDateString()}
                          </p>
                          {block.reason && (
                            <p className="text-xs text-muted-foreground">
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
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Rule
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {pricingRules.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pricing rules configured for this unit.
                </p>
              ) : (
                <div className="space-y-3">
                  {pricingRules.map((rule) => (
                    <div
                      key={rule._id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={rule.isActive ? "default" : "secondary"}>
                          {rule.ruleType.replace(/_/g, " ")}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">{rule.name}</p>
                          <p className="text-xs text-muted-foreground">
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
