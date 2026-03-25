"use client";

import Link from "next/link";
import { Bed, Bath, MapPin, BadgeCheck } from "lucide-react";

export interface VacationStayCardProperty {
  _id: string;
  name: string;
  description?: string;
  type?: string;
  address?: { city?: string; state?: string };
  images?: string[];
  units?: Array<{
    bedrooms?: number;
    bathrooms?: number;
    rentAmount?: number;
  }>;
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Heuristic: small amounts = nightly STR-style; larger = monthly → show /night estimate. */
function displayNightlyFromUnits(units: VacationStayCardProperty["units"]): number {
  const amounts = (units || [])
    .map((u) => u?.rentAmount)
    .filter((n): n is number => typeof n === "number" && n > 0);
  if (!amounts.length) return 0;
  const min = Math.min(...amounts);
  return min > 500 ? Math.round(min / 30) : min;
}

function buildLinkQuery(params: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) u.set(k, v);
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

export function VacationStayCard({
  property,
  checkIn,
  checkOut,
  adults,
  children,
  infants,
  linkTarget = "public",
}: {
  property: VacationStayCardProperty;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  infants?: number;
  /** `dashboard` opens the property calendar in the app (manager view). */
  linkTarget?: "public" | "dashboard";
}) {
  const unit = property.units?.[0];
  const bedrooms = unit?.bedrooms ?? 0;
  const bathrooms = unit?.bathrooms ?? 0;
  const nightly = displayNightlyFromUnits(property.units);
  const imageUrl =
    property.images?.[0] ||
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80";

  const qs = buildLinkQuery({
    checkIn: checkIn || undefined,
    checkOut: checkOut || undefined,
    ...(adults && adults > 0 ? { adults: String(adults) } : {}),
    ...(children && children > 0 ? { children: String(children) } : {}),
    ...(infants && infants > 0 ? { infants: String(infants) } : {}),
  });

  const href =
    linkTarget === "dashboard"
      ? `/dashboard/properties/${property._id}/calendar${qs}`
      : `/properties/${property._id}${qs}`;

  return (
    <Link href={href}>
      <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-300/60 hover:shadow-xl">
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={property.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <BadgeCheck className="h-3.5 w-3.5 text-teal-300" />
            Listed
          </div>
          {nightly > 0 && (
            <div className="absolute bottom-3 left-3 rounded-xl bg-black/60 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
              {formatUsd(nightly)}
              <span className="text-white/80 font-normal"> / night</span>
            </div>
          )}
        </div>
        <div
          className="p-4 sm:p-5"
          style={{
            fontFamily:
              "var(--font-montserrat), var(--font-jakarta), system-ui, sans-serif",
          }}
        >
          <h3
            className="mb-1.5 line-clamp-2 text-lg text-slate-900"
            style={{ fontWeight: 500 }}
          >
            {property.name}
          </h3>
          {property.address && (
            <p
              className="mb-3 flex items-center gap-1.5 text-sm text-slate-600"
              style={{ fontWeight: 400 }}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-600" />
              {property.address.city}
              {property.address.state && `, ${property.address.state}`}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              {bedrooms} BR
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {bathrooms} BA
            </span>
            {property.type && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                {property.type.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
