"use client";

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LunaWidget } from "@/components/landing/LunaWidget";
import { NaplesAreaGuide } from "@/components/landing/NaplesAreaGuide";
import { RentalsGoogleMap } from "@/components/landing/RentalsGoogleMap";
import { MapErrorBoundary } from "@/components/landing/MapErrorBoundary";
import Link from "next/link";
import {
  Search,
  X,
  Bed,
  Bath,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Map,
  LayoutList,
  Home,
  ArrowRight,
  ExternalLink,
  Heart,
  GitCompare,
  Check,
  Grid3X3,
  RotateCcw,
  Car,
  CalendarIcon,
  Users,
  Plus,
  Minus,
  Building2,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePublicStaySearch,
  parseStayParamDate,
} from "@/components/stay-finder/usePublicStaySearch";

const NEIGHBORHOODS = [
  { label: "All Properties", value: "" },
  { label: "Falling Waters", value: "Falling Waters" },
  { label: "Winter Park", value: "Winter Park" },
  { label: "World Tennis Club", value: "World Tennis Club" },
  { label: "Glen Eagle", value: "Glen Eagle" },
  { label: "Moon Lake", value: "Moon Lake" },
  { label: "Naples Park", value: "Naples Park" },
  { label: "Royal Arms", value: "Royal Arms" },
  { label: "Villas of Whittenberg", value: "Villas of Whittenberg" },
];

const PROPERTY_TYPES = [
  { value: "", label: "All Types" },
  { value: "condo", label: "Condo" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
];

const BEDROOMS_OPTIONS = [
  { value: "", label: "Any Beds" },
  { value: "1", label: "1+ Bed" },
  { value: "2", label: "2+ Beds" },
  { value: "3", label: "3+ Beds" },
  { value: "4", label: "4+ Beds" },
];

const PARKING_OPTIONS = [
  { value: "", label: "Any" },
  { value: "garage", label: "Garage" },
  { value: "covered", label: "Covered" },
  { value: "open", label: "Open" },
  { value: "street", label: "Street" },
];

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function PropertyFeaturedCard({ property, onClose }: { property: any; onClose: () => void }) {
  const unit = property.units?.[0];
  const bedrooms = unit?.bedrooms ?? 0;
  const bathrooms = unit?.bathrooms ?? 0;
  const rentAmount = unit?.rentAmount ?? 0;
  const price = rentAmount > 500 ? rentAmount : rentAmount * 30;
  const sqft = unit?.squareFootage ?? 0;
  const basePerNight = rentAmount > 500 ? Math.round(rentAmount / 30) : Math.round(rentAmount);
  const images = property.images?.length ? property.images : [];
  const imageUrl = images[0] || null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
          <span className="text-[10px] font-semibold text-white/90 uppercase tracking-wider">Selected Property</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Image */}
      {imageUrl ? (
        <div className="relative w-full h-48 overflow-hidden bg-slate-100">
          <img
            src={imageUrl}
            alt={property.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <p className="text-white font-semibold text-xl leading-tight drop-shadow-lg tracking-tight">
                {formatPrice(price)}
                <span className="text-white/70 text-sm font-normal ml-1">/mo</span>
              </p>
              {basePerNight > 0 && (
                <p className="text-white/70 text-xs mt-0.5">~{formatPrice(basePerNight)}/night</p>
              )}
            </div>
            {images.length > 1 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/50 text-white text-[9px] backdrop-blur-sm font-medium">
                <Grid3X3 className="w-2.5 h-2.5" />
                {images.length}
              </span>
            )}
          </div>
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-white/15 backdrop-blur-sm border border-white/20 text-white uppercase tracking-wide">
              For Rent
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full h-32 bg-slate-100 flex items-center justify-center">
          <Home className="w-8 h-8 text-slate-300" />
        </div>
      )}

      {/* Details */}
      <div className="px-4 py-3.5">
        {property.neighborhood && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{property.neighborhood}</p>
        )}
        <h3 className="text-slate-900 text-base leading-tight line-clamp-2 mb-1.5 font-medium tracking-tight">
          {property.name}
        </h3>
        {(property.address?.street || property.address?.city) && (
          <p className="flex items-center gap-1 text-slate-500 text-xs mb-3 truncate">
            <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
            {property.address.street ? `${property.address.street}, ` : ""}
            {property.address.city}
            {property.address.state ? `, ${property.address.state}` : ""}
          </p>
        )}

        <div className="flex items-center gap-3 mb-3.5 pb-3 border-b border-slate-100">
          <span className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Bed className="w-3 h-3 text-slate-300" />
            {bedrooms} {bedrooms === 1 ? "Bed" : "Beds"}
          </span>
          <span className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Bath className="w-3 h-3 text-slate-300" />
            {bathrooms} {bathrooms === 1 ? "Bath" : "Baths"}
          </span>
          {sqft > 0 && (
            <span className="text-slate-400 text-xs">{sqft.toLocaleString()} ft²</span>
          )}
        </div>

        <Link
          href={`/properties/${property._id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 active:bg-slate-950 transition-colors"
        >
          View Property Details
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Dismiss */}
      <button
        onClick={onClose}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-slate-100 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <ChevronDown className="w-3 h-3" />
        Show all results
      </button>
    </div>
  );
}

function CompareModal({
  properties,
  onClose,
}: {
  properties: any[];
  onClose: () => void;
}) {
  const rows = [
    { label: "Price/month", render: (p: any) => {
      const u = p.units?.[0]; const r = u?.rentAmount ?? 0; const price = r > 500 ? r : r * 30;
      return <span className="font-semibold text-slate-900">{formatPrice(price)}</span>;
    }},
    { label: "Bedrooms", render: (p: any) => p.units?.[0]?.bedrooms ?? "—" },
    { label: "Bathrooms", render: (p: any) => p.units?.[0]?.bathrooms ?? "—" },
    { label: "Sq Ft", render: (p: any) => p.units?.[0]?.squareFootage ? `${p.units[0].squareFootage.toLocaleString()} sqft` : "—" },
    { label: "Neighborhood", render: (p: any) => p.neighborhood ?? "Naples" },
    { label: "Type", render: (p: any) => p.type ?? "—" },
    { label: "Status", render: (p: any) => (
      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${p.status === "available" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {p.status ?? "unknown"}
      </span>
    )},
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-slate-900 text-lg flex items-center gap-2 tracking-tight">
            <GitCompare className="w-5 h-5 text-slate-600" />
            Compare Properties
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-slate-400 font-medium w-28 shrink-0" />
                {properties.map((p) => (
                  <th key={p._id} className="py-3 px-4 text-left align-top">
                    <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 mb-2">
                      {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />}
                    </div>
                    <p className="font-semibold text-slate-900 text-xs leading-snug line-clamp-2">{p.name}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-slate-500 font-medium">{row.label}</td>
                  {properties.map((p) => (
                    <td key={p._id} className="py-3 px-4 text-slate-800 font-medium">
                      {typeof row.render === "function" ? row.render(p) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="py-4 px-4" />
                {properties.map((p) => (
                  <td key={p._id} className="py-4 px-4">
                    <Link href={`/properties/${p._id}`} className="block w-full py-2.5 rounded-lg bg-slate-900 text-white text-xs font-medium text-center hover:bg-slate-800 transition-colors">
                      View Details
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PropertyListCard({
  property,
  onHover,
  isHovered,
  isSelected,
  isFavorited,
  onToggleFavorite,
  isInCompare,
  onToggleCompare,
  canAddToCompare,
}: {
  property: any;
  onHover: (id: string | null) => void;
  isHovered: boolean;
  isSelected: boolean;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  isInCompare: boolean;
  onToggleCompare: (id: string) => void;
  canAddToCompare: boolean;
}) {
  const unit = property.units?.[0];
  const bedrooms = unit?.bedrooms ?? 0;
  const bathrooms = unit?.bathrooms ?? 0;
  const rentAmount = unit?.rentAmount ?? 0;
  const monthlyPrice = rentAmount > 500 ? rentAmount : rentAmount * 30;
  const dailyPrice = rentAmount > 500 ? monthlyPrice / 30 : rentAmount;
  const displayedDailyPrice = Math.max(1, Math.round(dailyPrice));
  const displayedMonthlyPrice = Math.round(monthlyPrice);
  const monthlySavings = Math.max(0, displayedDailyPrice * 30 - displayedMonthlyPrice);
  const sqft = unit?.squareFootage ?? 0;
  const imageUrl = property.images?.[0] || null;
  const imageCount = property.images?.length ?? 0;

  return (
    <Link href={`/properties/${property._id}`} className="block w-full overflow-hidden">
      <div
        className={`group flex flex-col sm:flex-row bg-white rounded-xl overflow-hidden transition-all duration-300 cursor-pointer ${
          isSelected
            ? "ring-2 ring-slate-900/20 ring-offset-2 shadow-lg"
            : isHovered
            ? "shadow-lg border-slate-200"
            : "shadow-sm border border-slate-200/60 hover:shadow-md hover:border-slate-200"
        }`}
        onMouseEnter={() => onHover(property._id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Image */}
        <div className="relative w-full h-[175px] sm:w-[180px] sm:min-w-[180px] sm:h-[155px] overflow-hidden bg-slate-100">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={property.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100">
              <Home className="h-8 w-8 text-slate-300" />
            </div>
          )}

          {/* FOR RENT badge */}
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/90 backdrop-blur-sm text-white uppercase tracking-wide">
              For Rent
            </span>
          </div>

          {/* Action buttons */}
          <div className="absolute top-2 right-2 flex flex-col gap-1.5">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(property._id); }}
              className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-200 ${isFavorited ? "bg-red-500 text-white scale-110" : "bg-white/90 text-slate-400 hover:text-red-400 hover:scale-110"}`}
              title={isFavorited ? "Remove from saved" : "Save property"}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare(property._id); }}
              disabled={!isInCompare && !canAddToCompare}
              className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-200 disabled:opacity-40 ${isInCompare ? "bg-sky-500 text-white scale-110" : "bg-white/90 text-slate-400 hover:text-sky-500 hover:scale-105"}`}
              title={isInCompare ? "Remove from compare" : "Add to compare"}
            >
              {isInCompare ? <Check className="w-3.5 h-3.5" /> : <GitCompare className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Image count */}
          {imageCount > 1 && (
            <div className="absolute bottom-2 left-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm text-white text-[9px] font-medium">
              <Grid3X3 className="w-2.5 h-2.5" />
              {imageCount}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            {/* Neighborhood tag */}
            {property.neighborhood && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                {property.neighborhood}
              </p>
            )}

            {/* Name + Price row */}
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h3 className="text-slate-900 text-sm leading-snug line-clamp-2 flex-1 min-w-0 font-medium tracking-tight">
                {property.name}
              </h3>
              <div className="text-right shrink-0">
                <div className="flex items-end justify-end gap-1">
                  <p className="text-base font-semibold text-slate-900 leading-none tracking-tight">
                    {formatPrice(displayedDailyPrice)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-normal">/day</p>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {formatPrice(displayedMonthlyPrice)}
                  <span className="ml-1 text-[10px] text-slate-400">/month</span>
                </p>
                {monthlySavings > 0 && (
                  <p className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                    Save {formatPrice(monthlySavings)}
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            {(property.address?.street || property.address?.city) && (
              <p className="flex items-center gap-1 text-slate-500 text-xs truncate">
                <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                <span className="truncate">
                  {property.address.street ? `${property.address.street}, ` : ""}
                  {property.address.city}
                  {property.address.state ? `, ${property.address.state}` : ""}
                </span>
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-slate-100">
            <span className="flex items-center gap-1 text-slate-500 text-xs">
              <Bed className="w-3 h-3 text-slate-300" />
              {bedrooms} {bedrooms === 1 ? "Bed" : "Beds"}
            </span>
            <span className="flex items-center gap-1 text-slate-500 text-xs">
              <Bath className="w-3 h-3 text-slate-300" />
              {bathrooms} {bathrooms === 1 ? "Bath" : "Baths"}
            </span>
            {sqft > 0 && (
              <span className="text-slate-400 text-xs">{sqft.toLocaleString()} ft²</span>
            )}
            <span className="ml-auto flex items-center gap-0.5 text-slate-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
              View <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function RentalsGuestRow({
  label,
  sub,
  value,
  min,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  min: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-6 text-center text-sm tabular-nums">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function RentalsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocalizationContext();
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [listDrawerOpen, setListDrawerOpen] = useState(true);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [stayCalMonths, setStayCalMonths] = useState(1);
  const [isLg, setIsLg] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false
  );

  const activeType = searchParams.get("type") || "";
  const activeBedrooms = searchParams.get("bedrooms") || "";
  const activeParkingType = searchParams.get("parkingType") || "";
  const activeMinPrice = searchParams.get("minRent") || "";
  const activeMaxPrice = searchParams.get("maxRent") || "";
  const activeSearch = searchParams.get("search") || "";
  const activeNeighborhood = searchParams.get("neighborhood") || "";

  const getBrowseQueryString = useCallback(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("checkIn");
    p.delete("checkOut");
    p.delete("adults");
    p.delete("children");
    p.delete("infants");
    if (!p.get("page")) p.set("page", "1");
    p.set("limit", "50");
    return p.toString();
  }, [searchParams]);

  const getAvailabilityExtraParams = useCallback(() => {
    const o: Record<string, string> = {};
    if (activeBedrooms) o.bedrooms = activeBedrooms;
    if (activeType) o.type = activeType;
    if (activeNeighborhood) o.neighborhood = activeNeighborhood;
    if (activeSearch) o.search = activeSearch;
    if (activeMinPrice) o.minRent = activeMinPrice;
    if (activeMaxPrice) o.maxRent = activeMaxPrice;
    return o;
  }, [
    activeBedrooms,
    activeType,
    activeNeighborhood,
    activeSearch,
    activeMinPrice,
    activeMaxPrice,
  ]);

  const stay = usePublicStaySearch({
    pathnameBase: "/rentals",
    mergeUrl: true,
    getBrowseQueryString,
    getAvailabilityExtraParams,
  });

  const {
    checkIn,
    setCheckIn,
    checkOut,
    setCheckOut,
    adults,
    setAdults,
    children,
    setChildren,
    infants,
    setInfants,
    guestLabel,
    properties,
    loading: stayLoading,
    searching,
    filteredMode,
    zeroResultHints,
    runAvailabilitySearch,
    clearStayDatesFromUrl,
    browsePagination,
  } = stay;

  const mapLoading = stayLoading || searching;
  const pagination = filteredMode
    ? { page: 1, total: properties.length, pages: 1 }
    : browsePagination;

  const [searchText, setSearchText] = useState(activeSearch);
  const [minPrice, setMinPrice] = useState(activeMinPrice);
  const [maxPrice, setMaxPrice] = useState(activeMaxPrice);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedProperty = useMemo(
    () => properties.find((p) => p._id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId]
  );

  useEffect(() => {
    if (properties.length === 0) {
      setSelectedPropertyId(null);
      return;
    }

    const selectedStillExists = properties.some((p) => p._id === selectedPropertyId);
    if ((!selectedPropertyId && isLg) || (selectedPropertyId && !selectedStillExists)) {
      setSelectedPropertyId(properties[0]._id);
    }
  }, [properties, selectedPropertyId, isLg]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("smartstart_favorites");
      if (stored) setFavoriteIds(JSON.parse(stored));
    } catch {}
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("smartstart_favorites", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }, []);

  useEffect(() => {
    setSearchText(searchParams.get("search") || "");
    setMinPrice(searchParams.get("minRent") || "");
    setMaxPrice(searchParams.get("maxRent") || "");
  }, [searchParams]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const fn = () => {
      setIsLg(mq.matches);
      if (mq.matches) setMoreFiltersOpen(true);
    };
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const fn = () => setStayCalMonths(mq.matches ? 2 : 1);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const rangeSelected = useMemo<DateRange | undefined>(
    () =>
      checkIn || checkOut ? { from: checkIn, to: checkOut } : undefined,
    [checkIn, checkOut]
  );

  const activeCheckIn = searchParams.get("checkIn") || "";
  const activeCheckOut = searchParams.get("checkOut") || "";

  const buildParams = useCallback((patch: Record<string, string | undefined> = {}) => {
    const resolved = {
      search: "search" in patch ? patch.search : activeSearch,
      type: "type" in patch ? patch.type : activeType,
      bedrooms: "bedrooms" in patch ? patch.bedrooms : activeBedrooms,
      minRent: "minRent" in patch ? patch.minRent : minPrice,
      maxRent: "maxRent" in patch ? patch.maxRent : maxPrice,
      neighborhood: "neighborhood" in patch ? patch.neighborhood : activeNeighborhood,
      parkingType: "parkingType" in patch ? patch.parkingType : activeParkingType,
    };
    const params = new URLSearchParams();
    if (resolved.search) params.set("search", resolved.search);
    if (resolved.type) params.set("type", resolved.type);
    if (resolved.bedrooms) params.set("bedrooms", resolved.bedrooms);
    if (resolved.minRent) params.set("minRent", resolved.minRent);
    if (resolved.maxRent) params.set("maxRent", resolved.maxRent);
    if (resolved.neighborhood) params.set("neighborhood", resolved.neighborhood);
    if (resolved.parkingType) params.set("parkingType", resolved.parkingType);
    const ci = searchParams.get("checkIn");
    const co = searchParams.get("checkOut");
    if (ci) params.set("checkIn", ci);
    if (co) params.set("checkOut", co);
    const a = searchParams.get("adults");
    const ch = searchParams.get("children");
    const inf = searchParams.get("infants");
    if (a) params.set("adults", a);
    if (ch) params.set("children", ch);
    if (inf) params.set("infants", inf);
    return params;
  }, [activeSearch, activeType, activeBedrooms, minPrice, maxPrice, activeNeighborhood, activeParkingType, searchParams]);

  const pushFilters = useCallback((patch: Record<string, string | undefined> = {}) => {
    router.push(`/rentals?${buildParams(patch).toString()}`);
  }, [buildParams, router]);

  const clearFilters = useCallback(() => {
    setSearchText("");
    setMinPrice("");
    setMaxPrice("");
    setListDrawerOpen(false);
    router.push("/rentals");
  }, [router]);

  const handleNeighborhood = useCallback((value: string) => {
    pushFilters({ neighborhood: value || undefined });
  }, [pushFilters]);

  const handleSearchInput = useCallback((value: string) => {
    setSearchText(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      router.push(`/rentals?${buildParams({ search: value || undefined }).toString()}`);
    }, 550);
  }, [buildParams, router]);

  const handleMarkerClick = useCallback((propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setHoveredPropertyId(propertyId);
    if (window.innerWidth < 768) setMobileView("list");
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.push(`/rentals?${params.toString()}`);
    },
    [searchParams, router]
  );

  const hasActiveFilters = !!(
    activeType ||
    activeBedrooms ||
    activeMinPrice ||
    activeMaxPrice ||
    activeSearch ||
    activeNeighborhood ||
    activeParkingType ||
    activeCheckIn ||
    activeCheckOut
  );

  const showFullPropertyCardList =
    (!isLg && mobileView === "list") || (isLg && listDrawerOpen);

  const selectedUnavailableOnMap =
    filteredMode &&
    selectedPropertyId &&
    !properties.some((p) => p._id === selectedPropertyId);

  const rentalsListBody = (opts: { showFeaturedCard: boolean }) => (
    <>
      {opts.showFeaturedCard && selectedProperty && (
        <PropertyFeaturedCard
          property={selectedProperty}
          onClose={() => setSelectedPropertyId(null)}
        />
      )}
      {opts.showFeaturedCard && selectedProperty && !mapLoading && showFullPropertyCardList && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {t("rentals.results.all").replace("{count}", String(pagination.total))}
          </span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
      )}
      {mapLoading && showFullPropertyCardList ? (
        <>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-[155px] sm:h-[140px] rounded-xl bg-white/80 border border-slate-200/80 animate-pulse"
            />
          ))}
        </>
      ) : null}
      {!mapLoading && properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
            <Home className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-800 font-semibold text-lg mb-1.5">{t("rentals.noResults.title")}</p>
          <p className="text-slate-500 text-sm mb-5 max-w-sm">{t("rentals.noResults.subtitle")}</p>
          {filteredMode && zeroResultHints.length > 0 && (
            <div className="flex flex-col gap-2 mb-5 w-full max-w-sm">
              {zeroResultHints.map((h, idx) => {
                const cin = parseStayParamDate(h.suggestedCheckIn);
                const cout = parseStayParamDate(h.suggestedCheckOut);
                if (!cin || !cout) return null;
                return (
                  <button
                    key={`zr-${idx}`}
                    type="button"
                    onClick={() => runAvailabilitySearch({ checkIn: cin, checkOut: cout })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    {h.label || `${h.suggestedCheckIn} → ${h.suggestedCheckOut}`}
                  </button>
                );
              })}
            </div>
          )}
          <button
            onClick={clearFilters}
            className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            {t("rentals.noResults.clearFilters")}
          </button>
        </div>
      ) : null}
      {showFullPropertyCardList && !mapLoading && properties.length > 0
        ? (() => {
            const displayed = showFavoritesOnly
              ? properties.filter((p) => favoriteIds.includes(p._id))
              : properties;
            if (displayed.length === 0 && showFavoritesOnly) {
              return (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <Heart className="w-12 h-12 text-slate-200 mb-4" />
                  <p className="text-slate-800 font-semibold mb-1.5">{t("rentals.noSaved.title")}</p>
                  <p className="text-slate-500 text-sm mb-5">{t("rentals.noSaved.subtitle")}</p>
                  <button
                    onClick={() => setShowFavoritesOnly(false)}
                    className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    {t("rentals.noSaved.browseAll")}
                  </button>
                </div>
              );
            }
            return (
              <>
                {displayed.map((property) => (
                  <div key={property._id} id={`property-${property._id}`}>
                    <PropertyListCard
                      property={property}
                      onHover={setHoveredPropertyId}
                      isHovered={hoveredPropertyId === property._id}
                      isSelected={selectedPropertyId === property._id}
                      isFavorited={favoriteIds.includes(property._id)}
                      onToggleFavorite={toggleFavorite}
                      isInCompare={compareIds.includes(property._id)}
                      onToggleCompare={toggleCompare}
                      canAddToCompare={compareIds.length < 3}
                    />
                  </div>
                ))}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-6">
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => handlePageChange(page)}
                        className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium transition-all ${
                          page === pagination.page
                            ? "bg-slate-900 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                )}
              </>
            );
          })()
        : null}
      <div className="h-4" />
    </>
  );

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col overflow-x-hidden w-full">
      <LandingHeader />

      <div className="pt-[48px] flex flex-col flex-1">
        {/* Sticky search — compact card, filters collapsible on small screens */}
        <div className="sticky top-[48px] z-30 border-b border-slate-200/60 bg-[#f8f7f4]/92 backdrop-blur-md">
          <div className="mx-auto max-w-[1600px] px-4 py-3 sm:px-6">
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-[0_10px_30px_rgba(148,163,184,0.14)] sm:px-4 sm:py-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <div className="relative min-w-0 w-full max-w-full sm:w-auto sm:max-w-[12rem] md:max-w-[13rem] lg:max-w-[14rem] xl:max-w-[15rem]">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400"
                    aria-hidden
                  />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                        pushFilters({ search: searchText || undefined });
                      }
                    }}
                    placeholder={t("rentals.search.placeholder")}
                    className="w-full rounded-xl border border-sky-100 bg-sky-50/55 py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    title="Clear all filters"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-violet-400" />
                    <span className="hidden sm:inline">{t("rentals.filters.reset")}</span>
                  </button>
                )}
                {/* Stay: dates, guests, availability — before list/map */}
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        aria-label="Stay dates"
                        className="h-9 max-w-[10.5rem] shrink-0 justify-start rounded-xl border-sky-100 bg-sky-50/60 px-2.5 text-left text-xs font-medium text-slate-700 shadow-none hover:bg-sky-50 sm:max-w-[12.5rem] md:max-w-[14rem]"
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
                        <span className="truncate">
                          {checkIn && checkOut
                            ? `${format(checkIn, "MMM d")} – ${format(checkOut, "MMM d")}`
                            : checkIn
                              ? `${format(checkIn, "MMM d")} → …`
                              : "Check-in — Check-out"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        numberOfMonths={stayCalMonths}
                        selected={rangeSelected}
                        onSelect={(r) => {
                          setCheckIn(r?.from);
                          setCheckOut(r?.to);
                        }}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        aria-label="Guests"
                        className="h-9 w-[6.75rem] shrink-0 justify-between rounded-xl border-violet-100 bg-violet-50/60 px-2.5 text-xs font-medium text-slate-700 shadow-none hover:bg-violet-50 sm:w-28"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                          <span className="truncate">{guestLabel}</span>
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-4" align="start">
                      <RentalsGuestRow
                        label="Adults"
                        sub="Ages 13+"
                        value={adults}
                        min={1}
                        onChange={setAdults}
                      />
                      <RentalsGuestRow
                        label="Children"
                        sub="Ages 2–12"
                        value={children}
                        min={0}
                        onChange={setChildren}
                      />
                      <RentalsGuestRow
                        label="Infants"
                        sub="Under 2"
                        value={infants}
                        min={0}
                        onChange={setInfants}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    className="h-9 shrink-0 rounded-xl bg-sky-100 px-3 text-xs font-semibold text-sky-900 shadow-none hover:bg-sky-200"
                    disabled={searching || !checkIn || !checkOut}
                    onClick={() => runAvailabilitySearch()}
                  >
                    {searching ? "…" : "Check availability"}
                  </Button>
                  {(activeCheckIn || activeCheckOut) && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 shrink-0 rounded-xl px-2 text-xs text-slate-600 hover:bg-slate-100"
                      onClick={() => clearStayDatesFromUrl()}
                    >
                      Clear dates
                    </Button>
                  )}
                </div>
                <div className="hidden min-w-0 shrink-0 items-center gap-2 lg:flex">
                  <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 shadow-none">
                    <Building2 className="size-3.5 shrink-0 text-sky-400" aria-hidden />
                    <Select
                      value={activeType || "__all"}
                      onValueChange={(v) => pushFilters({ type: v === "__all" ? undefined : v })}
                    >
                      <SelectTrigger
                        size="sm"
                        aria-label="Property type"
                        className="h-8 w-[6.25rem] border-0 bg-transparent px-1 text-slate-700 shadow-none focus-visible:ring-0 xl:w-[7rem]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map((opt) => (
                          <SelectItem key={opt.value || "all-types"} value={opt.value || "__all"}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 shadow-none">
                    <Bed className="size-3.5 shrink-0 text-violet-400" aria-hidden />
                    <Select
                      value={activeBedrooms || "__all"}
                      onValueChange={(v) => pushFilters({ bedrooms: v === "__all" ? undefined : v })}
                    >
                      <SelectTrigger
                        size="sm"
                        aria-label="Bedrooms"
                        className="h-8 w-[5.5rem] border-0 bg-transparent px-1 text-slate-700 shadow-none focus-visible:ring-0 xl:w-[6rem]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BEDROOMS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value || "any-beds"} value={opt.value || "__all"}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 shadow-none">
                    <Car className="size-3.5 shrink-0 text-emerald-400" aria-hidden />
                    <Select
                      value={activeParkingType || "__all"}
                      onValueChange={(v) =>
                        pushFilters({ parkingType: v === "__all" ? undefined : v })
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        aria-label="Parking"
                        className="h-8 w-[5rem] border-0 bg-transparent px-1 text-slate-700 shadow-none focus-visible:ring-0"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PARKING_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value || "any-park"} value={opt.value || "__all"}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div
                    className="flex h-9 shrink-0 items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 shadow-none"
                    role="group"
                    aria-label="Price per month"
                  >
                    <DollarSign className="size-3.5 shrink-0 text-amber-400" aria-hidden />
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      onBlur={() => pushFilters({ minRent: minPrice || undefined })}
                      onKeyDown={(e) => e.key === "Enter" && pushFilters({ minRent: minPrice || undefined })}
                      placeholder="Min"
                      className="h-7 w-11 border-0 bg-transparent p-0 text-xs text-slate-800 tabular-nums placeholder:text-slate-400 focus:outline-none focus:ring-0"
                    />
                    <span className="text-[10px] text-slate-300">–</span>
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      onBlur={() => pushFilters({ maxRent: maxPrice || undefined })}
                      onKeyDown={(e) => e.key === "Enter" && pushFilters({ maxRent: maxPrice || undefined })}
                      placeholder="Max"
                      className="h-7 w-11 border-0 bg-transparent p-0 text-xs text-slate-800 tabular-nums placeholder:text-slate-400 focus:outline-none focus:ring-0"
                    />
                  </div>

                  <div className="flex h-9 min-w-0 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 shadow-none lg:w-40 xl:w-48">
                    <MapPin className="size-3.5 shrink-0 text-rose-300" aria-hidden />
                    <Select
                      value={activeNeighborhood || "__all"}
                      onValueChange={(v) => handleNeighborhood(v === "__all" ? "" : v)}
                    >
                      <SelectTrigger
                        size="sm"
                        aria-label="Area"
                        className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NEIGHBORHOODS.map((n) => (
                          <SelectItem key={n.value || "all-n"} value={n.value || "__all"}>
                            {n.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFavoritesOnly((v) => !v)}
                    aria-pressed={showFavoritesOnly}
                    aria-label={`${t("rentals.filters.saved")} (${favoriteIds.length})`}
                    className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-colors ${
                      showFavoritesOnly
                        ? "border-rose-400 bg-rose-50 text-rose-700"
                        : "border-rose-100 bg-rose-50/55 text-slate-600 hover:bg-rose-50"
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
                    <span>{t("rentals.filters.saved")}</span>
                    {favoriteIds.length > 0 ? (
                      <span className="tabular-nums text-slate-400">({favoriteIds.length})</span>
                    ) : null}
                  </button>
                  {mapLoading ? (
                    <span className="inline-flex h-9 shrink-0 items-center gap-2 text-xs text-slate-400">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
                    </span>
                  ) : (
                    <p className="shrink-0 whitespace-nowrap text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{pagination.total}</span>{" "}
                      {pagination.total === 1
                        ? t("rentals.results.property")
                        : t("rentals.results.properties")}
                    </p>
                  )}
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setMobileView("list")}
                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 ${
                      mobileView === "list"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                    }`}
                  >
                    <LayoutList className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("rentals.view.list")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileView("map")}
                    className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 ${
                      mobileView === "map"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                    }`}
                  >
                    <Map className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("rentals.view.map")}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setListDrawerOpen((v) => !v)}
                  className={`hidden h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-colors lg:inline-flex ${
                    listDrawerOpen
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  {listDrawerOpen ? "Hide list" : "List"}
                </button>
              </div>

              {filteredMode && (
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Showing units available for your dates. Parking filter applies.
                </p>
              )}

              <button
                type="button"
                onClick={() => setMoreFiltersOpen((v) => !v)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50/80 lg:hidden"
                aria-expanded={moreFiltersOpen}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                {moreFiltersOpen ? "Hide filters" : "More filters"}
                {moreFiltersOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                )}
              </button>

              <div
                className={`mt-3 space-y-3 border-t border-slate-100 pt-3 lg:hidden ${moreFiltersOpen ? "block" : "hidden"}`}
              >
                <div className="flex flex-nowrap items-stretch gap-2 overflow-x-auto pb-0.5 scrollbar-hide sm:gap-2.5 md:items-center md:gap-3">
                  <div className="flex min-w-0 flex-1 flex-nowrap items-stretch gap-2 sm:gap-2.5 md:items-center md:gap-3">
                    <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2 shadow-sm">
                      <Building2 className="size-3.5 shrink-0 text-slate-400" aria-hidden />
                      <Select
                        value={activeType || "__all"}
                        onValueChange={(v) => pushFilters({ type: v === "__all" ? undefined : v })}
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label="Property type"
                          className="h-8 w-[7.25rem] border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 sm:w-36"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map((opt) => (
                            <SelectItem key={opt.value || "all-types"} value={opt.value || "__all"}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2 shadow-sm">
                      <Bed className="size-3.5 shrink-0 text-slate-400" aria-hidden />
                      <Select
                        value={activeBedrooms || "__all"}
                        onValueChange={(v) => pushFilters({ bedrooms: v === "__all" ? undefined : v })}
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label="Bedrooms"
                          className="h-8 w-[6.5rem] border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 sm:w-32"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BEDROOMS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value || "any-beds"} value={opt.value || "__all"}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2 shadow-sm">
                      <Car className="size-3.5 shrink-0 text-slate-400" aria-hidden />
                      <Select
                        value={activeParkingType || "__all"}
                        onValueChange={(v) =>
                          pushFilters({ parkingType: v === "__all" ? undefined : v })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label="Parking"
                          className="h-8 w-[5.75rem] border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 sm:w-28"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PARKING_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value || "any-park"} value={opt.value || "__all"}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div
                      className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2 shadow-sm"
                      role="group"
                      aria-label="Price per month"
                    >
                      <DollarSign className="size-3.5 shrink-0 text-slate-400" aria-hidden />
                      <input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        onBlur={() => pushFilters({ minRent: minPrice || undefined })}
                        onKeyDown={(e) => e.key === "Enter" && pushFilters({ minRent: minPrice || undefined })}
                        placeholder="Min"
                        className="h-7 w-14 border-0 bg-transparent p-0 text-xs text-slate-800 tabular-nums placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:w-16"
                      />
                      <span className="text-[10px] text-slate-300">–</span>
                      <input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        onBlur={() => pushFilters({ maxRent: maxPrice || undefined })}
                        onKeyDown={(e) => e.key === "Enter" && pushFilters({ maxRent: maxPrice || undefined })}
                        placeholder="Max"
                        className="h-7 w-14 border-0 bg-transparent p-0 text-xs text-slate-800 tabular-nums placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:w-16"
                      />
                    </div>

                    <div className="flex h-9 min-w-0 shrink-0 flex-1 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2 shadow-sm sm:w-44 md:w-52 lg:w-60">
                      <MapPin className="size-3.5 shrink-0 text-slate-400" aria-hidden />
                      <Select
                        value={activeNeighborhood || "__all"}
                        onValueChange={(v) => handleNeighborhood(v === "__all" ? "" : v)}
                      >
                        <SelectTrigger
                          size="sm"
                          aria-label="Area"
                          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NEIGHBORHOODS.map((n) => (
                            <SelectItem key={n.value || "all-n"} value={n.value || "__all"}>
                              {n.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 border-l border-slate-100 pl-2 sm:gap-3 sm:pl-3">
                    <button
                      type="button"
                      onClick={() => setShowFavoritesOnly((v) => !v)}
                      aria-pressed={showFavoritesOnly}
                      aria-label={`${t("rentals.filters.saved")} (${favoriteIds.length})`}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors sm:px-3 ${
                        showFavoritesOnly
                          ? "border-rose-400 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
                      <span className="max-sm:sr-only">{t("rentals.filters.saved")}</span>
                      {favoriteIds.length > 0 ? (
                        <span className="tabular-nums text-slate-400">({favoriteIds.length})</span>
                      ) : null}
                    </button>
                    {mapLoading ? (
                      <span className="inline-flex h-9 items-center gap-2 text-xs text-slate-400">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
                      </span>
                    ) : (
                      <p className="whitespace-nowrap text-[11px] text-slate-500 sm:text-xs">
                        <span className="font-semibold text-slate-800">{pagination.total}</span>{" "}
                        <span className="hidden sm:inline">
                          {pagination.total === 1
                            ? t("rentals.results.property")
                            : t("rentals.results.properties")}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden relative z-0 min-h-0">

          {/* MOBILE MAP VIEW — scrollable page with map + area guide below */}
          {mobileView === "map" && (
            <div className="flex lg:hidden flex-col w-full overflow-y-auto bg-[#f8f7f4]">
              <div className="relative w-full flex-shrink-0" style={{ height: "62vmax", minHeight: 320, maxHeight: "70vh", isolation: "isolate" }}>
                <MapErrorBoundary>
                  <RentalsGoogleMap
                    properties={properties}
                    onMarkerClick={handleMarkerClick}
                    onMarkerHover={setHoveredPropertyId}
                    hoveredPropertyId={hoveredPropertyId ?? selectedPropertyId}
                    neighborhoods={NEIGHBORHOODS}
                    activeNeighborhood={activeNeighborhood}
                    onNeighborhoodChange={handleNeighborhood}
                  />
                </MapErrorBoundary>
                {selectedProperty && (
                  <div className="absolute bottom-3 left-3 right-3 z-[1000] max-w-md pointer-events-none">
                    <div className="pointer-events-auto shadow-xl">
                      <PropertyFeaturedCard
                        property={selectedProperty}
                        onClose={() => setSelectedPropertyId(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="px-4 py-6 border-t border-slate-200">
                <NaplesAreaGuide />
              </div>
            </div>
          )}

          {/* Desktop split view */}
          <div
            className="hidden lg:grid w-full flex-1 min-h-0"
            style={{
              gridTemplateColumns: listDrawerOpen
                ? "minmax(0, 1fr) minmax(24rem, 30rem)"
                : "minmax(0, 1fr)",
            }}
          >
            <div className="min-w-0 overflow-y-auto bg-[#f8f7f4] border-r border-slate-200/60">
              <div
                className="relative w-full flex-shrink-0"
                style={{ height: "calc(100vh - 200px)", minHeight: 440, isolation: "isolate" }}
              >
                <MapErrorBoundary>
                  <RentalsGoogleMap
                    properties={properties}
                    onMarkerClick={handleMarkerClick}
                    onMarkerHover={setHoveredPropertyId}
                    hoveredPropertyId={hoveredPropertyId ?? selectedPropertyId}
                    neighborhoods={NEIGHBORHOODS}
                    activeNeighborhood={activeNeighborhood}
                    onNeighborhoodChange={handleNeighborhood}
                  />
                </MapErrorBoundary>
                {selectedProperty && !listDrawerOpen && (
                  <div className="absolute bottom-3 left-3 right-3 z-[1000] max-w-md pointer-events-none">
                    <div className="pointer-events-auto shadow-xl">
                      <PropertyFeaturedCard
                        property={selectedProperty}
                        onClose={() => setSelectedPropertyId(null)}
                      />
                    </div>
                  </div>
                )}
                {selectedUnavailableOnMap && (
                  <div className="absolute top-3 left-3 right-3 z-[1000] max-w-lg pointer-events-none">
                    <div className="pointer-events-auto rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-lg backdrop-blur-sm">
                      This property is not available for your selected dates. Adjust dates or pick
                      another pin.
                      {zeroResultHints.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {zeroResultHints.slice(0, 2).map((h, idx) => {
                            const cin = parseStayParamDate(h.suggestedCheckIn);
                            const cout = parseStayParamDate(h.suggestedCheckOut);
                            if (!cin || !cout) return null;
                            return (
                              <button
                                key={`hint-${idx}`}
                                type="button"
                                className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                                onClick={() =>
                                  runAvailabilitySearch({ checkIn: cin, checkOut: cout })
                                }
                              >
                                {h.label || "Try suggested dates"}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 bg-white/80 px-5 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Explore Naples
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Browse on the map and use the panel to compare, save, and open full details.
                    </p>
                  </div>
                  {pagination.pages > 1 && !listDrawerOpen && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      <span className="text-xs font-medium text-slate-600 tabular-nums">
                        Page {pagination.page} / {pagination.pages}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.pages}
                        className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 lg:px-8 py-8 border-t border-slate-200">
                <NaplesAreaGuide />
              </div>
            </div>

            {listDrawerOpen && (
              <aside className="min-h-0 border-l border-slate-200/70 bg-white/85 backdrop-blur-xl flex flex-col">
                <div className="shrink-0 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Refined stays
                      </p>
                      <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                        {pagination.total}{" "}
                        {pagination.total === 1
                          ? t("rentals.results.property")
                          : t("rentals.results.properties")}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setListDrawerOpen(false)}
                      className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                      aria-label="Hide property panel"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto bg-[#fcfcfb] p-4">
                  {rentalsListBody({ showFeaturedCard: false })}
                </div>
              </aside>
            )}
          </div>

          {/* Listings — phone/tablet; desktop uses drawer */}
          <div
            className={`${
              mobileView === "list" ? "flex" : "hidden"
            } lg:hidden flex-col w-full overflow-y-auto overflow-x-hidden bg-[#f8f7f4] border-t border-slate-200/60`}
            style={{ isolation: "isolate" }}
          >
            <div className="p-4 sm:p-5 space-y-3 w-full overflow-x-hidden max-w-2xl mx-auto">
              {rentalsListBody({ showFeaturedCard: true })}
            </div>
          </div>
        </div>

      </div>

      {/* Floating comparison bar */}
      {compareIds.length >= 1 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 bg-slate-900 text-white rounded-xl shadow-xl px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-800/60 backdrop-blur-md max-w-[calc(100vw-2rem)]">
          <div className="flex items-center gap-2">
            {compareIds.map((id) => {
              const p = properties.find((x) => x._id === id);
              return (
                <div key={id} className="relative">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-700">
                    {p?.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <button
                    onClick={() => toggleCompare(id)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-md bg-slate-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
            {compareIds.length < 3 && (
              <div className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-xs">
                +
              </div>
            )}
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <p className="text-xs text-slate-400 leading-none mb-0.5">{t("rentals.compare.bar.compare")}</p>
            <p className="text-sm font-semibold leading-none">{compareIds.length} {compareIds.length === 1 ? t("rentals.compare.bar.property") : t("rentals.compare.bar.properties")}</p>
          </div>
          <button
            onClick={() => setShowCompareModal(true)}
            disabled={compareIds.length < 2}
            className="ml-1 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {t("rentals.compare.bar.compare")}
          </button>
          <button
            onClick={() => setCompareIds([])}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Clear all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Comparison modal */}
      <LunaWidget />

      {showCompareModal && (
        <CompareModal
          properties={properties.filter((p) => compareIds.includes(p._id))}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
}

export default function RentalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-pulse text-slate-400 text-sm">Loading properties…</div>
        </div>
      }
    >
      <RentalsContent />
    </Suspense>
  );
}
