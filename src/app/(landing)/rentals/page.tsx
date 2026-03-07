"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PropertyMap } from "@/components/landing/PropertyMap";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  X,
  Bed,
  Bath,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Map,
  LayoutList,
  Home,
  DollarSign,
  ArrowRight,
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

function PropertyListCard({
  property,
  onHover,
  isHovered,
}: {
  property: any;
  onHover: (id: string | null) => void;
  isHovered: boolean;
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
    <Link href={`/properties/${property._id}`}>
      <div
        className={`group flex bg-white rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
          isHovered
            ? "shadow-md ring-2 ring-sky-400 ring-offset-1"
            : "shadow-sm hover:shadow-md border border-slate-200/80"
        }`}
        onMouseEnter={() => onHover(property._id)}
        onMouseLeave={() => onHover(null)}
      >
        <div className="relative w-[200px] min-w-[200px] h-[160px] overflow-hidden bg-slate-100">
          <img
            src={imageUrl}
            alt={property.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500 text-white tracking-wide uppercase">
              For Rent
            </span>
          </div>
          {imageCount > 1 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-medium backdrop-blur-sm">
              <span>{imageCount} photos</span>
            </div>
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 flex-1 min-w-0">
                {property.name}
              </h3>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-sky-600 leading-none">
                  {formatPrice(price)}
                </p>
                <p className="text-[10px] font-normal text-slate-400 mt-0.5">/ month</p>
              </div>
            </div>

            {(property.address?.street || property.address?.city) && (
              <p className="flex items-center gap-1 text-slate-500 text-xs mt-1 truncate">
                <MapPin className="w-3 h-3 shrink-0 text-sky-400" />
                <span className="truncate">
                  {property.address.street && `${property.address.street}, `}
                  {property.address.city}
                  {property.address.state && `, ${property.address.state}`}
                </span>
              </p>
            )}

            {property.neighborhood && (
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
                {property.neighborhood}
              </span>
            )}

            {property.description && (
              <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                {property.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-slate-600 text-xs font-medium">
                <Bed className="w-3.5 h-3.5 text-slate-400" />
                {bedrooms} {bedrooms === 1 ? "Bed" : "Beds"}
              </span>
              <span className="flex items-center gap-1 text-slate-600 text-xs font-medium">
                <Bath className="w-3.5 h-3.5 text-slate-400" />
                {bathrooms} {bathrooms === 1 ? "Bath" : "Baths"}
              </span>
              {sqft > 0 && (
                <span className="text-slate-500 text-xs">{sqft.toLocaleString()} sqft</span>
              )}
            </div>
            <span className="flex items-center gap-0.5 text-sky-500 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
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
  const [properties, setProperties] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState("");
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");

  const activeNeighborhood = searchParams.get("search") || "";

  useEffect(() => {
    setSearchText(searchParams.get("search") || "");
    setFilterType(searchParams.get("type") || "");
    setFilterBedrooms(searchParams.get("bedrooms") || "");
    setFilterMinPrice(searchParams.get("minRent") || "");
    setFilterMaxPrice(searchParams.get("maxRent") || "");
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", "50");
    if (!params.get("page")) params.set("page", "1");
    setLoading(true);
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

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (searchText) params.set("search", searchText);
    if (filterType) params.set("type", filterType);
    if (filterBedrooms) params.set("bedrooms", filterBedrooms);
    if (filterMinPrice) params.set("minRent", filterMinPrice);
    if (filterMaxPrice) params.set("maxRent", filterMaxPrice);
    params.set("page", "1");
    router.push(`/rentals?${params.toString()}`);
    setShowFilters(false);
  }, [searchText, filterType, filterBedrooms, filterMinPrice, filterMaxPrice, router]);

  const clearFilters = useCallback(() => {
    setSearchText("");
    setFilterType("");
    setFilterBedrooms("");
    setFilterMinPrice("");
    setFilterMaxPrice("");
    router.push("/rentals");
    setShowFilters(false);
  }, [router]);

  const handleNeighborhood = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      if (value) params.set("search", value);
      else params.delete("search");
      router.push(`/rentals?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleMarkerClick = useCallback((propertyId: string) => {
    const el = document.getElementById(`property-${propertyId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHoveredPropertyId(propertyId);
      setTimeout(() => setHoveredPropertyId(null), 2000);
    }
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.push(`/rentals?${params.toString()}`);
    },
    [searchParams, router]
  );

  const hasActiveFilters = !!(filterType || filterBedrooms || filterMinPrice || filterMaxPrice);
  const activeFilterCount = [filterType, filterBedrooms, filterMinPrice, filterMaxPrice].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <LandingHeader />

      <div className="pt-[72px] flex flex-col flex-1">
        {/* Sticky filter bar — same bg-slate-50 as the page */}
        <div className="bg-slate-50 border-b border-slate-200 sticky top-[72px] z-30">
          <div className="px-4 py-3 space-y-2.5">

            {/* Row 1: Search + filters + search button */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="Search by name, neighborhood..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 transition-shadow"
                />
              </div>

              {/* Type dropdown */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-shadow cursor-pointer"
                >
                  {PROPERTY_TYPES.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* Beds dropdown */}
              <div className="relative">
                <select
                  value={filterBedrooms}
                  onChange={(e) => setFilterBedrooms(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-shadow cursor-pointer"
                >
                  {BEDROOMS_OPTIONS.map((opt) => (
                    <option key={opt.value || "any"} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* More filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  showFilters || hasActiveFilters
                    ? "bg-sky-50 border-sky-300 text-sky-700"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                More
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Search button */}
              <button
                onClick={applyFilters}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 active:bg-sky-700 transition-colors shadow-sm shadow-sky-500/20"
              >
                <Search className="w-3.5 h-3.5" />
                Search
              </button>

              {/* Clear */}
              {(searchText || hasActiveFilters) && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                  title="Clear all filters"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}

              {/* Mobile view toggle */}
              <div className="flex md:hidden ml-auto bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <button
                  onClick={() => setMobileView("list")}
                  className={`p-2 text-xs font-medium flex items-center gap-1.5 px-3 transition-colors ${
                    mobileView === "list"
                      ? "bg-sky-500 text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LayoutList className="w-4 h-4" />
                  List
                </button>
                <button
                  onClick={() => setMobileView("map")}
                  className={`p-2 text-xs font-medium flex items-center gap-1.5 px-3 transition-colors border-l border-slate-200 ${
                    mobileView === "map"
                      ? "bg-sky-500 text-white"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Map className="w-4 h-4" />
                  Map
                </button>
              </div>
            </div>

            {/* Price range row (expandable) */}
            {showFilters && (
              <div className="flex items-center gap-3 pt-2.5 border-t border-slate-200 flex-wrap animate-in slide-in-from-top-1 duration-150">
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Price range:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={filterMinPrice}
                    onChange={(e) => setFilterMinPrice(e.target.value)}
                    placeholder="Min"
                    className="w-24 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 placeholder:text-slate-400"
                  />
                  <span className="text-slate-400 text-sm">—</span>
                  <input
                    type="number"
                    value={filterMaxPrice}
                    onChange={(e) => setFilterMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="w-24 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200 placeholder:text-slate-400"
                  />
                  <span className="text-xs text-slate-400">/month</span>
                </div>
              </div>
            )}

            {/* Neighborhood chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
              {NEIGHBORHOODS.map((n) => {
                const isActive = n.value === "" ? !activeNeighborhood : activeNeighborhood === n.value;
                return (
                  <button
                    key={n.value}
                    onClick={() => handleNeighborhood(n.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 border ${
                      isActive
                        ? "bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-500/20"
                        : "bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50"
                    }`}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results count — seamlessly part of the bar */}
          <div className="px-4 py-2 border-t border-slate-200/70 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
                  Searching…
                </span>
              ) : (
                <span>
                  <strong className="text-slate-700 font-semibold">{pagination.total}</strong>{" "}
                  {pagination.total === 1 ? "property" : "properties"} found
                  {activeNeighborhood ? ` in ${activeNeighborhood}` : ""}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Main content: Map + Listings */}
        <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 224px)" }}>
          {/* Map — left (desktop) */}
          <div className={`${mobileView === "map" ? "flex" : "hidden"} md:flex w-full md:w-1/2 lg:w-[55%] relative`}>
            <div className="w-full h-full">
              <PropertyMap
                properties={properties}
                onMarkerClick={handleMarkerClick}
                onMarkerHover={setHoveredPropertyId}
                hoveredPropertyId={hoveredPropertyId}
              />
            </div>
          </div>

          {/* Listings — right */}
          <div className={`${mobileView === "list" ? "flex" : "hidden"} md:flex flex-col w-full md:w-1/2 lg:w-[45%] overflow-y-auto bg-slate-50 border-l border-slate-200`}>
            <div className="p-3 space-y-2.5">
              {loading ? (
                <>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-[160px] rounded-xl bg-white border border-slate-200 animate-pulse" />
                  ))}
                </>
              ) : properties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Home className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-700 font-medium mb-1">No properties found</p>
                  <p className="text-slate-400 text-sm mb-4">Try adjusting your filters or clearing the search</p>
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-lg bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <>
                  {properties.map((property) => (
                    <div key={property._id} id={`property-${property._id}`}>
                      <PropertyListCard
                        property={property}
                        onHover={setHoveredPropertyId}
                        isHovered={hoveredPropertyId === property._id}
                      />
                    </div>
                  ))}
                </>
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
