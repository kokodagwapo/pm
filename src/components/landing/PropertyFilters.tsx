"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PROPERTY_TYPES = [
  { value: "", label: "All Types" },
  { value: "condo", label: "Condo" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
];

const BEDROOMS = [
  { value: "", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];

export function PropertyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [type, setType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setType(searchParams.get("type") || "");
    setBedrooms(searchParams.get("bedrooms") || "");
    setMinRent(searchParams.get("minRent") || "");
    setMaxRent(searchParams.get("maxRent") || "");
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (bedrooms) params.set("bedrooms", bedrooms);
    if (minRent) params.set("minRent", minRent);
    if (maxRent) params.set("maxRent", maxRent);
    if (search) params.set("search", search);
    params.set("page", "1");
    router.push(`/rentals?${params.toString()}`);
  };

  const clearFilters = () => {
    setType("");
    setBedrooms("");
    setMinRent("");
    setMaxRent("");
    setSearch("");
    router.push("/rentals");
  };

  return (
    <div className="rounded-2xl p-6 space-y-6 bg-white border border-slate-200 shadow-sm">
      <h3 className="font-[var(--font-playfair)] text-lg text-slate-900 font-semibold">
        Filters
      </h3>

      <div>
        <label className="block text-slate-600 text-sm mb-2">Search</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Property name, city, area..."
          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300"
        />
      </div>

      <div>
        <label className="block text-slate-600 text-sm mb-2">Property Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          {PROPERTY_TYPES.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-slate-600 text-sm mb-2">Bedrooms</label>
        <select
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          {BEDROOMS.map((opt) => (
            <option key={opt.value || "any"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-slate-600 text-sm mb-2">Price Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={minRent}
            onChange={(e) => setMinRent(e.target.value)}
            placeholder="Min"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <input
            type="number"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
            placeholder="Max"
            className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={applyFilters}
          className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all"
        >
          Apply
        </button>
        <button
          onClick={clearFilters}
          className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 transition-all"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
