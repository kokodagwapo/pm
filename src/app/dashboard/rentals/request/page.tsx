"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  MapPin,
  Send,
  DollarSign,
  Calendar,
  Loader2,
  ArrowLeft,
  Tag,
  Moon,
  Info,
} from "lucide-react";
import { AvailabilityCalendar, DateSelection } from "@/components/calendar/AvailabilityCalendar";
import { UserRole } from "@/types";

interface PropertyOption {
  _id: string;
  name: string;
  address: { street: string; city: string; state: string; zipCode: string };
  images: string[];
  units: {
    _id: string;
    unitNumber: string;
    rentAmount: number;
    bedrooms: number;
    bathrooms: number;
    squareFootage: number;
    status: string;
  }[];
}

interface PriceCalculation {
  basePrice: number;
  calculatedPrice: number;
  totalNights: number;
  averagePricePerNight: number;
  discountsApplied: { type: string; label: string; percentage?: number; amount: number }[];
  minimumStay?: number;
  maximumStay?: number;
}

export default function TenantRentalRequestPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = session?.user?.role as UserRole;

  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedDates, setSelectedDates] = useState<DateSelection | null>(null);
  const [tenantMessage, setTenantMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [priceCalc, setPriceCalc] = useState<PriceCalculation | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  useEffect(() => {
    if (userRole && userRole !== UserRole.TENANT) {
      router.push("/dashboard");
      return;
    }
    fetchProperties();
  }, [userRole, router]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/properties/public?limit=100");
      const data = await res.json();
      if (data.success) {
        setProperties(data.data?.properties || []);
      }
    } catch {
      toast.error("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  const selectedProperty = properties.find((p) => p._id === selectedPropertyId);
  const selectedUnit = selectedProperty?.units?.find((u) => u._id === selectedUnitId);

  const fetchCalendarData = useCallback(async (propertyId: string, unitId: string) => {
    try {
      setLoadingCalendar(true);
      const [blocksRes, rulesRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}/units/${unitId}/blocks`),
        fetch(`/api/properties/${propertyId}/units/${unitId}/pricing-rules`),
      ]);
      const blocksData = await blocksRes.json();
      const rulesData = await rulesRes.json();

      setBlocks(blocksData.data?.blocks || []);
      setPricingRules(rulesData.data?.pricingRules || []);
    } catch {
      toast.error("Failed to load calendar data");
    } finally {
      setLoadingCalendar(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPropertyId && selectedUnitId) {
      fetchCalendarData(selectedPropertyId, selectedUnitId);
      setSelectedDates(null);
      setPriceCalc(null);
    }
  }, [selectedPropertyId, selectedUnitId, fetchCalendarData]);

  const calculatePrice = useCallback(async (dates: DateSelection) => {
    if (!selectedPropertyId || !selectedUnitId) return;
    try {
      setCalculatingPrice(true);
      const res = await fetch("/api/pricing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          unitId: selectedUnitId,
          startDate: dates.startDate.toISOString(),
          endDate: dates.endDate.toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPriceCalc(data.data);
      } else {
        toast.error(data.error || "Failed to calculate price");
        setPriceCalc(null);
      }
    } catch {
      toast.error("Failed to calculate price");
    } finally {
      setCalculatingPrice(false);
    }
  }, [selectedPropertyId, selectedUnitId]);

  const handleDateSelect = useCallback((selection: DateSelection) => {
    setSelectedDates(selection);
    calculatePrice(selection);
  }, [calculatePrice]);

  const handleSubmit = async () => {
    if (!selectedPropertyId || !selectedUnitId || !selectedDates) {
      toast.error("Please select a property, unit, and dates");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/rental-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          unitId: selectedUnitId,
          requestedStartDate: selectedDates.startDate.toISOString(),
          requestedEndDate: selectedDates.endDate.toISOString(),
          tenantMessage: tenantMessage || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Rental request submitted successfully!");
        router.push("/dashboard/rentals/my-requests");
      } else {
        toast.error(data.error || "Failed to submit request");
      }
    } catch {
      toast.error("Failed to submit rental request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Request a Rental</h1>
          <p className="text-muted-foreground">
            Browse available properties and submit a rental request
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Select Property & Unit
              </CardTitle>
              <CardDescription>Choose the property and unit you want to rent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Property</label>
                <Select
                  value={selectedPropertyId}
                  onValueChange={(val) => {
                    setSelectedPropertyId(val);
                    setSelectedUnitId("");
                    setPriceCalc(null);
                    setSelectedDates(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{p.name}</span>
                          <span className="text-muted-foreground text-xs">
                            – {p.address?.city}, {p.address?.state}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProperty && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Unit</label>
                  <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProperty.units
                        ?.filter((u) => u.status === "available")
                        .map((u) => (
                          <SelectItem key={u._id} value={u._id}>
                            <div className="flex items-center gap-2">
                              <span>Unit {u.unitNumber}</span>
                              <span className="text-muted-foreground text-xs">
                                {u.bedrooms}bd / {u.bathrooms}ba • ${u.rentAmount}/mo
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      {selectedProperty.units?.filter((u) => u.status === "available").length === 0 && (
                        <SelectItem value="none" disabled>
                          No available units
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedProperty && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium">{selectedProperty.name}</p>
                    <p className="text-muted-foreground">
                      {selectedProperty.address?.street}, {selectedProperty.address?.city},{" "}
                      {selectedProperty.address?.state} {selectedProperty.address?.zipCode}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedPropertyId && selectedUnitId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Select Dates
                </CardTitle>
                <CardDescription>
                  Click and drag to select your desired rental dates. Blocked dates are shown in red.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCalendar ? (
                  <Skeleton className="h-[350px]" />
                ) : (
                  <AvailabilityCalendar
                    blocks={blocks}
                    pricingRules={pricingRules}
                    baseRentPerNight={selectedUnit ? selectedUnit.rentAmount / 30 : 0}
                    onDateSelect={handleDateSelect}
                    readOnly={false}
                    showPricing={true}
                    showLegend={true}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {selectedDates && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Price Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {calculatingPrice ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : priceCalc ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {selectedDates.startDate.toLocaleDateString()} –{" "}
                          {selectedDates.endDate.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{priceCalc.totalNights} night{priceCalc.totalNights !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base price</span>
                        <span>${priceCalc.basePrice.toFixed(2)}</span>
                      </div>

                      {priceCalc.discountsApplied?.map((d, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {d.label}
                            {d.percentage ? ` (${d.percentage}%)` : ""}
                          </span>
                          <span className="text-emerald-600">-${d.amount.toFixed(2)}</span>
                        </div>
                      ))}

                      <div className="flex justify-between font-semibold text-base border-t pt-2">
                        <span>Total</span>
                        <span>${priceCalc.calculatedPrice.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Avg per night</span>
                        <span>${priceCalc.averagePricePerNight.toFixed(2)}</span>
                      </div>
                    </div>

                    {priceCalc.minimumStay && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                        <Info className="h-3.5 w-3.5" />
                        Minimum stay: {priceCalc.minimumStay} nights
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select dates to see pricing
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Submit Request
              </CardTitle>
              <CardDescription>Add a message and submit your rental request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Message (optional)
                </label>
                <Textarea
                  placeholder="Tell the property manager about your plans, special requirements, etc."
                  value={tenantMessage}
                  onChange={(e) => setTenantMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {tenantMessage.length}/1000 characters
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!selectedPropertyId || !selectedUnitId || !selectedDates || submitting || !priceCalc}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Rental Request
                  </>
                )}
              </Button>

              {!selectedPropertyId && (
                <p className="text-xs text-muted-foreground text-center">
                  Select a property to get started
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
