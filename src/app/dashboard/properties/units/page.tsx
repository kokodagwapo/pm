"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useCallback } from "react";
import { GlobalSearch } from "@/components/ui/global-search";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Eye,
  MapPin,
  Bed,
  Bath,
  Square,
  Grid3X3,
  List,
  Rows3,
  MoreHorizontal,
  RefreshCw,
  Home,
  ArrowUpDown,
  Plus,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PropertyType } from "@/types";
import {
  propertyService,
  AvailableUnitResponse,
  PropertyQueryParams,
} from "@/lib/services/property.service";
import { GlobalPagination } from "@/components/ui/global-pagination";
import { useRouter, useSearchParams } from "next/navigation";
import UnitStats from "@/components/properties/UnitStats";
import UnitDetailsModal from "@/components/properties/UnitDetailsModal";
import { useViewPreferencesStore } from "@/stores/view-preferences.store";
import { getFeaturedUnitImage, hasUnitImages } from "@/lib/utils/image-utils";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { PastelIcon } from "@/components/ui/pastel-icon";
import { cn } from "@/lib/utils";

interface UnitCardProps {
  unit: AvailableUnitResponse;
  onViewDetails: (propertyId: string, unitId: string) => void;
}

function StatusBadge({ status }: { status?: string }) {
  const { t } = useLocalizationContext();
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;
  const k = (status || "available").toLowerCase();
  const labelKey =
    k === "available"
      ? "units.status.available"
      : k === "occupied"
        ? "units.status.occupied"
        : k === "maintenance"
          ? "units.status.maintenance"
          : "units.status.unavailable";

  const pillLight: Record<string, string> = {
    available: "border-emerald-200/90 bg-emerald-50/95 text-emerald-900",
    occupied: "border-sky-200/90 bg-sky-50/95 text-sky-900",
    maintenance: "border-amber-200/90 bg-amber-50/95 text-amber-950",
    unavailable: "border-rose-200/90 bg-rose-50/95 text-rose-900",
  };
  const pillDark: Record<string, string> = {
    available: "border-emerald-300/35 bg-emerald-400/15 text-white",
    occupied: "border-sky-300/35 bg-sky-400/15 text-white",
    maintenance: "border-amber-300/35 bg-amber-400/15 text-white",
    unavailable: "border-rose-300/35 bg-rose-400/15 text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        isLight
          ? pillLight[k] ?? pillLight.available
          : pillDark[k] ?? pillDark.available
      )}
    >
      {t(labelKey)}
    </span>
  );
}

function UnitCard({ unit, onViewDetails }: UnitCardProps) {
  const { t, formatCurrency: formatCurrencyLocalized } =
    useLocalizationContext();
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;
  const hasImage = hasUnitImages(unit);
  const featuredImage = getFeaturedUnitImage(unit);

  return (
    <Card
      className={cn(
        "group dashboard-ui-surface gap-0 overflow-hidden rounded-lg p-0 shadow-none transition-all duration-200",
        isLight
          ? "border border-slate-200/90 hover:border-slate-300/90"
          : "border border-white/14 hover:border-white/25"
      )}
    >
      <div
        className={cn(
          "relative m-0 h-48 overflow-hidden rounded-t-lg p-0",
          isLight
            ? "bg-gradient-to-br from-slate-100 to-slate-50/80"
            : "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
        )}
      >
        {hasImage ? (
          <img
            src={featuredImage!}
            alt={`${unit.name} - Unit ${unit.unitNumber}`}
            className="absolute inset-0 m-0 h-full w-full object-cover object-center p-0 transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center",
              isLight
                ? "bg-gradient-to-br from-slate-100 to-slate-50/80"
                : "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
            )}
          >
            <Building2
              className={cn(
                "h-16 w-16",
                isLight ? "text-slate-300" : "text-white/35"
              )}
            />
          </div>
        )}

        <div className="absolute left-3 top-3">
          <StatusBadge status={unit.unitStatus} />
        </div>
        <div className="absolute right-3 top-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm",
              isLight
                ? "border-slate-200/90 bg-white/90 text-slate-800 shadow-sm"
                : "border-white/25 bg-black/35 text-white"
            )}
          >
            <Home className="mr-1 h-3 w-3" />
            <span>
              {unit.unitType.charAt(0).toUpperCase() + unit.unitType.slice(1)}
            </span>
          </span>
        </div>

        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center opacity-0 transition-colors duration-200 group-hover:opacity-100",
            isLight
              ? "bg-black/0 group-hover:bg-black/10"
              : "bg-black/0 group-hover:bg-black/20"
          )}
        >
          <div className="flex space-x-2">
            <Link
              href={unit.unitId ? `/dashboard/properties/${String(unit._id)}/units/${String(unit.unitId)}` : `/dashboard/properties/${String(unit._id)}`}
            >
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  isLight
                    ? "border-slate-200 bg-white text-slate-900 shadow-md hover:bg-slate-50 [&_svg]:shrink-0 [&_svg]:text-slate-800"
                    : "border border-white/25 bg-white/15 text-white hover:bg-white/25 [&_svg]:text-white"
                )}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="mb-3">
          <h3
            className={cn(
              "mb-1 line-clamp-1 text-lg font-semibold",
              isLight ? "text-slate-900" : "text-white"
            )}
          >
            {unit.name} - {t("properties.available.card.unit")}{" "}
            {unit.unitNumber}
          </h3>
          {unit.description && (
            <p
              className={cn(
                "line-clamp-2 text-sm",
                isLight ? "text-slate-600" : "text-white/85"
              )}
            >
              {unit.description}
            </p>
          )}
        </div>
        <div
          className={cn(
            "mb-3 flex items-center text-sm",
            isLight ? "text-slate-600" : "text-white/75"
          )}
        >
          <MapPin
            className={cn(
              "mr-1 h-4 w-4 shrink-0",
              isLight ? "text-slate-400" : "text-white/55"
            )}
          />
          <span className="line-clamp-1">
            {unit.address.city}, {unit.address.state}
          </span>
        </div>
        <div
          className={cn(
            "mb-4 flex items-center justify-between text-sm",
            isLight ? "text-slate-600" : "text-white/75"
          )}
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Bed
                className={cn(
                  "mr-1 h-4 w-4",
                  isLight ? "text-slate-400" : "text-white/55"
                )}
              />
              <span>{unit.bedrooms}</span>
            </div>
            <div className="flex items-center">
              <Bath
                className={cn(
                  "mr-1 h-4 w-4",
                  isLight ? "text-slate-400" : "text-white/55"
                )}
              />
              <span>{unit.bathrooms}</span>
            </div>
            <div className="flex items-center">
              <Square
                className={cn(
                  "mr-1 h-4 w-4",
                  isLight ? "text-slate-400" : "text-white/55"
                )}
              />
              <span>{(unit.squareFootage || 0).toLocaleString()} ft²</span>
            </div>
          </div>
        </div>
        {unit.floor !== undefined && (
          <div
            className={cn(
              "mb-3 flex items-center text-sm",
              isLight ? "text-slate-600" : "text-white/75"
            )}
          >
            <span
              className={cn(
                "rounded border px-2 py-1 text-xs",
                isLight
                  ? "border-slate-200/90 bg-slate-50 text-slate-800"
                  : "border-white/15 bg-white/[0.06] text-white/90"
              )}
            >
              {t("properties.available.card.floor", {
                values: { floor: unit.floor },
              })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "flex items-center text-lg font-semibold",
              isLight ? "text-slate-900" : "text-white"
            )}
          >
            <span>{formatCurrencyLocalized(unit.rentAmount)}</span>
            <span
              className={cn(
                "ml-1 text-sm font-normal",
                isLight ? "text-slate-500" : "text-white/70"
              )}
            >
              {t("properties.available.card.perMonth")}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  isLight
                    ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onViewDetails(String(unit._id), String(unit.unitId))}
              >
                <Eye className="h-4 w-4 mr-2" />
                {t("properties.available.menu.viewUnitDetails")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/properties/${String(unit._id)}`}>
                  <Building2 className="h-4 w-4 mr-2" />
                  {t("properties.available.menu.viewProperty")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AllUnitsPage() {
  const { t, formatCurrency } = useLocalizationContext();
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [units, setUnits] = useState<AvailableUnitResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewMode = useViewPreferencesStore((s) => s.propertiesView);
  const setViewMode = useViewPreferencesStore((s) => s.setPropertiesView);

  const [selectedUnit, setSelectedUnit] = useState<{
    propertyId: string;
    unitId: string;
  } | null>(null);
  const [unitDetailsOpen, setUnitDetailsOpen] = useState(false);

  const [filters, setFilters] = useState<PropertyQueryParams>({
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "12"),
    sortBy: "createdAt",
    sortOrder: "desc",
    search: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalProperties: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const fetchUnits = useCallback(async () => {
    try {
      if (!filters.search) setLoading(true);
      setIsSearching(true);
      setError(null);
      const response = await propertyService.getAllUnits(filters);
      setUnits(response.data);
      setPagination({
        ...response.pagination,
        totalProperties:
          (response.pagination as { totalProperties?: number }).totalProperties ??
          0,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch units";
      setError(message);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleSearch = (search: string) =>
    setFilters((p) => ({ ...p, search, page: 1 }));
  const handleFilterChange = (
    key: keyof PropertyQueryParams,
    value: string | number | undefined
  ) => setFilters((p) => ({ ...p, [key]: value, page: 1 }));
  const handlePageChange = (page: number) =>
    setFilters((p) => ({ ...p, page }));
  const toggleSortOrder = () =>
    setFilters((p) => ({
      ...p,
      sortOrder: p.sortOrder === "asc" ? "desc" : "asc",
      page: 1,
    }));

  const handleViewUnitDetails = (propertyId: string, unitId: string) => {
    setSelectedUnit({ propertyId, unitId });
    setUnitDetailsOpen(true);
  };

  const handleUnitUpdated = () => fetchUnits();
  const handleUnitDeleted = () => {
    fetchUnits();
    setUnitDetailsOpen(false);
    setSelectedUnit(null);
  };

  const handlePageSizeChange = (pageSize: number) =>
    setFilters((p) => ({ ...p, limit: pageSize, page: 1 }));

  const pageSize = filters.limit ?? 12;
  const currentPage = filters.page || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className={cn(
              "text-2xl font-bold tracking-tight sm:text-3xl",
              isLight ? "text-black" : "text-white"
            )}
          >
            {t("properties.allUnits.header.title")}
          </h1>
          <p
            className={cn(
              "text-sm sm:text-base",
              isLight ? "text-black/75" : "text-white"
            )}
          >
            {t("properties.allUnits.header.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUnits}
            disabled={loading}
            className={cn(
              "flex-1 sm:flex-none",
              isLight
                ? "border-slate-200 bg-white text-black hover:bg-slate-50 hover:text-black"
                : "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            )}
          >
            <RefreshCw
              className={`h-4 w-4 sm:mr-2 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {t("properties.available.actions.refresh")}
            </span>
          </Button>
          <Link href="/dashboard/properties/new" className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto" size="sm">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {t("properties.available.actions.addProperty")}
              </span>
              <span className="sm:hidden">+</span>
            </Button>
          </Link>
        </div>
      </div>

      <UnitStats
        units={units}
        totalUnits={pagination.total}
        totalProperties={pagination.totalProperties}
      />

      <Card className="gap-2">
        <CardHeader>
          <div className="mb-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <PastelIcon icon={Grid3X3} tint="info" size="lg" />
              <div>
                <h2
                  className={cn(
                    "text-lg font-semibold",
                    isLight ? "text-black" : "text-white"
                  )}
                >
                  {t("properties.allUnits.header.title")}
                </h2>
                <p
                  className={cn(
                    "text-sm",
                    isLight ? "text-black/75" : "text-white/85"
                  )}
                >
                  {t("properties.allUnits.header.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div
                className={cn(
                  "flex w-full items-center rounded-lg border p-1 sm:w-auto",
                  isLight ? "border-slate-200 bg-slate-50/80" : "border-white/20"
                )}
              >
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-8 flex-1 sm:flex-none sm:px-3",
                    viewMode !== "grid" &&
                      (isLight
                        ? "text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
                        : "text-white hover:bg-white/10 hover:text-white")
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                  <span className="ml-1 sm:hidden">Grid</span>
                </Button>
                <Button
                  variant={viewMode === "rows" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("rows")}
                  className={cn(
                    "h-8 flex-1 sm:flex-none sm:px-3",
                    viewMode !== "rows" &&
                      (isLight
                        ? "text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
                        : "text-white hover:bg-white/10 hover:text-white")
                  )}
                >
                  <Rows3 className="h-4 w-4" />
                  <span className="ml-1 sm:hidden">Rows</span>
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-8 flex-1 sm:flex-none sm:px-3",
                    viewMode !== "list" &&
                      (isLight
                        ? "text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
                        : "text-white hover:bg-white/10 hover:text-white")
                  )}
                >
                  <List className="h-4 w-4" />
                  <span className="ml-1 sm:hidden">List</span>
                </Button>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-center",
              isLight
                ? "border-slate-200/90 bg-slate-50/80"
                : "border-white/15 bg-white/[0.05]"
            )}
          >
            <div className="flex-1 min-w-0">
              <GlobalSearch
                placeholder={t(
                  "properties.available.filters.search.placeholder"
                )}
                initialValue={filters.search || ""}
                debounceDelay={300}
                onSearch={handleSearch}
                isLoading={isSearching}
                className="w-full"
                ariaLabel="Search units"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={filters.type || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "type",
                    value === "all" ? undefined : value
                  )
                }
              >
                <SelectTrigger className={filterSelectTrigger("w-[140px]")}>
                  <SelectValue
                    placeholder={t("properties.available.filters.type.all")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("properties.available.filters.type.all")}
                  </SelectItem>
                  {Object.values(PropertyType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.bedrooms?.toString() || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "bedrooms",
                    value === "all" ? undefined : parseInt(value)
                  )
                }
              >
                <SelectTrigger className={filterSelectTrigger("w-[120px]")}>
                  <SelectValue
                    placeholder={t("properties.available.filters.bedrooms.any")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("properties.available.filters.bedrooms.any")}
                  </SelectItem>
                  <SelectItem value="1">
                    {t("properties.available.filters.bedrooms.one")}
                  </SelectItem>
                  <SelectItem value="2">
                    {t("properties.available.filters.bedrooms.two")}
                  </SelectItem>
                  <SelectItem value="3">
                    {t("properties.available.filters.bedrooms.three")}
                  </SelectItem>
                  <SelectItem value="4">
                    {t("properties.available.filters.bedrooms.four")}
                  </SelectItem>
                  <SelectItem value="5">
                    {t("properties.available.filters.bedrooms.fivePlus")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.bathrooms?.toString() || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "bathrooms",
                    value === "all" ? undefined : parseInt(value)
                  )
                }
              >
                <SelectTrigger className={filterSelectTrigger("w-[120px]")}>
                  <SelectValue
                    placeholder={t(
                      "properties.available.filters.bathrooms.any"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("properties.available.filters.bathrooms.any")}
                  </SelectItem>
                  <SelectItem value="1">
                    {t("properties.available.filters.bathrooms.one")}
                  </SelectItem>
                  <SelectItem value="2">
                    {t("properties.available.filters.bathrooms.two")}
                  </SelectItem>
                  <SelectItem value="3">
                    {t("properties.available.filters.bathrooms.three")}
                  </SelectItem>
                  <SelectItem value="4">
                    {t("properties.available.filters.bathrooms.fourPlus")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.unitType || "all"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "unitType",
                    value === "all" ? undefined : value
                  )
                }
              >
                <SelectTrigger className={filterSelectTrigger("w-[140px]")}>
                  <SelectValue
                    placeholder={t("properties.available.filters.unitType.all")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("properties.available.filters.unitType.all")}
                  </SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="penthouse">Penthouse</SelectItem>
                  <SelectItem value="loft">Loft</SelectItem>
                  <SelectItem value="room">Room</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.sortBy || "createdAt"}
                onValueChange={(value) => handleFilterChange("sortBy", value)}
              >
                <SelectTrigger className={filterSelectTrigger("w-[160px]")}>
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created</SelectItem>
                  <SelectItem value="name">Property</SelectItem>
                  <SelectItem value="unitNumber">Unit Number</SelectItem>
                  <SelectItem value="rentAmount">Rent</SelectItem>
                  <SelectItem value="squareFootage">Square Footage</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSortOrder}
                className={cn(
                  "h-10 px-3",
                  isLight
                    ? "text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                )}
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                {filters.sortOrder === "asc" ? "Asc" : "Desc"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card
                    key={i}
                    className="dashboard-ui-surface gap-0 overflow-hidden py-0"
                  >
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16" />
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : viewMode === "rows" ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card
                    key={i}
                    className="dashboard-ui-surface gap-0 overflow-hidden py-0"
                  >
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-4" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16" />
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  "overflow-hidden rounded-lg border backdrop-blur-sm [-webkit-backdrop-filter:blur(8px)]",
                  isLight
                    ? "border-slate-200/90 bg-white/70"
                    : "border-white/15 bg-white/[0.03]"
                )}
              >
                <Table>
                  <TableHeader
                    className={cn(
                      "border-b",
                      isLight
                        ? "border-slate-200 bg-slate-50/95"
                        : "border-white/12 bg-white/[0.06]"
                    )}
                  >
                    <TableRow
                      className={cn(
                        "border-b hover:bg-transparent",
                        isLight ? "border-slate-200" : "border-white/12"
                      )}
                    >
                      {Array.from({ length: 6 }).map((_, i) => (
                        <TableHead key={i} className="px-4 py-3">
                          <Skeleton className="h-4 w-24" />
                        </TableHead>
                      ))}
                      <TableHead className="px-6 py-3 text-right">
                        <Skeleton className="h-4 w-24" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
              </div>
            )
          ) : error ? (
            <div className="flex flex-wrap items-center justify-center gap-2 py-8">
              <AlertCircle
                className={cn(
                  "h-8 w-8 shrink-0",
                  isLight ? "text-red-600" : "text-red-300"
                )}
              />
              <span className={isLight ? "text-red-700" : "text-red-300"}>
                {error}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUnits}
                className={cn(
                  isLight
                    ? "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                )}
              >
                {t("properties.available.error.tryAgain", {
                  defaultValue: "Try again",
                })}
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {units.map((unit) => (
                <UnitCard
                  key={`${unit._id}-${unit.unitId}`}
                  unit={unit}
                  onViewDetails={handleViewUnitDetails}
                />
              ))}
            </div>
          ) : viewMode === "rows" ? (
            <div className="space-y-3">
              {units.map((unit) => (
                <UnitCard
                  key={`${unit._id}-${unit.unitId}`}
                  unit={unit}
                  onViewDetails={handleViewUnitDetails}
                />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "overflow-hidden rounded-lg border backdrop-blur-sm [-webkit-backdrop-filter:blur(8px)]",
                isLight
                  ? "border-slate-200/90 bg-white/70"
                  : "border-white/15 bg-white/[0.03]"
              )}
            >
              <Table>
                <TableHeader
                  className={cn(
                    "border-b",
                    isLight
                      ? "border-slate-200 bg-slate-50/95"
                      : "border-white/12 bg-white/[0.06]"
                  )}
                >
                  <TableRow
                    className={cn(
                      "border-b hover:bg-transparent",
                      isLight ? "border-slate-200" : "border-white/12"
                    )}
                  >
                    <TableHead
                      className={cn(
                        "px-6 py-3 text-left font-medium",
                        isLight ? "text-slate-800" : "text-white/90"
                      )}
                    >
                      {t("properties.available.table.unit")}
                    </TableHead>
                    <TableHead
                      className={cn(
                        "px-4 py-3 text-left font-medium",
                        isLight ? "text-slate-800" : "text-white/90"
                      )}
                    >
                      {t("properties.available.table.property")}
                    </TableHead>
                    <TableHead
                      className={cn(
                        "px-4 py-3 text-left font-medium",
                        isLight ? "text-slate-800" : "text-white/90"
                      )}
                    >
                      {t("properties.available.table.location")}
                    </TableHead>
                    <TableHead
                      className={cn(
                        "px-4 py-3 text-left font-medium",
                        isLight ? "text-slate-800" : "text-white/90"
                      )}
                    >
                      {t("properties.available.table.details")}
                    </TableHead>
                    <TableHead
                      className={cn(
                        "px-4 py-3 text-left font-medium",
                        isLight ? "text-slate-800" : "text-white/90"
                      )}
                    >
                      {t("properties.available.table.rent")}
                    </TableHead>
                    <TableHead
                      className={cn(
                        "px-4 py-3 text-left font-medium",
                        isLight ? "text-slate-800" : "text-white/90"
                      )}
                    >
                      Status
                    </TableHead>
                    <TableHead
                      className={cn(
                        "px-6 py-3 text-right font-medium",
                        isLight ? "text-slate-800" : "text-white/90"
                      )}
                    >
                      {t("properties.available.table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((unit, index) => (
                    <TableRow
                      key={`${unit._id}-${unit.unitId}`}
                      className={cn(
                        "border-b transition-colors",
                        isLight
                          ? cn(
                              "border-slate-100 hover:bg-slate-50/90",
                              index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                            )
                          : cn(
                              "border-white/10 hover:bg-white/[0.07]",
                              index % 2 === 0 ? "bg-white/[0.03]" : "bg-white/[0.06]"
                            )
                      )}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={cn(
                              "relative h-10 w-10 shrink-0 overflow-hidden rounded-lg",
                              isLight
                                ? "bg-gradient-to-br from-slate-100 to-slate-50"
                                : "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
                            )}
                          >
                            {hasUnitImages(unit) ? (
                              <img
                                src={getFeaturedUnitImage(unit)!}
                                alt={`${unit.name} - Unit ${unit.unitNumber}`}
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div
                                className={cn(
                                  "flex h-full w-full items-center justify-center",
                                  isLight
                                    ? "bg-gradient-to-br from-slate-100 to-slate-50"
                                    : "bg-gradient-to-br from-white/[0.08] to-white/[0.02]"
                                )}
                              >
                                <Building2
                                  className={cn(
                                    "h-5 w-5",
                                    isLight ? "text-slate-300" : "text-white/35"
                                  )}
                                />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={cn(
                                "font-medium",
                                isLight ? "text-slate-900" : "text-white"
                              )}
                            >
                              <Link
                                href={unit.unitId ? `/dashboard/properties/${String(unit._id)}/units/${String(unit.unitId)}` : `/dashboard/properties/${String(unit._id)}`}
                                className={cn(
                                  "transition-colors",
                                  isLight
                                    ? "hover:text-sky-600"
                                    : "hover:text-sky-200"
                                )}
                              >
                                {t("properties.available.card.unit")}{" "}
                                {unit.unitNumber}
                              </Link>
                            </div>
                            <div
                              className={cn(
                                "truncate text-sm",
                                isLight ? "text-slate-600" : "text-white/70"
                              )}
                            >
                              {unit.unitType.charAt(0).toUpperCase() +
                                unit.unitType.slice(1)}
                              {unit.floor !== undefined &&
                                ` • ${t("properties.available.card.floor", {
                                  values: { floor: unit.floor },
                                })}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex flex-col space-y-1">
                          <div
                            className={cn(
                              "font-medium",
                              isLight ? "text-slate-900" : "text-white"
                            )}
                          >
                            <Link
                              href={`/dashboard/properties/${String(unit._id)}`}
                              className={cn(
                                "transition-colors",
                                isLight
                                  ? "hover:text-sky-600"
                                  : "hover:text-sky-200"
                              )}
                            >
                              {unit.name}
                            </Link>
                          </div>
                          <span
                            className={cn(
                              "text-xs",
                              isLight ? "text-slate-500" : "text-white/65"
                            )}
                          >
                            {unit.type.charAt(0).toUpperCase() +
                              unit.type.slice(1)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex flex-col space-y-1">
                          <div
                            className={cn(
                              "flex items-center text-sm",
                              isLight ? "text-slate-800" : "text-white"
                            )}
                          >
                            <MapPin
                              className={cn(
                                "mr-1 h-3 w-3",
                                isLight ? "text-slate-400" : "text-white/50"
                              )}
                            />
                            {unit.address.city}, {unit.address.state}
                          </div>
                          <div
                            className={cn(
                              "text-xs",
                              isLight ? "text-slate-500" : "text-white/65"
                            )}
                          >
                            {unit.address.street}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex flex-col space-y-1">
                          <div
                            className={cn(
                              "flex items-center space-x-3 text-sm",
                              isLight ? "text-slate-800" : "text-white"
                            )}
                          >
                            <div className="flex items-center">
                              <Bed
                                className={cn(
                                  "mr-1 h-3 w-3",
                                  isLight ? "text-slate-400" : "text-white/50"
                                )}
                              />
                              {unit.bedrooms}
                            </div>
                            <div className="flex items-center">
                              <Bath
                                className={cn(
                                  "mr-1 h-3 w-3",
                                  isLight ? "text-slate-400" : "text-white/50"
                                )}
                              />
                              {unit.bathrooms}
                            </div>
                          </div>
                          <div
                            className={cn(
                              "text-xs",
                              isLight ? "text-slate-500" : "text-white/65"
                            )}
                          >
                            {(unit.squareFootage || 0).toLocaleString()}{" "}
                            {t("properties.available.table.squareFeet")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex flex-col space-y-1">
                          <div
                            className={cn(
                              "font-medium",
                              isLight ? "text-slate-900" : "text-white"
                            )}
                          >
                            {formatCurrency(unit.rentAmount)}
                          </div>
                          <div
                            className={cn(
                              "text-xs",
                              isLight ? "text-slate-500" : "text-white/65"
                            )}
                          >
                            {t("properties.available.table.perMonth")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <StatusBadge status={unit.unitStatus} />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 w-8 p-0",
                                isLight
                                  ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                  : "text-white/80 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleViewUnitDetails(String(unit._id), String(unit.unitId))
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("properties.available.menu.viewUnitDetails")}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/properties/${String(unit._id)}`}>
                                <Building2 className="h-4 w-4 mr-2" />
                                {t("properties.available.menu.viewProperty")}
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {pagination.total > 0 && (
            <GlobalPagination
              currentPage={filters.page || 1}
              totalPages={Math.max(
                1,
                Math.ceil(pagination.total / (filters.limit ?? 12))
              )}
              totalItems={pagination.total}
              pageSize={filters.limit ?? 12}
              onPageChange={handlePageChange}
              onPageSizeChange={(size) => {
                const params = new URLSearchParams(
                  Array.from(searchParams.entries())
                );
                params.set("limit", size.toString());
                params.set("page", "1");
                router.push(`/dashboard/properties/units?${params.toString()}`);
                setFilters((p) => ({ ...p, limit: size, page: 1 }));
              }}
              showingLabel={t("common.showing", { defaultValue: "Showing" })}
              previousLabel={t("common.previous", { defaultValue: "Previous" })}
              nextLabel={t("common.next", { defaultValue: "Next" })}
              pageLabel={t("common.page", { defaultValue: "Page" })}
              ofLabel={t("common.of", { defaultValue: "of" })}
              itemsPerPageLabel={t("common.perPage", {
                defaultValue: "per page",
              })}
              disabled={loading || isSearching}
            />
          )}
        </CardContent>
      </Card>

      {selectedUnit && (
        <UnitDetailsModal
          open={unitDetailsOpen}
          onOpenChange={setUnitDetailsOpen}
          propertyId={selectedUnit.propertyId}
          unitId={selectedUnit.unitId}
          onUnitUpdated={handleUnitUpdated}
          onUnitDeleted={handleUnitDeleted}
        />
      )}
    </div>
  );
}
