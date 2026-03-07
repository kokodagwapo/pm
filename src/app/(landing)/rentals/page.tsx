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
  Grid3X3,
  Map,
  LayoutList,
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
  { value: "", label: "Beds" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
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

  return (
    <Link href={`/properties/${property._id}`}>
      <div
        className={`flex gap-0 bg-white border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer ${
          isHovered ? "border-sky-400 shadow-lg ring-1 ring-sky-200" : "border-slate-200"
        }`}
        onMouseEnter={() => onHover(property._id)}
        onMouseLeave={() => onHover(null)}
      >
        <div className="relative w-[240px] min-w-[240px] h-[180px] overflow-hidden">
          <img
            src={imageUrl}
            alt={property.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 rounded text-xs font-semibold bg-sky-600 text-white">
              FOR RENT
            </span>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900 text-[15px] leading-tight line-clamp-2">
                {property.name}
              </h3>
              <span className="text-lg font-bold text-sky-600 whitespace-nowrap">
                {formatPrice(price)}
                <span className="text-xs font-normal text-slate-500">/mo</span>
              </span>
            </div>

            {(property.address?.street || property.address?.city) && (
              <p className="flex items-center gap-1 text-slate-500 text-sm mt-1.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {property.address.street && `${property.address.street}, `}
                  {property.address.city}
                  {property.address.state && `, ${property.address.state}`}
                </span>
              </p>
            )}

            {property.description && (
              <p className="text-slate-500 text-xs mt-2 line-clamp-2 leading-relaxed">
                {property.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1 text-slate-600 text-sm">
              <Bed className="w-4 h-4" />
              {bedrooms} {bedrooms === 1 ? "Bed" : "Beds"}
            </span>
            <span className="flex items-center gap-1 text-slate-600 text-sm">
              <Bath className="w-4 h-4" />
              {bathrooms} {bathrooms === 1 ? "Bath" : "Baths"}
            </span>
            {sqft > 0 && (
              <span className="text-slate-600 text-sm">{sqft.toLocaleString()} sqft</span>
            )}
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
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 0,
  });
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
          setPagination(
            data.data.pagination || { page: 1, total: 0, pages: 0 }
          );
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
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      router.push(`/rentals?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleMarkerClick = useCallback(
    (propertyId: string) => {
      const el = document.getElementById(`property-${propertyId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHoveredPropertyId(propertyId);
        setTimeout(() => setHoveredPropertyId(null), 2000);
      }
    },
    []
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.push(`/rentals?${params.toString()}`);
    },
    [searchParams, router]
  );

  const hasActiveFilters = filterType || filterBedrooms || filterMinPrice || filterMaxPrice;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <LandingHeader />

      <div className="pt-[72px] flex flex-col flex-1">
        {/* Top filter bar */}
        <div className="bg-white border-b border-slate-200 sticky top-[72px] z-30">
          <div className="px-4 py-3">
            {/* Search + quick filters row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="Search by name, neighborhood..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
                />
              </div>

              {/* Quick filter selects */}
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); }}
                className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                {PROPERTY_TYPES.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={filterBedrooms}
                onChange={(e) => { setFilterBedrooms(e.target.value); }}
                className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                {BEDROOMS_OPTIONS.map((opt) => (
                  <option key={opt.value || "any"} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all ${
                  showFilters || hasActiveFilters
                    ? "bg-sky-50 border-sky-300 text-sky-700"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                More
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                )}
              </button>

              <button
                onClick={applyFilters}
                className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors"
              >
                Search
              </button>

              {(searchText || hasActiveFilters) && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}

              {/* Mobile view toggle */}
              <div className="flex md:hidden ml-auto border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setMobileView("list")}
                  className={`p-2 ${mobileView === "list" ? "bg-sky-600 text-white" : "bg-white text-slate-600"}`}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMobileView("map")}
                  className={`p-2 ${mobileView === "map" ? "bg-sky-600 text-white" : "bg-white text-slate-600"}`}
                >
                  <Map className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expandable price range */}
            {showFilters && (
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 flex-wrap animate-in slide-in-from-top-2 duration-200">
                <span className="text-sm text-slate-500">Price Range:</span>
                <input
                  type="number"
                  value={filterMinPrice}
                  onChange={(e) => setFilterMinPrice(e.target.value)}
                  placeholder="Min $"
                  className="w-28 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
                <span className="text-slate-400">—</span>
                <input
                  type="number"
                  value={filterMaxPrice}
                  onChange={(e) => setFilterMaxPrice(e.target.value)}
                  placeholder="Max $"
                  className="w-28 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </div>
            )}

            {/* Neighborhood chips */}
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {NEIGHBORHOODS.map((n) => {
                const isActive =
                  n.value === ""
                    ? !activeNeighborhood
                    : activeNeighborhood === n.value;
                return (
                  <button
                    key={n.value}
                    onClick={() => handleNeighborhood(n.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results count */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
            {loading
              ? "Searching..."
              : `${pagination.total} ${pagination.total === 1 ? "property" : "properties"} found`}
          </div>
        </div>

        {/* Main content: Map + Listings */}
        <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
          {/* Map - left side (desktop), togglable (mobile) */}
          <div
            className={`${
              mobileView === "map" ? "flex" : "hidden"
            } md:flex w-full md:w-1/2 lg:w-[55%] relative`}
          >
            <div className="w-full h-full">
              <PropertyMap
                properties={properties}
                onMarkerClick={handleMarkerClick}
                onMarkerHover={setHoveredPropertyId}
                hoveredPropertyId={hoveredPropertyId}
              />
            </div>
          </div>

          {/* Listings - right side */}
          <div
            className={`${
              mobileView === "list" ? "flex" : "hidden"
            } md:flex flex-col w-full md:w-1/2 lg:w-[45%] overflow-y-auto bg-slate-50 border-l border-slate-200`}
          >
            <div className="p-4 space-y-3">
              {loading ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-[180px] rounded-lg bg-white border border-slate-200 animate-pulse"
                    />
                  ))}
                </>
              ) : properties.length === 0 ? (
                <div className="rounded-lg p-12 text-center bg-white border border-slate-200">
                  <p className="text-slate-600">
                    No properties found. Try adjusting your filters.
                  </p>
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
                    className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from(
                    { length: pagination.pages },
                    (_, i) => i + 1
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                        page === pagination.page
                          ? "bg-sky-600 text-white"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
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
          <div className="animate-pulse text-slate-600">Loading...</div>
        </div>
      }
    >
      <RentalsContent />
    </Suspense>
  );
}
