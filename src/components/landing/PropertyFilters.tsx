"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PROPERTY_TYPES = [
  { value: "", label: "All Types" },
  { value: "condo", label: "Condo" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Villa" },
];

const BEDROOMS = [
  { value: "", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];

interface PropertyFiltersProps {
  onApplied?: () => void;
}

export function PropertyFilters({ onApplied }: PropertyFiltersProps) {
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
    onApplied?.();
  };

  const clearFilters = () => {
    setType("");
    setBedrooms("");
    setMinRent("");
    setMaxRent("");
    setSearch("");
    router.push("/rentals");
    onApplied?.();
  };

  return (
    <div className="rounded-xl p-5 space-y-5 bg-white border border-[#e2e8f0] shadow-sm">
      <h3 className="text-base font-semibold text-[#2d3748]">Search Options</h3>

      <div>
        <label className="block text-[#718096] text-sm mb-1.5">Search</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Property name, city, area..."
          className="w-full px-3 py-2 rounded-lg bg-[#f7fafc] border border-[#e2e8f0] text-[#2d3748] placeholder:text-[#a0aec0] text-sm focus:outline-none focus:ring-2 focus:ring-[#6cbeb8]/30 focus:border-[#6cbeb8]"
        />
      </div>

      <div>
        <label className="block text-[#718096] text-sm mb-1.5">All Types</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[#f7fafc] border border-[#e2e8f0] text-[#2d3748] text-sm focus:outline-none focus:ring-2 focus:ring-[#6cbeb8]/30 focus:border-[#6cbeb8]"
        >
          {PROPERTY_TYPES.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[#718096] text-sm mb-1.5">Bedrooms</label>
        <select
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[#f7fafc] border border-[#e2e8f0] text-[#2d3748] text-sm focus:outline-none focus:ring-2 focus:ring-[#6cbeb8]/30 focus:border-[#6cbeb8]"
        >
          {BEDROOMS.map((opt) => (
            <option key={opt.value || "any"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[#718096] text-sm mb-1.5">Price Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={minRent}
            onChange={(e) => setMinRent(e.target.value)}
            placeholder="Min"
            className="w-full px-3 py-2 rounded-lg bg-[#f7fafc] border border-[#e2e8f0] text-[#2d3748] placeholder:text-[#a0aec0] text-sm focus:outline-none focus:ring-2 focus:ring-[#6cbeb8]/30"
          />
          <input
            type="number"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
            placeholder="Max"
            className="w-full px-3 py-2 rounded-lg bg-[#f7fafc] border border-[#e2e8f0] text-[#2d3748] placeholder:text-[#a0aec0] text-sm focus:outline-none focus:ring-2 focus:ring-[#6cbeb8]/30"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={applyFilters}
          className="flex-1 py-2.5 rounded-lg bg-[#6cbeb8] text-white font-semibold text-sm hover:bg-[#5cb3ad] transition-all"
        >
          Apply
        </button>
        <button
          onClick={clearFilters}
          className="px-4 py-2.5 rounded-lg bg-[#f7fafc] text-[#4a5568] text-sm hover:bg-[#edf2f7] border border-[#e2e8f0] transition-all"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
