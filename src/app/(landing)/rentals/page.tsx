"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PropertyCard } from "@/components/landing/PropertyCard";
import { PropertyFilters } from "@/components/landing/PropertyFilters";
import { Menu, X } from "lucide-react";

function RentalsContent() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <LandingHeader />

      <main className="pt-24 pb-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-[var(--font-playfair)] text-4xl md:text-5xl text-slate-900 mb-2">
            Naples Rentals
          </h1>
          <p className="text-slate-600 mb-8">
            Browse our hand-picked selection of vacation homes and apartments
          </p>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar - desktop */}
            <aside className="hidden md:block w-64 shrink-0">
              <div className="sticky top-28">
                <PropertyFilters />
              </div>
            </aside>

            {/* Mobile filter drawer */}
            <div className="md:hidden w-full">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all w-full justify-center"
              >
                {filtersOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                {filtersOpen ? "Close Filters" : "Show Filters"}
              </button>
              {filtersOpen && (
                <div className="mt-4 p-4 rounded-xl animate-fade-in-up bg-white border border-slate-200 shadow-lg">
                  <PropertyFilters />
                </div>
              )}
            </div>

            {/* Property grid */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[4/3] rounded-2xl bg-slate-200 animate-pulse"
                    />
                  ))}
                </div>
              ) : properties.length === 0 ? (
                <div className="rounded-2xl p-12 text-center bg-white border border-slate-200 shadow-sm">
                  <p className="text-slate-600">No properties found. Try adjusting your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <PropertyCard key={property._id} property={property} />
                  ))}
                </div>
              )}

              {pagination.pages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                    (page) => (
                      <a
                        key={page}
                        href={`/rentals?${new URLSearchParams({
                          ...Object.fromEntries(searchParams.entries()),
                          page: String(page),
                        }).toString()}`}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          page === pagination.page
                            ? "bg-slate-900 text-white"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </a>
                    )
                  )}
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
