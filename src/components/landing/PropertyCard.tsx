"use client";

import Link from "next/link";
import { Bed, Bath, MapPin, CheckCircle } from "lucide-react";

interface PropertyCardProps {
  property: {
    _id: string;
    name: string;
    description?: string;
    type: string;
    address?: { city?: string; state?: string; street?: string };
    images?: string[];
    units?: Array<{
      bedrooms?: number;
      bathrooms?: number;
      rentAmount?: number;
      squareFootage?: number;
    }>;
  };
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getTypeLabel(type: string): string {
  const t = String(type || "").toLowerCase();
  if (t === "townhouse") return "Villa";
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

export function PropertyCard({ property }: PropertyCardProps) {
  const unit = property.units?.[0];
  const bedrooms = unit?.bedrooms ?? 0;
  const bathrooms = unit?.bathrooms ?? 0;
  const rentAmount = unit?.rentAmount ?? 0;
  const nightlyRent = rentAmount > 500 ? Math.round(rentAmount / 30) : rentAmount;
  const displayRent = nightlyRent > 0 ? nightlyRent : 130;
  const imageUrl =
    property.images?.[0] ||
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80";

  const area = property.address?.street || property.address?.city || "";
  const city = property.address?.city || "Naples";

  return (
    <Link href={`/properties/${property._id}`}>
      <article className="group relative overflow-hidden rounded-xl bg-white border border-[#e2e8f0] shadow-sm hover:shadow-lg hover:border-[#6cbeb8]/40 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Price overlay - VMS style */}
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg font-semibold text-[#2d3748] text-sm bg-white/95 shadow-sm">
            {formatPrice(displayRent)}/night
          </div>
          {/* Verified badge - VMS style */}
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md bg-[#6cbeb8]/90 text-white text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            verified
          </div>
        </div>

        {/* Content - VMS style */}
        <div className="p-4">
          <h3 className="text-base font-semibold text-[#2d3748] mb-1.5 line-clamp-2 group-hover:text-[#0d9488] transition-colors">
            {property.name}
          </h3>
          {(area || city) && (
            <p className="flex items-center gap-1.5 text-[#718096] text-sm mb-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {[area, city].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="text-[#718096] text-xs mb-3">
            {getTypeLabel(property.type)} / Vacation Home
          </p>
          <div className="flex items-center gap-1 text-[#4a5568] text-sm">
            <span className="flex items-center gap-1">
              <Bed className="w-4 h-4 text-[#6cbeb8]" />
              {bedrooms} Bedrooms
            </span>
            <span className="mx-1">|</span>
            <span className="flex items-center gap-1">
              <Bath className="w-4 h-4 text-[#6cbeb8]" />
              {bathrooms} Bathrooms
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
