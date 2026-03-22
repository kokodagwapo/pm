"use client";

import Link from "next/link";
import { Bed, Bath, MapPin } from "lucide-react";

interface PropertyCardProps {
  property: {
    _id: string;
    name: string;
    description?: string;
    type: string;
    address?: { city?: string; state?: string };
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

export function PropertyCard({ property }: PropertyCardProps) {
  const unit = property.units?.[0];
  const bedrooms = unit?.bedrooms ?? 0;
  const bathrooms = unit?.bathrooms ?? 0;
  const rentAmount = unit?.rentAmount ?? 0;
  const monthlyRent = rentAmount > 500 ? rentAmount : rentAmount * 30;
  const imageUrl =
    property.images?.[0] ||
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80";

  return (
    <Link href={`/properties/${property._id}`}>
      <article className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Price overlay */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg font-semibold text-white text-sm bg-black/60 backdrop-blur-sm">
            {formatPrice(monthlyRent)}/mo
          </div>
          {/* Instant Book */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="px-4 py-2 rounded-2xl bg-white text-slate-900 font-semibold text-sm shadow-md">
              Instant Book
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5" style={{ fontFamily: "var(--font-montserrat), var(--font-jakarta), system-ui, sans-serif" }}>
          <h3 className="text-xl text-slate-900 mb-2 line-clamp-2" style={{ fontWeight: 300 }}>
            {property.name}
          </h3>
          {property.address && (
            <p className="flex items-center gap-1.5 text-slate-900 text-sm mb-3" style={{ fontWeight: 300 }}>
              <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              {property.address.city}
              {property.address.state && `, ${property.address.state}`}
            </p>
          )}
          <div className="flex items-center gap-4 text-slate-500 text-sm" style={{ fontWeight: 300 }}>
            <span className="flex items-center gap-1">
              <Bed className="w-4 h-4" />
              {bedrooms} BR
            </span>
            <span className="flex items-center gap-1">
              <Bath className="w-4 h-4" />
              {bathrooms} BA
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
