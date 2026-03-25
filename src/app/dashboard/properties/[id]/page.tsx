"use client";

import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Bed,
  Bath,
  Square,
  DollarSign,
  MapPin,
  Edit,
  Trash2,
  Camera,
  Eye,
  Building2,
  Star,
  Home,
  CheckCircle,
  Calendar,
  Shield,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { unitService } from "@/lib/services/unit.service";
import { propertyService } from "@/lib/services/property.service";
import { AddUnitDialog } from "@/components/properties/AddUnitDialog";
import PropertyAmenities from "@/components/properties/PropertyAmenities";
import PropertyImageGallery from "@/components/properties/PropertyImageGallery";
import PropertyStatusManager from "@/components/properties/PropertyStatusManager";
import { EnhancedUnitDisplay } from "@/components/properties/UnitDisplay";
import PropertyComplianceProfile from "@/components/properties/PropertyComplianceProfile";
import { useLocalization } from "@/hooks/use-localization";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { cn } from "@/lib/utils";

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;
  const txTitle = isLight ? "text-black" : "text-white";
  const txBody = isLight ? "text-black" : "text-white/80";
  const txMut = isLight ? "text-black" : "text-white/85";
  const outlineActions = cn(
    isLight
      ? "border-slate-200 bg-white text-black hover:bg-slate-50 [&_svg]:text-black"
      : "border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.1] [&_svg]:text-white"
  );
  const surfaceCard = cn(
    "border shadow-sm hover:shadow-md transition-all duration-300 ease-out [transform:translateZ(0)]",
    isLight ? "border-gray-100" : "border-white/14 text-white"
  );
  const panelSurface = cn(
    "dashboard-ui-surface rounded-xl border p-8 shadow-sm transition-all duration-300 ease-out [transform:translateZ(0)]",
    isLight
      ? "border-gray-100 bg-white text-black"
      : "border-white/14 text-white"
  );
  const nestedTile = cn(
    "rounded-lg border transition-all duration-300 hover:shadow-sm",
    isLight
      ? "border-gray-100 bg-gray-50"
      : "border-white/10 bg-white/[0.06] text-white"
  );
  const cardHeaderMuted = cn(
    "border-b p-4 sm:p-6",
    isLight
      ? "border-gray-100 bg-gray-50"
      : "border-white/10 bg-white/[0.05]"
  );
  const cardHeaderAccent = cn(
    "border-b p-4 sm:p-6",
    isLight
      ? "border-gray-100 bg-blue-50"
      : "border-white/10 bg-white/[0.05]"
  );
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddUnitDialog, setShowAddUnitDialog] = useState(false);
  const { t, formatCurrency, formatNumber, formatDate } = useLocalization();
  const propertyId = params.id as string;

  // Helper function to get unit statistics
  const getUnitStats = (units: any[]) => {
    if (!units || units.length === 0) {
      return { available: 0, occupied: 0, maintenance: 0, total: 0, types: [] };
    }

    const stats = {
      available: 0,
      occupied: 0,
      maintenance: 0,
      total: units.length,
      types: [] as string[],
    };

    const typeSet = new Set<string>();

    units.forEach((unit) => {
      switch (unit.status) {
        case "available":
          stats.available++;
          break;
        case "occupied":
          stats.occupied++;
          break;
        case "maintenance":
          stats.maintenance++;
          break;
      }
      typeSet.add(unit.unitType);
    });

    stats.types = Array.from(typeSet);
    return stats;
  };

  // Helper function to get rent range for multi-unit properties
  const getRentRange = (units: any[]) => {
    if (!units || units.length === 0) return null;

    const rents = units.map((unit: any) => unit.rentAmount);
    const minRent = Math.min(...rents);
    const maxRent = Math.max(...rents);

    if (minRent === maxRent) {
      return `${formatCurrency(minRent)}`;
    }

    return `${formatCurrency(minRent)} - ${formatCurrency(maxRent)}`;
  };

  // Helper function to get total square footage from units
  const getTotalSquareFootage = (units: any[]) => {
    if (units.length > 0) {
      return units.reduce(
        (total, unit) => total + (unit.squareFootage || 0),
        0
      );
    }
    return 0;
  };

  // Helper function to get total bedrooms from units
  const getTotalBedrooms = (units: any[]) => {
    if (units.length > 0) {
      return units.reduce((total, unit) => total + (unit.bedrooms || 0), 0);
    }
    return 0;
  };

  // Helper function to get total bathrooms from units
  const getTotalBathrooms = (units: any[]) => {
    if (units.length > 0) {
      return units.reduce((total, unit) => total + (unit.bathrooms || 0), 0);
    }
    return 0;
  };

  // Helper function to get security deposit range from units
  const getSecurityDepositRange = (units: any[]) => {
    if (!units || units.length === 0) return null;

    const deposits = units.map((unit: any) => unit.securityDeposit || 0);
    const minDeposit = Math.min(...deposits);
    const maxDeposit = Math.max(...deposits);

    if (minDeposit === maxDeposit) {
      return `${formatCurrency(minDeposit)}`;
    }

    return `${formatCurrency(minDeposit)} - ${formatCurrency(maxDeposit)}`;
  };

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(null);

        const propertyData = await propertyService.getProperty(propertyId);

        if (!propertyData) {
          throw new Error("Property data is null or undefined");
        }

        setProperty(propertyData);

        // Set units from property data for all properties (both single and multi-unit)
        // The API already includes units data, so we don't need to fetch separately
        if (propertyData.units && propertyData.units.length > 0) {
          setUnits(propertyData.units);

          // Ensure totalUnits is in sync with actual units count
          if (propertyData.totalUnits !== propertyData.units.length) {
            setProperty((prev: any) =>
              prev
                ? {
                    ...prev,
                    totalUnits: propertyData.units?.length || 0,
                  }
                : null
            );
          }
        } else {
          setUnits([]);
        }
      } catch (err: any) {
        console.error("Failed to fetch property details", err);
        const errorMessage = t("properties.details.error.fetchFailed");
        toast.error(errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId, t]);

  // Refresh units data after unit operations
  const refreshUnits = async () => {
    try {
      setUnitsLoading(true);
      const unitsData = await unitService.getUnits(propertyId);
      setUnits(unitsData);

      // Update property's totalUnits to keep it in sync
      if (property) {
        setProperty((prev: any) =>
          prev ? { ...prev, totalUnits: unitsData.length } : null
        );
      }
    } catch (err: any) {
      console.error("Failed to refresh units", err);
      toast.error(err.message || t("properties.details.units.refreshError"));
    } finally {
      setUnitsLoading(false);
    }
  };

  // Handler for editing property
  const handleEditProperty = () => {
    router.push(`/dashboard/properties/${propertyId}/edit`);
  };

  // Unit management handlers

  // DISABLED: Delete functionality temporarily disabled
  const handleDeleteUnit = async (unitId: string) => {
    try {
      await unitService.deleteUnit(propertyId, unitId);
      toast.success("Unit deleted successfully");
      await refreshUnits(); // Refresh units list
    } catch (err: any) {
      toast.error(err.message || "Failed to delete unit");
      throw err; // Re-throw to let the component handle it
    }
  };

  // DISABLED: Delete functionality temporarily disabled
  const handleDeleteProperty = async () => {
    try {
      setIsDeleting(true);
      await propertyService.deleteProperty(propertyId);
      toast.success("Property deleted successfully");
      router.push("/dashboard/properties");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete property");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Check if user can edit/delete this property - Single company architecture
  const canModifyProperty = () => {
    if (!session?.user || !property) return false;

    const userRole = (session.user as any).role;

    // Admin and Manager can modify any company property
    return userRole === "admin" || userRole === "manager";
  };

  // Show loading skeleton while fetching data
  if (loading) {
    return (
      <div className="container mx-auto space-y-6 px-3 py-5 sm:px-4 sm:py-6 md:py-8">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-4 sm:gap-0">
            <div className="animate-pulse h-10 w-full max-w-[11rem] rounded-md bg-gray-200 dark:bg-gray-800 sm:w-32" />
            <div className="space-y-2">
              <div className="animate-pulse h-9 w-full max-w-md rounded-md bg-gray-200 dark:bg-gray-800" />
              <div className="flex flex-wrap items-center gap-2">
                <div className="animate-pulse h-6 w-20 rounded-md bg-gray-200 dark:bg-gray-800" />
                <div className="animate-pulse h-6 w-24 rounded-md bg-gray-200 dark:bg-gray-800" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="animate-pulse h-10 flex-1 min-w-[7rem] rounded-md bg-gray-200 dark:bg-gray-800 sm:flex-none sm:w-32" />
            <div className="animate-pulse h-10 w-10 rounded-md bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-6">
          <div className={cn(panelSurface, "p-6")}>
            <div className="animate-pulse w-full h-96 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className={cn(panelSurface, "p-6")}
              >
                <div className="animate-pulse h-16 bg-gray-200 dark:bg-gray-800 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-3 py-5 sm:px-4 sm:py-6 md:py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className={cn("mb-2 text-lg font-semibold", txTitle)}>
              {t("properties.details.error.title")}
            </h3>
            <p className={cn("mb-6 text-center", txBody)}>
              {error}
            </p>
            <div className="flex space-x-3">
              <Button
                size="sm"
                onClick={() => window.location.reload()}
                variant="outline"
                className={outlineActions}
              >
                {t("properties.details.actions.retry")}
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/dashboard/properties")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("properties.details.actions.backToList")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto px-3 py-5 sm:px-4 sm:py-6 md:py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className={cn("mb-2 text-lg font-semibold", txTitle)}>
              {t("properties.details.notFound.title")}
            </h3>
            <p className={cn("mb-6 text-center", txBody)}>
              {t("properties.details.notFound.description")}
            </p>
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/properties")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("properties.details.actions.backToList")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "container mx-auto space-y-5 px-3 py-5 sm:space-y-6 sm:px-4 sm:py-6 md:py-8",
        isLight && "text-black"
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/dashboard/properties")}
            className={cn(
              "flex w-full shrink-0 items-center justify-center gap-1.5 sm:w-auto sm:justify-start",
              outlineActions
            )}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {t("properties.details.actions.backToList")}
            </span>
          </Button>
          <div className="min-w-0 space-y-2">
            <h1
              className={cn(
                "break-words text-base font-semibold sm:text-lg",
                txTitle
              )}
            >
              {property?.name || t("properties.details.unknownProperty")}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {property?.status && (
                <Badge variant="outline" className="shrink-0">
                  {t(`properties.status.${property.status}`)}
                </Badge>
              )}
              {property?.type && (
                <Badge variant="secondary" className="shrink-0">
                  {t(`properties.type.${property.type}`)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {canModifyProperty() && (
          <div className="flex flex-wrap gap-2 sm:max-w-none sm:shrink-0 sm:justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/properties/${propertyId}/calendar`)
              }
              title={t("nav.calendar")}
              className={cn(
                "flex min-h-10 flex-1 items-center justify-center gap-2 text-xs sm:flex-none sm:text-sm",
                outlineActions
              )}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="text-center">{t("nav.calendar")}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEditProperty}
              className={cn(
                "flex min-h-10 flex-1 items-center justify-center gap-2 text-xs sm:flex-none sm:text-sm",
                outlineActions
              )}
            >
              <Edit className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {t("properties.details.actions.editProperty")}
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className={cn(
                "flex min-h-10 flex-1 items-center justify-center gap-2 text-xs sm:flex-none sm:text-sm",
                isLight
                  ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                  : "border-red-400/40 text-red-300 hover:bg-red-500/15 hover:text-red-200"
              )}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {t("properties.details.actions.deleteProperty")}
              </span>
            </Button>
          </div>
        )}
      </div>
      {/* Enhanced Property Details Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <div
          className={cn(
            "rounded-xl border p-1.5 shadow-sm sm:p-2",
            isLight
              ? "border-slate-200/90 bg-white/90"
              : "dashboard-ui-surface border-white/14 shadow-none"
          )}
        >
          <TabsList
            className={cn(
              "grid h-auto w-full grid-cols-2 gap-1.5 rounded-lg bg-transparent sm:grid-cols-3 md:grid-cols-6 md:gap-2",
              isLight ? "!text-black" : "text-white"
            )}
          >
            <TabsTrigger
              value="overview"
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg bg-transparent px-2 py-2.5 text-center text-xs font-medium leading-tight transition-all duration-200 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-left sm:text-sm",
                isLight
                  ? "!text-black hover:bg-slate-100/90"
                  : "text-white/85 hover:bg-white/10 data-[state=active]:bg-white/15 data-[state=active]:text-white"
              )}
            >
              <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
              {t("properties.details.tabs.overview")}
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg bg-transparent px-2 py-2.5 text-center text-xs font-medium leading-tight transition-all duration-200 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-left sm:text-sm",
                isLight
                  ? "!text-black hover:bg-slate-100/90"
                  : "text-white/85 hover:bg-white/10 data-[state=active]:bg-white/15 data-[state=active]:text-white"
              )}
            >
              <Eye className="h-4 w-4 shrink-0 text-blue-600" />
              {t("properties.details.tabs.details")}
            </TabsTrigger>
            <TabsTrigger
              value="units"
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg bg-transparent px-2 py-2.5 text-center text-xs font-medium leading-tight transition-all duration-200 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-left sm:text-sm",
                isLight
                  ? "!text-black hover:bg-slate-100/90"
                  : "text-white/85 hover:bg-white/10 data-[state=active]:bg-white/15 data-[state=active]:text-white"
              )}
            >
              <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
              {t("properties.details.tabs.units")}
            </TabsTrigger>
            <TabsTrigger
              value="images"
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg bg-transparent px-2 py-2.5 text-center text-xs font-medium leading-tight transition-all duration-200 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-left sm:text-sm",
                isLight
                  ? "!text-black hover:bg-slate-100/90"
                  : "text-white/85 hover:bg-white/10 data-[state=active]:bg-white/15 data-[state=active]:text-white"
              )}
            >
              <Camera className="h-4 w-4 shrink-0 text-blue-600" />
              {t("properties.details.tabs.images")}
            </TabsTrigger>
            <TabsTrigger
              value="amenities"
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg bg-transparent px-2 py-2.5 text-center text-xs font-medium leading-tight transition-all duration-200 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-left sm:text-sm",
                isLight
                  ? "!text-black hover:bg-slate-100/90"
                  : "text-white/85 hover:bg-white/10 data-[state=active]:bg-white/15 data-[state=active]:text-white"
              )}
            >
              <Star className="h-4 w-4 shrink-0 text-blue-600" />
              {t("properties.details.tabs.amenities")}
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg bg-transparent px-2 py-2.5 text-center text-xs font-medium leading-tight transition-all duration-200 sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-left sm:text-sm",
                isLight
                  ? "!text-black hover:bg-slate-100/90"
                  : "text-white/85 hover:bg-white/10 data-[state=active]:bg-white/15 data-[state=active]:text-white"
              )}
            >
              <Shield className="h-4 w-4 shrink-0 text-violet-600" />
              Compliance
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* Enhanced Property Basic Information - Minimal Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Property Type */}
            <Card className={surfaceCard}>
              <CardContent className="">
                <div className="flex items-center space-x-4">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      isLight ? "bg-gray-100" : "bg-white/10"
                    )}
                  >
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className={cn("text-2xl font-bold capitalize", txTitle)}>
                      {property?.type
                        ? t(`properties.type.${property.type}`)
                        : t("properties.labels.unknown")}
                    </p>
                    <p className={cn("text-sm font-medium", txBody)}>
                      {t("properties.details.overview.propertyType")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Units (for multi-unit) or Bedrooms (for single unit) */}
            <Card className={surfaceCard}>
              <CardContent className="">
                <div className="flex items-center space-x-4">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      isLight ? "bg-gray-100" : "bg-white/10"
                    )}
                  >
                    <Bed className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className={cn("text-2xl font-bold", txTitle)}>
                      {getTotalBedrooms(units) ||
                        t("properties.labels.unknown")}
                    </p>
                    <p className={cn("text-sm font-medium", txBody)}>
                      {t("properties.details.overview.bedrooms")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bathrooms */}
            <Card className={surfaceCard}>
              <CardContent className="">
                <div className="flex items-center space-x-4">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      isLight ? "bg-gray-100" : "bg-white/10"
                    )}
                  >
                    <Bath className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className={cn("text-2xl font-bold", txTitle)}>
                      {getTotalBathrooms(units) ||
                        t("properties.labels.unknown")}
                    </p>
                    <p className={cn("text-sm font-medium", txBody)}>
                      {t("properties.details.overview.bathrooms")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Square Footage */}
            <Card className={surfaceCard}>
              <CardContent className="">
                <div className="flex items-center space-x-4">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      isLight ? "bg-gray-100" : "bg-white/10"
                    )}
                  >
                    <Square className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className={cn("text-2xl font-bold", txTitle)}>
                      {(() => {
                        const totalSqFt = getTotalSquareFootage(units);
                        return totalSqFt > 0
                          ? `${formatNumber(totalSqFt)} ${t(
                              "properties.labels.squareFeetUnit"
                            )}`
                          : t("properties.labels.unknown");
                      })()}
                    </p>
                    <p className={cn("text-sm font-medium", txBody)}>
                      {t("properties.details.overview.totalSquareFootage")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Multi-Unit Property Statistics - Minimal Style */}
          {property?.isMultiUnit && units.length > 0 && (
            <Card className={cn("overflow-hidden py-0 gap-0", surfaceCard)}>
              <CardHeader className={cardHeaderAccent}>
                <CardTitle className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center space-x-3">
                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                      <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className={cn("text-lg font-bold sm:text-xl", txTitle)}>
                        {t("properties.details.overview.occupancy.title")}
                      </h3>
                      <p className={cn("text-sm", txBody)}>
                        {t("properties.details.overview.occupancy.subtitle")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("units")}
                      className={cn("w-full justify-center sm:w-auto", outlineActions)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {t("properties.details.overview.actions.viewAllUnits")}
                    </Button>
                    {canModifyProperty() && (
                      <Button
                        onClick={() => setShowAddUnitDialog(true)}
                        className="w-full justify-center bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        {t("properties.details.overview.actions.addUnit")}
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {(() => {
                  const unitStats = getUnitStats(units);
                  const occupancyRate =
                    unitStats.total > 0
                      ? Math.round((unitStats.occupied / unitStats.total) * 100)
                      : 0;

                  return (
                    <div className="space-y-6">
                      {/* Occupancy Rate */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className={cn("font-semibold", txTitle)}>
                            {t(
                              "properties.details.overview.occupancy.rateLabel"
                            )}
                          </h4>
                          <span
                            className={cn(
                              "text-2xl font-bold",
                              isLight ? "text-blue-600" : "text-blue-400"
                            )}
                          >
                            {occupancyRate}%
                          </span>
                        </div>
                        <div
                          className={cn(
                            "w-full rounded-full h-3",
                            isLight ? "bg-gray-200" : "bg-white/15"
                          )}
                        >
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${occupancyRate}%` }}
                          ></div>
                        </div>
                        <p className={cn("text-sm", txBody)}>
                          {t("properties.details.overview.occupancy.summary", {
                            values: {
                              occupied: unitStats.occupied,
                              total: unitStats.total,
                            },
                          })}
                        </p>
                      </div>

                      {/* Unit Status Summary - Minimal Style */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={cn("text-center p-6", nestedTile)}>
                          <div
                            className={cn(
                              "text-3xl font-bold mb-2",
                              isLight ? "text-green-600" : "text-green-400"
                            )}
                          >
                            {unitStats.available}
                          </div>
                          <div className={cn("text-sm font-medium uppercase tracking-wide", txBody)}>
                            {t("properties.status.available")}
                          </div>
                          <div
                            className={cn(
                              "mt-2 w-full rounded-full h-2",
                              isLight ? "bg-gray-200" : "bg-white/15"
                            )}
                          >
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  unitStats.total > 0
                                    ? (unitStats.available / unitStats.total) *
                                      100
                                    : 0
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className={cn("text-center p-6", nestedTile)}>
                          <div
                            className={cn(
                              "text-3xl font-bold mb-2",
                              isLight ? "text-blue-600" : "text-blue-400"
                            )}
                          >
                            {unitStats.occupied}
                          </div>
                          <div className={cn("text-sm font-medium uppercase tracking-wide", txBody)}>
                            {t("properties.status.occupied")}
                          </div>
                          <div
                            className={cn(
                              "mt-2 w-full rounded-full h-2",
                              isLight ? "bg-gray-200" : "bg-white/15"
                            )}
                          >
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  unitStats.total > 0
                                    ? (unitStats.occupied / unitStats.total) *
                                      100
                                    : 0
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className={cn("text-center p-6", nestedTile)}>
                          <div
                            className={cn(
                              "text-3xl font-bold mb-2",
                              isLight ? "text-yellow-600" : "text-yellow-400"
                            )}
                          >
                            {unitStats.maintenance}
                          </div>
                          <div className={cn("text-sm font-medium uppercase tracking-wide", txBody)}>
                            {t("properties.status.maintenance")}
                          </div>
                          <div
                            className={cn(
                              "mt-2 w-full rounded-full h-2",
                              isLight ? "bg-gray-200" : "bg-white/15"
                            )}
                          >
                            <div
                              className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                              style={{
                                width: `${
                                  unitStats.total > 0
                                    ? (unitStats.maintenance /
                                        unitStats.total) *
                                      100
                                    : 0
                                }%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className={cn("text-center p-6", nestedTile)}>
                          <div className={cn("mb-2 text-3xl font-bold", txTitle)}>
                            {unitStats.total}
                          </div>
                          <div className={cn("text-sm font-medium uppercase tracking-wide", txBody)}>
                            {t("properties.details.specs.fields.totalUnits")}
                          </div>
                          <div
                            className={cn(
                              "mt-2 w-full rounded-full h-2",
                              isLight ? "bg-gray-200" : "bg-white/15"
                            )}
                          >
                            <div className="bg-gray-500 h-2 rounded-full w-full transition-all duration-500"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Enhanced Property Location & Financial Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Property Location Card - Minimal Style */}
            <Card className={cn("overflow-hidden py-0 gap-0", surfaceCard)}>
              <CardHeader className={cn(cardHeaderMuted, "p-6")}>
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-bold", txTitle)}>
                      {t("properties.details.location.title")}
                    </h3>
                    <p className={cn("text-sm", txBody)}>
                      {t("properties.details.location.subtitle")}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-4  ">
                  <div>
                    <label className={cn("mb-1 block text-sm font-medium", txBody)}>
                      {t("properties.details.location.street")}
                    </label>
                    <p className={cn("text-md font-semibold", txTitle)}>
                      {property?.address?.street ||
                        t("properties.details.common.notAvailable")}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={cn("mb-1 block text-sm font-medium", txBody)}>
                        {t("properties.details.location.city")}
                      </label>
                      <p className={cn("font-medium", txTitle)}>
                        {property?.address?.city ||
                          t("properties.details.common.notAvailable")}
                      </p>
                    </div>
                    <div>
                      <label className={cn("mb-1 block text-sm font-medium", txBody)}>
                        {t("properties.details.location.state")}
                      </label>
                      <p className={cn("font-medium", txTitle)}>
                        {property?.address?.state ||
                          t("properties.details.common.notAvailable")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className={cn("mb-1 block text-sm font-medium", txBody)}>
                      {t("properties.details.location.postalCode")}
                    </label>
                    <p className={cn("font-medium", txTitle)}>
                      {property?.address?.zipCode ||
                        t("properties.details.common.notAvailable")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Overview - Minimal Style */}
            <Card className={cn("overflow-hidden py-0 gap-0", surfaceCard)}>
              <CardHeader className={cn(cardHeaderMuted, "p-6")}>
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className={cn("text-xl font-bold", txTitle)}>
                      {t("properties.details.financial.title")}
                    </h3>
                    <p className={cn("text-sm", txBody)}>
                      {t("properties.details.financial.subtitle")}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className={cn(nestedTile, "p-6")}>
                      <label className={cn("mb-2 block text-sm font-medium uppercase tracking-wide", txBody)}>
                        {t("properties.details.financial.monthlyRent.label")}
                      </label>
                      <p className={cn("mb-2 text-xl font-bold", txTitle)}>
                        {property?.isMultiUnit && units.length > 0
                          ? getRentRange(units) ||
                            t("properties.details.common.notAvailable")
                          : getRentRange(units) ||
                            t("properties.details.common.notAvailable")}
                      </p>
                      <div className={cn("flex items-center text-sm", txBody)}>
                        {/* <DollarSign className="h-4 w-4 mr-1" /> */}
                        <span>
                          {t("properties.details.financial.monthlyRent.helper")}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className={cn(nestedTile, "p-4")}>
                        <label className={cn("mb-2 block text-sm font-medium uppercase tracking-wide", txBody)}>
                          {t(
                            "properties.details.financial.securityDeposit.label"
                          )}
                        </label>
                        <p className={cn("text-xl font-bold", txTitle)}>
                          {getSecurityDepositRange(units) ||
                            t("properties.details.common.notAvailable")}
                        </p>
                        <div className={cn("mt-1 flex items-center text-sm", txBody)}>
                          <Square className="h-3 w-3 mr-1" />
                          <span>
                            {t(
                              "properties.details.financial.securityDeposit.helper"
                            )}
                          </span>
                        </div>
                      </div>
                      <div className={cn(nestedTile, "p-4")}>
                        <label className={cn("mb-2 block text-sm font-medium uppercase tracking-wide", txBody)}>
                          {t(
                            "properties.details.financial.pricePerSquareFoot.label",
                            {
                              values: {
                                unit: t("properties.labels.squareFeetUnit"),
                              },
                            }
                          )}
                        </label>
                        <p className={cn("text-xl font-bold", txTitle)}>
                          {(() => {
                            if (units.length > 0) {
                              // Calculate average price per sq ft from units
                              const totalRent = units.reduce(
                                (sum, unit) => sum + (unit.rentAmount || 0),
                                0
                              );
                              const totalSqFt = units.reduce(
                                (sum, unit) => sum + (unit.squareFootage || 0),
                                0
                              );
                              return totalSqFt > 0
                                ? `${formatCurrency(
                                    Number((totalRent / totalSqFt).toFixed(2))
                                  )}`
                                : t("properties.details.common.notAvailable");
                            }
                            return t("properties.details.common.notAvailable");
                          })()}
                        </p>
                        <div className={cn("mt-1 flex items-center text-sm", txBody)}>
                          <Square className="h-3 w-3 mr-1" />
                          <span>
                            {t(
                              "properties.details.financial.pricePerSquareFoot.helper"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <PropertyImageGallery
            images={property?.images || []}
            propertyName={
              property?.name || t("properties.details.unknownProperty")
            }
            canEdit={canModifyProperty()}
            onImagesUpdate={(newImages) => {
              setProperty((prev: any) =>
                prev ? { ...prev, images: newImages } : null
              );
            }}
            propertyId={propertyId}
          />
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {/* Property Specifications - Minimal Style */}
          <div className={panelSurface}>
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Building2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className={cn("text-2xl font-bold", txTitle)}>
                  {t("properties.details.specs.title")}
                </h3>
                <p className={txBody}>
                  {t("properties.details.specs.subtitle")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Property Type Card */}
              <div className={cn(nestedTile, "p-4")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <label className={cn("text-sm font-medium uppercase tracking-wide", txBody)}>
                    {t("properties.details.specs.fields.type")}
                  </label>
                </div>
                <p className={cn("text-lg font-bold capitalize", txTitle)}>
                  {property?.type
                    ? t(`properties.type.${property.type}`)
                    : t("properties.details.common.notAvailable")}
                </p>
              </div>

              {/* Status Card */}
              <div className={cn(nestedTile, "p-4")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <label className={cn("text-sm font-medium uppercase tracking-wide", txBody)}>
                    {t("properties.details.specs.fields.status")}
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <p className={cn("text-lg font-bold capitalize", txTitle)}>
                    {property?.status
                      ? t(`properties.status.${property.status}`)
                      : t("properties.details.common.notAvailable")}
                  </p>
                  {canModifyProperty() && (
                    <PropertyStatusManager
                      currentStatus={property?.status}
                      onStatusUpdate={async (newStatus) => {
                        try {
                          await propertyService.updateProperty(propertyId, {
                            status: newStatus,
                          });
                          setProperty((prev: any) =>
                            prev ? { ...prev, status: newStatus } : null
                          );
                          toast.success(
                            t("properties.toasts.statusUpdate.success")
                          );
                        } catch (error: any) {
                          toast.error(
                            error.message ||
                              t("properties.toasts.statusUpdate.error")
                          );
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Total Units Card */}
              <div className={cn(nestedTile, "p-4")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900">
                    <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <label className={cn("text-sm font-medium uppercase tracking-wide", txBody)}>
                    {t("properties.details.specs.fields.totalUnits")}
                  </label>
                </div>
                <p className={cn("text-lg font-bold", txTitle)}>
                  {units.length || 1}
                </p>
              </div>

              {/* Year Built Card */}
              <div className={cn(nestedTile, "p-4")}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900">
                    <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <label className={cn("text-sm font-medium uppercase tracking-wide", txBody)}>
                    {t("properties.details.specs.fields.yearBuilt")}
                  </label>
                </div>
                <p className={cn("text-lg font-bold", txTitle)}>
                  {property?.yearBuilt ||
                    t("properties.details.common.notAvailable")}
                </p>
              </div>

              {/* Description Card - Full Width */}
              {property?.description && (
                <div className={cn(nestedTile, "p-4 md:col-span-2")}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900">
                      <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <label className={cn("text-sm font-medium uppercase tracking-wide", txBody)}>
                      {t("properties.details.specs.fields.description")}
                    </label>
                  </div>
                  <p className={cn("text-base", txMut)}>
                    {property.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Property Features */}
          {property?.features && property.features.length > 0 && (
            <div className={panelSurface}>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900">
                  <Star className="h-7 w-7 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className={cn("text-2xl font-bold", txTitle)}>
                    {t("properties.details.features.title")}
                  </h3>
                  <p className={txBody}>
                    {t("properties.details.features.subtitle")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {property.features.map((feature: string, index: number) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5",
                      nestedTile
                    )}
                  >
                    <Star className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                    <span className={cn("text-sm font-medium", txMut)}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Property Amenities */}
          {property?.amenities && property.amenities.length > 0 && (
            <div className={panelSurface}>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Building2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className={cn("text-2xl font-bold", txTitle)}>
                    {t("properties.details.amenities.title")}
                  </h3>
                  <p className={txBody}>
                    {t("properties.details.amenities.subtitle")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {property.amenities.map((amenity: any, index: number) => (
                  <div
                    key={index}
                    className={cn("flex items-center gap-3", nestedTile, "p-4")}
                  >
                    <div className="flex-shrink-0 w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                    <span className={cn("text-sm font-medium", txMut)}>
                      {amenity.name || amenity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="images" className="space-y-6">
          <PropertyImageGallery
            images={property?.images || []}
            propertyName={
              property?.name || t("properties.details.unknownProperty")
            }
            canEdit={canModifyProperty()}
            onImagesUpdate={(newImages) => {
              setProperty((prev: any) =>
                prev ? { ...prev, images: newImages } : null
              );
            }}
            propertyId={propertyId}
          />
        </TabsContent>

        <TabsContent value="amenities" className="space-y-6">
          <PropertyAmenities
            amenities={property.amenities}
            canEdit={canModifyProperty()}
            onAmenitiesUpdate={(newAmenities) => {
              setProperty((prev: any) =>
                prev ? { ...prev, amenities: newAmenities } : null
              );
            }}
            propertyId={propertyId}
          />
        </TabsContent>

        {/* Units Tab - For all properties */}
        <TabsContent value="units" className="space-y-6">
          <EnhancedUnitDisplay
            units={units}
            propertyId={propertyId}
            // onDeleteUnit={handleDeleteUnit}
            onAddUnit={() => {
              // Open add unit dialog
              setShowAddUnitDialog(true);
            }}
            onUnitsChange={refreshUnits}
            isLoading={unitsLoading}
            isSingleUnit={!property?.isMultiUnit}
          />
        </TabsContent>

        {/* Compliance Profile Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <PropertyComplianceProfile propertyId={propertyId} isLight={isLight} />
        </TabsContent>
      </Tabs>

      {/* DISABLED: Delete functionality temporarily disabled */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{property?.name}&quot;? This
              action cannot be undone. All associated data including leases,
              payments, and maintenance requests will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProperty}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete Property"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Unit Dialog - Only for multi-unit properties */}
      {property?.isMultiUnit && (
        <AddUnitDialog
          open={showAddUnitDialog}
          onOpenChange={setShowAddUnitDialog}
          propertyId={propertyId}
          onUnitAdded={refreshUnits}
        />
      )}
    </div>
  );
}
