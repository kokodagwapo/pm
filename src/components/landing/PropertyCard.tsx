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
      <article
        className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:border-white/40 transition-all duration-300 hover:shadow-2xl"
        style={{
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={property.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Price overlay */}
          <div
            className="absolute top-4 left-4 px-3 py-1.5 rounded-lg font-semibold text-white text-sm"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            {formatPrice(monthlyRent)}/mo
          </div>
          {/* Instant Book */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="px-4 py-2 rounded-full bg-white text-[var(--landing-navy)] font-semibold text-sm">
              Instant Book
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-[var(--font-playfair)] text-xl text-white font-semibold mb-2 line-clamp-2">
            {property.name}
          </h3>
          {property.address && (
            <p className="flex items-center gap-1.5 text-white/70 text-sm mb-3">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {property.address.city}
              {property.address.state && `, ${property.address.state}`}
            </p>
          )}
          <div className="flex items-center gap-4 text-white/80 text-sm">
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
