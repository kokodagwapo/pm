"use client";

import { useState, useEffect, useCallback, Suspense, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LunaWidget } from "@/components/landing/LunaWidget";
import { PropertyMap } from "@/components/landing/PropertyMap";
import { NaplesAreaGuide } from "@/components/landing/NaplesAreaGuide";
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
} from "lucide-react";

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
    <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Selected Property</span>
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
              <p className="text-white font-bold text-xl leading-tight drop-shadow-lg" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
                {formatPrice(price)}
                <span className="text-white/60 text-sm font-normal ml-1">/mo</span>
              </p>
              {basePerNight > 0 && (
                <p className="text-white/70 text-xs mt-0.5">~{formatPrice(basePerNight)}/night</p>
              )}
            </div>
            {images.length > 1 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 text-white text-[9px] backdrop-blur-sm font-medium">
                <Grid3X3 className="w-2.5 h-2.5" />
                {images.length}
              </span>
            )}
          </div>
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-white/10 backdrop-blur-sm border border-white/20 text-white uppercase tracking-widest">
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
          <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600/80 mb-1">{property.neighborhood}</p>
        )}
        <h3 className="text-slate-900 text-base leading-tight line-clamp-2 mb-1.5" style={{ fontFamily: "var(--font-montserrat), var(--font-jakarta), system-ui, sans-serif", fontWeight: 300 }}>
          {property.name}
        </h3>
        {(property.address?.street || property.address?.city) && (
          <p className="flex items-center gap-1 text-slate-900 text-xs mb-3 truncate" style={{ fontFamily: "var(--font-montserrat), var(--font-jakarta), system-ui, sans-serif", fontWeight: 300 }}>
            <MapPin className="w-2.5 h-2.5 shrink-0 text-amber-400" />
            {property.address.street ? `${property.address.street}, ` : ""}
            {property.address.city}
            {property.address.state ? `, ${property.address.state}` : ""}
          </p>
        )}

        <div className="flex items-center gap-3 mb-3.5 pb-3 border-b border-slate-100">
          <span className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
            <Bed className="w-3 h-3 text-slate-300" />
            {bedrooms} {bedrooms === 1 ? "Bed" : "Beds"}
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
            <Bath className="w-3 h-3 text-slate-300" />
            {bathrooms} {bathrooms === 1 ? "Bath" : "Baths"}
          </span>
          {sqft > 0 && (
            <span className="text-slate-400 text-xs">{sqft.toLocaleString()} ft²</span>
          )}
        </div>

        <Link
          href={`/properties/${property._id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 active:bg-slate-950 transition-colors shadow-sm"
        >
          View Property Details
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Dismiss */}
      <button
        onClick={onClose}
        className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-slate-100 text-[11px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
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
      return <span className="font-bold text-sky-600">{formatPrice(price)}</span>;
    }},
    { label: "Bedrooms", render: (p: any) => p.units?.[0]?.bedrooms ?? "—" },
    { label: "Bathrooms", render: (p: any) => p.units?.[0]?.bathrooms ?? "—" },
    { label: "Sq Ft", render: (p: any) => p.units?.[0]?.squareFootage ? `${p.units[0].squareFootage.toLocaleString()} sqft` : "—" },
    { label: "Neighborhood", render: (p: any) => p.neighborhood ?? "Naples" },
    { label: "Type", render: (p: any) => p.type ?? "—" },
    { label: "Status", render: (p: any) => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${p.status === "available" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
        {p.status ?? "unknown"}
      </span>
    )},
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-sky-500" />
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
                    <Link href={`/properties/${p._id}`} className="block w-full py-2.5 rounded-xl bg-sky-500 text-white text-xs font-semibold text-center hover:bg-sky-600 transition-colors">
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
  const price = rentAmount > 500 ? rentAmount : rentAmount * 30;
  const sqft = unit?.squareFootage ?? 0;
  const imageUrl =
    property.images?.[0] ||
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80";
  const imageCount = property.images?.length ?? 0;

  return (
    <Link href={`/properties/${property._id}`} className="block w-full overflow-hidden">
      <div
        className={`group flex flex-col sm:flex-row bg-white rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${
          isSelected
            ? "ring-2 ring-amber-400 ring-offset-1 shadow-lg opacity-70"
            : isHovered
            ? "shadow-xl ring-2 ring-slate-900/10 ring-offset-1"
            : "shadow-sm hover:shadow-xl border border-slate-100"
        }`}
        onMouseEnter={() => onHover(property._id)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Image */}
        <div className="relative w-full h-[175px] sm:w-[180px] sm:min-w-[180px] sm:h-[155px] overflow-hidden bg-slate-100">
          <img
            src={imageUrl}
            alt={property.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* FOR RENT badge */}
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900/80 backdrop-blur-sm text-white uppercase tracking-widest">
              For Rent
            </span>
          </div>

          {/* Action buttons */}
          <div className="absolute top-2 right-2 flex flex-col gap-1.5">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(property._id); }}
              className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-200 ${isFavorited ? "bg-red-500 text-white scale-110" : "bg-white/90 text-slate-400 hover:text-red-400 hover:scale-110"}`}
              title={isFavorited ? "Remove from saved" : "Save property"}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare(property._id); }}
              disabled={!isInCompare && !canAddToCompare}
              className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-200 disabled:opacity-40 ${isInCompare ? "bg-sky-500 text-white scale-110" : "bg-white/90 text-slate-400 hover:text-sky-500 hover:scale-105"}`}
              title={isInCompare ? "Remove from compare" : "Add to compare"}
            >
              {isInCompare ? <Check className="w-3.5 h-3.5" /> : <GitCompare className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Image count */}
          {imageCount > 1 && (
            <div className="absolute bottom-2 left-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-[9px] font-medium">
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
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600/80 mb-1">
                {property.neighborhood}
              </p>
            )}

            {/* Name + Price row */}
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h3 className="font-light text-slate-900 text-[13px] leading-snug line-clamp-2 flex-1 min-w-0" style={{ fontFamily: "var(--font-montserrat), var(--font-jakarta), system-ui, sans-serif", fontWeight: 300 }}>
                {property.name}
              </h3>
              <div className="text-right shrink-0">
                <p className="text-[17px] font-semibold text-slate-900 leading-none tracking-tight" style={{ fontFamily: "var(--font-montserrat), var(--font-jakarta), system-ui, sans-serif" }}>
                  {formatPrice(price)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-normal">/month</p>
              </div>
            </div>

            {/* Address */}
            {(property.address?.street || property.address?.city) && (
              <p className="flex items-center gap-1 text-slate-900 text-[11px] truncate" style={{ fontFamily: "var(--font-montserrat), var(--font-jakarta), system-ui, sans-serif", fontWeight: 300 }}>
                <MapPin className="w-2.5 h-2.5 shrink-0 text-amber-400" />
                <span className="truncate">
                  {property.address.street ? `${property.address.street}, ` : ""}
                  {property.address.city}
                  {property.address.state ? `, ${property.address.state}` : ""}
                </span>
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-slate-100/80" style={{ fontFamily: "var(--font-montserrat), var(--font-jakarta), system-ui, sans-serif" }}>
            <span className="flex items-center gap-1 text-slate-500 text-[11px]" style={{ fontWeight: 300 }}>
              <Bed className="w-3 h-3 text-slate-300" />
              {bedrooms} {bedrooms === 1 ? "Bed" : "Beds"}
            </span>
            <span className="flex items-center gap-1 text-slate-500 text-[11px]" style={{ fontWeight: 300 }}>
              <Bath className="w-3 h-3 text-slate-300" />
              {bathrooms} {bathrooms === 1 ? "Bath" : "Baths"}
            </span>
            {sqft > 0 && (
              <span className="text-slate-400 text-[11px]" style={{ fontWeight: 300 }}>{sqft.toLocaleString()} ft²</span>
            )}
            <span className="ml-auto flex items-center gap-0.5 text-slate-900 text-[11px] opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0" style={{ fontWeight: 500 }}>
              View <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function RentalsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocalizationContext();
  const [properties, setProperties] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const activeType = searchParams.get("type") || "";
  const activeBedrooms = searchParams.get("bedrooms") || "";
  const activeMinPrice = searchParams.get("minRent") || "";
  const activeMaxPrice = searchParams.get("maxRent") || "";
  const activeSearch = searchParams.get("search") || "";
  const activeNeighborhood = searchParams.get("neighborhood") || "";

  const [searchText, setSearchText] = useState(activeSearch);
  const [minPrice, setMinPrice] = useState(activeMinPrice);
  const [maxPrice, setMaxPrice] = useState(activeMaxPrice);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedProperty = useMemo(
    () => properties.find((p) => p._id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId]
  );

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
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", "50");
    if (!params.get("page")) params.set("page", "1");
    setLoading(true);
    setSelectedPropertyId(null);
    fetch(`/api/properties/public?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setProperties(data.data.properties || []);
          setPagination(data.data.pagination || { page: 1, total: 0, pages: 0 });
        }
      })
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const buildParams = useCallback((patch: Record<string, string | undefined> = {}) => {
    const resolved = {
      search: "search" in patch ? patch.search : activeSearch,
      type: "type" in patch ? patch.type : activeType,
      bedrooms: "bedrooms" in patch ? patch.bedrooms : activeBedrooms,
      minRent: "minRent" in patch ? patch.minRent : minPrice,
      maxRent: "maxRent" in patch ? patch.maxRent : maxPrice,
      neighborhood: "neighborhood" in patch ? patch.neighborhood : activeNeighborhood,
    };
    const params = new URLSearchParams();
    if (resolved.search) params.set("search", resolved.search);
    if (resolved.type) params.set("type", resolved.type);
    if (resolved.bedrooms) params.set("bedrooms", resolved.bedrooms);
    if (resolved.minRent) params.set("minRent", resolved.minRent);
    if (resolved.maxRent) params.set("maxRent", resolved.maxRent);
    if (resolved.neighborhood) params.set("neighborhood", resolved.neighborhood);
    return params;
  }, [activeSearch, activeType, activeBedrooms, minPrice, maxPrice, activeNeighborhood]);

  const pushFilters = useCallback((patch: Record<string, string | undefined> = {}) => {
    router.push(`/rentals?${buildParams(patch).toString()}`);
  }, [buildParams, router]);

  const clearFilters = useCallback(() => {
    setSearchText("");
    setMinPrice("");
    setMaxPrice("");
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

  const hasActiveFilters = !!(activeType || activeBedrooms || activeMinPrice || activeMaxPrice || activeSearch || activeNeighborhood);

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col overflow-x-hidden w-full">
      <LandingHeader />

      <div className="pt-[48px] flex flex-col flex-1">
        {/* ── Sticky filter bar ── */}
        <div className="bg-white border-b border-slate-100/80 sticky top-[48px] z-30">

          {/* Row 1 — Search + inline filters + List/Map */}
          <div className="px-3 sm:px-5 pt-3 pb-2 flex items-center gap-2">

            {/* Search input */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
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
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
              />
            </div>

            {/* Type pills — desktop only inline */}
            <div className="hidden lg:flex items-center gap-px bg-slate-100 rounded-xl overflow-hidden shrink-0">
              {PROPERTY_TYPES.map((opt) => (
                <button
                  key={opt.value || "all-types"}
                  onClick={() => pushFilters({ type: opt.value || undefined })}
                  className={`px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                    activeType === opt.value
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Beds pills — desktop only inline */}
            <div className="hidden lg:flex items-center gap-px bg-slate-100 rounded-xl overflow-hidden shrink-0">
              {BEDROOMS_OPTIONS.map((opt) => (
                <button
                  key={opt.value || "any-beds"}
                  onClick={() => pushFilters({ bedrooms: opt.value || undefined })}
                  className={`px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                    activeBedrooms === opt.value
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Price range — desktop only */}
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onBlur={() => pushFilters({ minRent: minPrice || undefined })}
                onKeyDown={(e) => e.key === "Enter" && pushFilters({ minRent: minPrice || undefined })}
                placeholder="$ Min"
                className="w-20 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              />
              <span className="text-slate-300 text-sm select-none">—</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onBlur={() => pushFilters({ maxRent: maxPrice || undefined })}
                onKeyDown={(e) => e.key === "Enter" && pushFilters({ maxRent: maxPrice || undefined })}
                placeholder="$ Max"
                className="w-20 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              />
            </div>

            {/* Reset — visible whenever any filter is active */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
                title="Clear all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">{t("rentals.filters.reset")}</span>
              </button>
            )}

            {/* List / Map toggle */}
            <div className="flex items-center gap-px bg-slate-100 rounded-xl overflow-hidden shrink-0">
              <button
                onClick={() => setMobileView("list")}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-all ${
                  mobileView === "list" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>{t("rentals.view.list")}</span>
              </button>
              <button
                onClick={() => setMobileView("map")}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-all ${
                  mobileView === "map" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>{t("rentals.view.map")}</span>
              </button>
            </div>
          </div>

          {/* Row 2 — mobile/tablet only: type + beds + price pills */}
          <div className="lg:hidden px-3 sm:px-5 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {/* Type */}
            <div className="flex items-center gap-px bg-slate-100 rounded-xl overflow-hidden shrink-0">
              {PROPERTY_TYPES.map((opt) => (
                <button
                  key={opt.value || "all-t"}
                  onClick={() => pushFilters({ type: opt.value || undefined })}
                  className={`px-2.5 py-1.5 text-[11px] font-medium transition-all whitespace-nowrap ${
                    activeType === opt.value
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-slate-200 shrink-0" />

            {/* Beds */}
            <div className="flex items-center gap-px bg-slate-100 rounded-xl overflow-hidden shrink-0">
              {BEDROOMS_OPTIONS.map((opt) => (
                <button
                  key={opt.value || "any-b"}
                  onClick={() => pushFilters({ bedrooms: opt.value || undefined })}
                  className={`px-2.5 py-1.5 text-[11px] font-medium transition-all whitespace-nowrap ${
                    activeBedrooms === opt.value
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-slate-200 shrink-0" />

            {/* Price */}
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onBlur={() => pushFilters({ minRent: minPrice || undefined })}
                onKeyDown={(e) => e.key === "Enter" && pushFilters({ minRent: minPrice || undefined })}
                placeholder="$Min"
                className="w-16 px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              <span className="text-slate-300 text-xs">—</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onBlur={() => pushFilters({ maxRent: maxPrice || undefined })}
                onKeyDown={(e) => e.key === "Enter" && pushFilters({ maxRent: maxPrice || undefined })}
                placeholder="$Max"
                className="w-16 px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>

          {/* Row 3 — Neighborhood chips + count */}
          <div className="px-3 sm:px-5 pb-2.5 flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
              {NEIGHBORHOODS.map((n) => {
                const isActive = n.value === "" ? !activeNeighborhood : activeNeighborhood === n.value;
                return (
                  <button
                    key={n.value || "all-n"}
                    onClick={() => handleNeighborhood(n.value)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium tracking-wide transition-all whitespace-nowrap flex-shrink-0 border ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-800"
                    }`}
                  >
                    {n.label}
                  </button>
                );
              })}
              <button
                onClick={() => setShowFavoritesOnly((v) => !v)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium tracking-wide transition-all whitespace-nowrap flex-shrink-0 border flex items-center gap-1 ${
                  showFavoritesOnly
                    ? "bg-rose-500 text-white border-rose-500"
                    : "bg-white text-slate-500 border-slate-200 hover:border-rose-300 hover:text-rose-500"
                }`}
              >
                <Heart className={`w-3 h-3 ${showFavoritesOnly ? "fill-current" : ""}`} />
                {t("rentals.filters.saved")}
                {favoriteIds.length > 0 && (
                  <span className={`ml-0.5 px-1 rounded-full text-[9px] font-bold leading-4 ${showFavoritesOnly ? "bg-white/30 text-white" : "bg-rose-100 text-rose-500"}`}>
                    {favoriteIds.length}
                  </span>
                )}
              </button>
            </div>

            {/* Result count — fixed right */}
            <div className="shrink-0 pl-2">
              {loading ? (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 border-t-transparent animate-spin inline-block" />
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  <strong className="text-slate-700 font-medium">{pagination.total}</strong> {pagination.total === 1 ? t("rentals.results.property") : t("rentals.results.properties")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden relative z-0 min-h-0">

          {/* MOBILE MAP VIEW — scrollable page with map + area guide below */}
          {mobileView === "map" && (
            <div className="flex lg:hidden flex-col w-full overflow-y-auto bg-[#f8f7f4]">
              <div className="relative w-full flex-shrink-0" style={{ height: "62vmax", minHeight: 320, maxHeight: "70vh", isolation: "isolate" }}>
                <PropertyMap
                  properties={properties}
                  onMarkerClick={handleMarkerClick}
                  onMarkerHover={setHoveredPropertyId}
                  hoveredPropertyId={hoveredPropertyId ?? selectedPropertyId}
                />
              </div>
              <div className="px-4 py-6 border-t border-slate-200">
                <NaplesAreaGuide />
              </div>
            </div>
          )}

          {/* Map + Area Guide — desktop/large tablet left column (lg+) */}
          <div className="hidden lg:flex flex-col w-full lg:w-[55%] overflow-y-auto bg-[#f8f7f4]">
            <div className="relative w-full flex-shrink-0" style={{ height: "calc(100vh - 200px)", minHeight: 400, isolation: "isolate" }}>
              <PropertyMap
                properties={properties}
                onMarkerClick={handleMarkerClick}
                onMarkerHover={setHoveredPropertyId}
                hoveredPropertyId={hoveredPropertyId ?? selectedPropertyId}
                neighborhoods={NEIGHBORHOODS}
                activeNeighborhood={activeNeighborhood}
                onNeighborhoodChange={handleNeighborhood}
              />
            </div>
            <div className="px-5 lg:px-8 py-8 border-t border-slate-200">
              <NaplesAreaGuide />
            </div>
          </div>

          {/* Listings — phone/tablet list view + lg+ right column */}
          <div className={`${mobileView === "list" ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-[45%] overflow-y-auto overflow-x-hidden bg-[#f8f7f4] border-l border-slate-200/60`} style={{ isolation: "isolate" }}>
            <div className="p-3 space-y-2.5 w-full overflow-x-hidden">

              {/* Featured selected property card */}
              {selectedProperty && (
                <PropertyFeaturedCard
                  property={selectedProperty}
                  onClose={() => setSelectedPropertyId(null)}
                />
              )}

              {/* Divider when a property is selected */}
              {selectedProperty && !loading && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                    {t("rentals.results.all").replace("{count}", String(pagination.total))}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}

              {loading ? (
                <>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-[140px] rounded-xl bg-white border border-slate-200 animate-pulse" />
                  ))}
                </>
              ) : properties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Home className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-700 font-medium mb-1">{t("rentals.noResults.title")}</p>
                  <p className="text-slate-400 text-sm mb-4">{t("rentals.noResults.subtitle")}</p>
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors"
                  >
                    {t("rentals.noResults.clearFilters")}
                  </button>
                </div>
              ) : (
                (() => {
                  const displayed = showFavoritesOnly ? properties.filter((p) => favoriteIds.includes(p._id)) : properties;
                  if (displayed.length === 0 && showFavoritesOnly) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <Heart className="w-10 h-10 text-slate-200 mb-3" />
                        <p className="text-slate-600 font-medium mb-1">{t("rentals.noSaved.title")}</p>
                        <p className="text-slate-400 text-sm mb-4">{t("rentals.noSaved.subtitle")}</p>
                        <button onClick={() => setShowFavoritesOnly(false)} className="px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors">
                          {t("rentals.noSaved.browseAll")}
                        </button>
                      </div>
                    );
                  }
                  return displayed.map((property) => (
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
                  ));
                })()
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-1 py-4">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                        page === pagination.page
                          ? "bg-sky-500 text-white shadow-sm shadow-sky-500/20"
                          : "bg-white border border-slate-200 text-slate-600 hover:border-sky-300 hover:text-sky-600"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              )}

              <div className="h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating comparison bar */}
      {compareIds.length >= 1 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 bg-slate-900 text-white rounded-2xl shadow-2xl px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-700 backdrop-blur-md max-w-[calc(100vw-2rem)]">
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
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
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
            className="ml-1 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
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
