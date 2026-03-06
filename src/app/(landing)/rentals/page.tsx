"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PropertyCard } from "@/components/landing/PropertyCard";
import { PropertyFilters } from "@/components/landing/PropertyFilters";
import { Menu, X, ChevronDown } from "lucide-react";

const SORT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "priceDesc", label: "Price High to Low" },
  { value: "priceAsc", label: "Price Low to High" },
  { value: "newest", label: "Newest first" },
  { value: "bedroomsDesc", label: "Bedrooms High to Low" },
  { value: "bedroomsAsc", label: "Bedrooms Low to high" },
];

function RentalsContent() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", "12");
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

  useEffect(() => {
    setSort(searchParams.get("sort") || "");
  }, [searchParams]);

  const applySort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("sort", value);
    else params.delete("sort");
    params.set("page", "1");
    window.location.href = `/rentals?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[#f5f7f6]">
      <LandingHeader />

      <main className="pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* VMS-style header bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-[#2d3748]">
              Advanced Search: {loading ? "..." : pagination.total} results
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* Sort dropdown - VMS style */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#e2e8f0] text-[#4a5568] text-sm font-medium hover:border-[#6cbeb8] hover:bg-[#f0faf9] transition-colors shadow-sm"
                >
                  {SORT_OPTIONS.find((o) => o.value === sort)?.label || "Default"}
                  <ChevronDown className={`w-4 h-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                </button>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                    <div className="absolute right-0 mt-1 z-20 py-1 min-w-[180px] rounded-lg bg-white border border-[#e2e8f0] shadow-lg">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value || "default"}
                          onClick={() => {
                            applySort(opt.value);
                            setSortOpen(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-[#f0faf9] transition-colors ${
                            sort === opt.value ? "text-[#0d9488] font-medium" : "text-[#4a5568]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {/* Mobile filter toggle */}
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="md:hidden flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#e2e8f0] text-[#4a5568] text-sm font-medium hover:border-[#6cbeb8] transition-colors shadow-sm"
              >
                {filtersOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                {filtersOpen ? "Close" : "Search Options"}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Sidebar - desktop */}
            <aside className="hidden md:block w-64 shrink-0">
              <div className="sticky top-28">
                <PropertyFilters />
              </div>
            </aside>

            {/* Mobile filter drawer */}
            {filtersOpen && (
              <div className="md:hidden w-full p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-md">
                <PropertyFilters onApplied={() => setFiltersOpen(false)} />
              </div>
            )}

            {/* Property grid */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-[4/3] rounded-xl bg-[#e2e8f0] animate-pulse" />
                  ))}
                </div>
              ) : properties.length === 0 ? (
                <div className="rounded-xl p-12 text-center bg-white border border-[#e2e8f0] shadow-sm">
                  <p className="text-[#718096]">No properties found. Try adjusting your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {properties.map((property) => (
                    <PropertyCard key={property._id} property={property} />
                  ))}
                </div>
              )}

              {pagination.pages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                    <a
                      key={page}
                      href={`/rentals?${new URLSearchParams({
                        ...Object.fromEntries(searchParams.entries()),
                        page: String(page),
                      }).toString()}`}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        page === pagination.page
                          ? "bg-[#6cbeb8] text-white"
                          : "bg-white border border-[#e2e8f0] text-[#4a5568] hover:border-[#6cbeb8] hover:bg-[#f0faf9]"
                      }`}
                    >
                      {page}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
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
